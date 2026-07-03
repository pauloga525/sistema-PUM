/**
 * Catálogo centralizado de códigos de error de la aplicación PUM Web.
 *
 * Cada código identifica un tipo de error específico, permitiendo que el
 * cliente diferencie errores de dominio (reglas de negocio) de errores
 * de infraestructura (BD caída, FTP no disponible), sin exponer detalles
 * internos del servidor.
 *
 * Convención de prefijos:
 *   AUTH_*   → errores de autenticación y autorización
 *   PLAN_*   → errores de planificación (PUM)
 *   EXPORT_* → errores de generación de documentos
 *   FTP_*    → errores de transferencia al NAS
 *   ADMIN_*  → errores de operaciones administrativas
 *   DB_*     → errores de base de datos
 *   VAL_*    → errores de validación de datos de entrada
 */
export enum ErrorCode {
  // --- Autenticación y Autorización ---
  AUTH_UNAUTHENTICATED = "AUTH_UNAUTHENTICATED",
  AUTH_UNAUTHORIZED = "AUTH_UNAUTHORIZED",
  AUTH_DOMAIN_NOT_ALLOWED = "AUTH_DOMAIN_NOT_ALLOWED",
  AUTH_SESSION_EXPIRED = "AUTH_SESSION_EXPIRED",

  // --- Planificación ---
  PLAN_NOT_FOUND = "PLAN_NOT_FOUND",
  PLAN_ALREADY_FINALIZED = "PLAN_ALREADY_FINALIZED",
  PLAN_DEADLINE_PASSED = "PLAN_DEADLINE_PASSED",
  PLAN_NOT_OWNED_BY_TEACHER = "PLAN_NOT_OWNED_BY_TEACHER",
  PLAN_DUPLICATE = "PLAN_DUPLICATE",

  // --- Exportación de documentos ---
  EXPORT_TEMPLATE_NOT_FOUND = "EXPORT_TEMPLATE_NOT_FOUND",
  EXPORT_BUILD_FAILED = "EXPORT_BUILD_FAILED",
  EXPORT_PDF_CONVERSION_FAILED = "EXPORT_PDF_CONVERSION_FAILED",
  EXPORT_FORMAT_UNSUPPORTED = "EXPORT_FORMAT_UNSUPPORTED",

  // --- FTP / NAS ---
  FTP_CONNECTION_FAILED = "FTP_CONNECTION_FAILED",
  FTP_UPLOAD_FAILED = "FTP_UPLOAD_FAILED",
  FTP_PATH_CREATION_FAILED = "FTP_PATH_CREATION_FAILED",

  // --- Administración ---
  ADMIN_ASSIGNMENT_CONFLICT = "ADMIN_ASSIGNMENT_CONFLICT",
  ADMIN_CATALOG_ITEM_IN_USE = "ADMIN_CATALOG_ITEM_IN_USE",

  // --- Base de datos ---
  DB_CONNECTION_ERROR = "DB_CONNECTION_ERROR",
  DB_QUERY_FAILED = "DB_QUERY_FAILED",
  DB_RECORD_NOT_FOUND = "DB_RECORD_NOT_FOUND",

  // --- Validación ---
  VAL_INVALID_INPUT = "VAL_INVALID_INPUT",
  VAL_MISSING_FIELD = "VAL_MISSING_FIELD",

  // --- General ---
  INTERNAL_ERROR = "INTERNAL_ERROR",
  NOT_IMPLEMENTED = "NOT_IMPLEMENTED",
}

/** HTTP status code recomendado para cada categoría de error. */
export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  [ErrorCode.AUTH_UNAUTHENTICATED]: 401,
  [ErrorCode.AUTH_UNAUTHORIZED]: 403,
  [ErrorCode.AUTH_DOMAIN_NOT_ALLOWED]: 403,
  [ErrorCode.AUTH_SESSION_EXPIRED]: 401,

  [ErrorCode.PLAN_NOT_FOUND]: 404,
  [ErrorCode.PLAN_ALREADY_FINALIZED]: 409,
  [ErrorCode.PLAN_DEADLINE_PASSED]: 403,
  [ErrorCode.PLAN_NOT_OWNED_BY_TEACHER]: 403,
  [ErrorCode.PLAN_DUPLICATE]: 409,

  [ErrorCode.EXPORT_TEMPLATE_NOT_FOUND]: 500,
  [ErrorCode.EXPORT_BUILD_FAILED]: 500,
  [ErrorCode.EXPORT_PDF_CONVERSION_FAILED]: 500,
  [ErrorCode.EXPORT_FORMAT_UNSUPPORTED]: 400,

  [ErrorCode.FTP_CONNECTION_FAILED]: 503,
  [ErrorCode.FTP_UPLOAD_FAILED]: 502,
  [ErrorCode.FTP_PATH_CREATION_FAILED]: 502,

  [ErrorCode.ADMIN_ASSIGNMENT_CONFLICT]: 409,
  [ErrorCode.ADMIN_CATALOG_ITEM_IN_USE]: 409,

  [ErrorCode.DB_CONNECTION_ERROR]: 503,
  [ErrorCode.DB_QUERY_FAILED]: 500,
  [ErrorCode.DB_RECORD_NOT_FOUND]: 404,

  [ErrorCode.VAL_INVALID_INPUT]: 400,
  [ErrorCode.VAL_MISSING_FIELD]: 400,

  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.NOT_IMPLEMENTED]: 501,
};
