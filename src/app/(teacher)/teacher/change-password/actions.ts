"use server";

import bcrypt from "bcryptjs";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";

export type ChangePasswordState = { error?: string } | null;

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const session = await auth();
  if (!session) return { error: "Sesión no válida. Por favor inicia sesión de nuevo." };

  const newPassword     = (formData.get("newPassword")     as string ?? "").trim();
  const confirmPassword = (formData.get("confirmPassword") as string ?? "").trim();

  if (!newPassword || newPassword.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Las contraseñas no coinciden" };
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { id: true, cedula: true },
  });

  if (!user) {
    return { error: "Esta función solo está disponible para cuentas institucionales" };
  }

  if (user.cedula && newPassword === user.cedula) {
    return { error: "La nueva contraseña no puede ser tu número de cédula" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data:  { passwordHash, forcePasswordChange: false },
  });

  // Forzar re-login para que el JWT se regenere sin forcePasswordChange=true
  try {
    await signOut({ redirectTo: "/login" });
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) redirect("/login");
    return { error: "Contraseña actualizada. Por favor inicia sesión con tu nueva contraseña." };
  }

  return null;
}
