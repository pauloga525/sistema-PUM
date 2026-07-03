/**
 * Constantes de niveles educativos.
 *
 * El catálogo real se gestiona en la base de datos (tabla `levels`), pero
 * estas constantes describen los "tracks" (categorías de nivel) que son
 * fijos por diseño del sistema y no cambian sin una nueva versión.
 *
 * Los niveles concretos (1ro, 2do... 3ro Bachillerato) son administrables
 * por el admin del colegio vía CRUD. Aquí solo definimos la taxonomía.
 */

/** Categorías de nivel educativo. */
export const LEVEL_TRACK = {
  BASICA: "BASICA",               // Educación básica (primaria / básica inferior, media, superior)
  BACHILLERATO: "BACHILLERATO",   // Bachillerato General Unificado
} as const;

export type LevelTrack = keyof typeof LEVEL_TRACK;

/** Etiquetas en español para cada track. */
export const LEVEL_TRACK_LABEL: Record<LevelTrack, string> = {
  BASICA: "Educación Básica",
  BACHILLERATO: "Bachillerato",
};

/** Roles de usuario en la aplicación. */
export const USER_ROLE = {
  TEACHER:    "TEACHER",
  COORDINATOR:"COORDINATOR",
  ADMIN:      "ADMIN",
  SUPERADMIN: "SUPERADMIN",
} as const;

export type UserRole = keyof typeof USER_ROLE;

/** Nivel numérico de cada rol para comparaciones jerárquicas. */
export const ROLE_LEVEL: Record<UserRole, number> = {
  TEACHER:    1,
  COORDINATOR:2,
  ADMIN:      3,
  SUPERADMIN: 4,
};

/** Devuelve true si `userRole` tiene al menos el nivel de `minRole`. */
export function hasMinRole(userRole: UserRole, minRole: UserRole): boolean {
  return (ROLE_LEVEL[userRole] ?? 0) >= ROLE_LEVEL[minRole];
}
