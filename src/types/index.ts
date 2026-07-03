/**
 * Tipos globales de PUM Web.
 *
 * Este archivo re-exporta todos los tipos compartidos entre módulos.
 * Los tipos específicos de cada módulo viven en su propio `*.types.ts`,
 * pero los que son genuinamente transversales (usados por 3+ módulos)
 * se centralizan aquí para evitar importaciones circulares.
 */

// --- Resultado genérico para Server Actions ---
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

// --- Paginación ---
export interface PaginationParams {
  page: number;
  perPage: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// --- Usuario de sesión (subset seguro del usuario de BD) ---
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "TEACHER" | "COORDINATOR" | "ADMIN" | "SUPERADMIN";
  image?: string | null;
}

// --- ID tipado (mejora legibilidad en firmas de funciones) ---
export type UserId = string;
export type PlanificationId = string;
export type SubjectId = string;
export type LevelId = string;
export type AcademicYearId = string;
export type PeriodId = string;
