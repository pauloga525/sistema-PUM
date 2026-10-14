import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma/client";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";
import { generateTempPassword, tempPasswordExpiresAt } from "@/modules/security/temp-password";

/**
 * Altas y restablecimientos de contraseña compartidos por Admin y SuperAdmin.
 * Antes cada servicio tenía su propia copia (con costos de bcrypt distintos).
 */

const BCRYPT_COST = 12;

/** Contraseña temporal aleatoria y los campos que la acompañan en `users`. */
export async function issueTempPassword() {
  const tempPassword = generateTempPassword();
  return {
    tempPassword,
    data: {
      passwordHash:          await bcrypt.hash(tempPassword, BCRYPT_COST),
      forcePasswordChange:   true,
      tempPasswordExpiresAt: tempPasswordExpiresAt(),
    },
  };
}

/** Correo normalizado (minúsculas, sin espacios). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Verifica que el correo y la cédula estén libres. Incluye cuentas
 * desactivadas: en ese caso un SuperAdmin debe reactivarlas, no duplicarlas.
 */
export async function assertIdentityAvailable(email: string, cedula: string | null): Promise<void> {
  const existing = await prisma.user.findFirst({
    where:  { OR: [{ email: normalizeEmail(email) }, ...(cedula ? [{ cedula }] : [])] },
    select: { email: true, isActive: true },
  });
  if (!existing) return;
  const field = existing.email === normalizeEmail(email) ? "ese correo" : "esa cédula";
  throw new AppError(
    ErrorCode.VAL_INVALID_INPUT,
    existing.isActive
      ? `Ya existe un usuario con ${field}`
      : `Ya existe una cuenta desactivada con ${field}; un SuperAdmin puede reactivarla`,
  );
}

/** Asigna una contraseña temporal nueva y devuelve el texto para mostrarlo una vez. */
export async function resetToTempPassword(userId: string): Promise<{ tempPassword: string }> {
  const { tempPassword, data } = await issueTempPassword();
  await prisma.user.update({ where: { id: userId }, data });
  return { tempPassword };
}
