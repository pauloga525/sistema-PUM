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

import { auth } from "@/auth";
import { getMaintenanceMode } from "@/modules/system/system-settings.service";

export async function requireActiveSession(
  options: { allowForcePasswordChange?: boolean } = {},
) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { role, forcePasswordChange } = session.user;

  // Mismo alcance que el proxy: solo Docentes y Coordinadores.
  if (role === "TEACHER" || role === "COORDINATOR") {
    if (forcePasswordChange && !options.allowForcePasswordChange) return null;
    if ((await getMaintenanceMode()).enabled) return null;
  }

  return session;
}
