"use server";

import bcrypt from "bcryptjs";
import { signOut } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { requireActiveSession } from "@/lib/auth/session";
import { rateLimitService } from "@/modules/security/rate-limit.service";

export type ChangePasswordState = { error?: string } | null;

const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 128;

// 5 intentos de contraseña actual por usuario / 15 min
const CURRENT_PASSWORD_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const session = await requireActiveSession({ allowForcePasswordChange: true });
  if (!session) return { error: "Sesión no válida. Por favor inicia sesión de nuevo." };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword     = String(formData.get("newPassword")     ?? "").trim();
  const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` };
  }
  if (newPassword.length > MAX_PASSWORD_LENGTH) {
    return { error: `La contraseña no puede superar ${MAX_PASSWORD_LENGTH} caracteres` };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Las contraseñas no coinciden" };
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { id: true, cedula: true, email: true, passwordHash: true, forcePasswordChange: true },
  });

  if (!user?.passwordHash) {
    return { error: "Esta función solo está disponible para cuentas institucionales" };
  }

  // Fuera del cambio obligatorio se exige la contraseña actual: una sesión
  // robada no basta para cambiarla y dejar fuera al dueño de la cuenta.
  if (!user.forcePasswordChange) {
    const rl = await rateLimitService.check(
      `change-password:${user.id}`,
      CURRENT_PASSWORD_LIMIT.limit,
      CURRENT_PASSWORD_LIMIT.windowMs,
    );
    if (!rl.allowed) {
      return { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." };
    }
    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return { error: "La contraseña actual no es correcta" };
    }
  }

  if (user.cedula && newPassword.includes(user.cedula)) {
    return { error: "La nueva contraseña no puede contener tu número de cédula" };
  }
  if (newPassword.toLowerCase() === user.email.toLowerCase()) {
    return { error: "La nueva contraseña no puede ser tu correo" };
  }
  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    return { error: "La nueva contraseña debe ser distinta de la actual" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data:  { passwordHash, forcePasswordChange: false, tempPasswordExpiresAt: null },
  });

  // Forzar re-login: el JWT actual queda inválido porque cambió la huella de
  // la contraseña (lo mismo pasa con las sesiones abiertas en otros equipos).
  try {
    await signOut({ redirectTo: "/login" });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) redirect("/login");
    return { error: "Contraseña actualizada. Por favor inicia sesión con tu nueva contraseña." };
  }

  return null;
}
