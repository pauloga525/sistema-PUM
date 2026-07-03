import type { SessionUser } from "@/types";
import type { UserRole } from "@/constants/levels";
import { hasMinRole } from "@/constants/levels";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";

/**
 * Guards de autorización del módulo de autenticación.
 *
 * Uso en Server Actions o servicios:
 *   requireAuth(session?.user);                     // 401 si no hay sesión
 *   requireMinRole(session.user, "ADMIN");           // 403 si rol < ADMIN
 *   requireExactRole(session.user, "COORDINATOR");   // 403 si no es exactamente ese rol
 */

/** Verifica que el usuario esté autenticado. */
export function requireAuth(user: SessionUser | null | undefined): asserts user is SessionUser {
  if (!user) {
    throw new AppError(ErrorCode.AUTH_UNAUTHENTICATED, "Debes iniciar sesión para continuar");
  }
}

/** Verifica que el usuario tenga al menos el nivel de rol requerido (respeta jerarquía). */
export function requireMinRole(user: SessionUser | null | undefined, minRole: UserRole): asserts user is SessionUser {
  requireAuth(user);
  if (!hasMinRole(user.role as UserRole, minRole)) {
    throw new AppError(ErrorCode.AUTH_UNAUTHORIZED, `Esta acción requiere el rol ${minRole} o superior`);
  }
}

/** Verifica que el usuario tenga exactamente el rol indicado (sin jerarquía). */
export function requireExactRole(user: SessionUser, role: UserRole): void {
  if (user.role !== role) {
    throw new AppError(ErrorCode.AUTH_UNAUTHORIZED, `Esta acción requiere el rol ${role}`);
  }
}

/** Impide que un usuario modifique sus propios privilegios. */
export function requireNotSelf(actorId: string, targetId: string): void {
  if (actorId === targetId) {
    throw new AppError(ErrorCode.AUTH_UNAUTHORIZED, "No puedes modificar tus propios privilegios");
  }
}

/** Verifica que el email pertenezca al dominio institucional configurado. */
export function checkEmailDomain(email: string, allowedDomain: string): boolean {
  if (!allowedDomain) return true;
  return email.endsWith(`@${allowedDomain}`);
}
