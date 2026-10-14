/**
 * Sesión válida para server actions y rutas API.
 *
 * El proxy aplica el modo mantenimiento y el cambio obligatorio de contraseña
 * solo a la navegación por ruta. Las server actions se pueden invocar desde
 * cualquier URL (el id de la acción viaja en la cabecera Next-Action) y las
 * rutas /api/* no pasan por esas reglas, así que se repiten aquí.
 *
 * Devuelve null cuando la sesión no debe operar; los llamadores ya tratan
 * `!session` como "no autorizado".
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasMinRole, type UserRole, USER_ROLE } from "@/constants/levels";
import { ROUTES } from "@/constants/routes";
import { getMaintenanceMode } from "@/modules/system/system-settings.service";

export async function requireActiveSession(
  options: { allowForcePasswordChange?: boolean } = {},
) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { role, forcePasswordChange } = session.user;

  // Mismo alcance que el proxy: solo Docentes y Coordinadores.
  if (role === USER_ROLE.TEACHER || role === USER_ROLE.COORDINATOR) {
    if (forcePasswordChange && !options.allowForcePasswordChange) return null;
    if ((await getMaintenanceMode()).enabled) return null;
  }

  return session;
}

/** Sesión activa con al menos `minRole`; null en otro caso. */
export async function requireRole(
  minRole: UserRole,
  options: { allowForcePasswordChange?: boolean } = {},
) {
  const session = await requireActiveSession(options);
  if (!session || !hasMinRole(session.user.role, minRole)) return null;
  return session;
}

/** Como requireRole, pero redirige al login si no corresponde (para server actions de paneles). */
export async function requireRoleOrRedirect(minRole: UserRole) {
  const session = await requireRole(minRole);
  if (!session) redirect(ROUTES.LOGIN);
  return session;
}
