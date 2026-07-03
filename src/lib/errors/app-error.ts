import { ErrorCode, ERROR_HTTP_STATUS } from "./error-codes";

/**
 * Clase base para todos los errores de dominio de PUM Web.
 *
 * Extiende Error nativo añadiendo:
 *   - `code`: identificador de tipo de error (ErrorCode enum)
 *   - `httpStatus`: código HTTP recomendado para respuestas de API
 *   - `context`: datos adicionales para debugging (nunca expuestos al cliente)
 *
 * Uso correcto:
 *   throw new AppError(ErrorCode.PLAN_DEADLINE_PASSED, "El plazo de edición venció el 2026-06-01")
 *
 * Por qué extender Error y no lanzar strings:
 *   - El stack trace se preserva correctamente en Node.js
 *   - El logger puede inspeccionar el tipo en tiempo de ejecución (instanceof)
 *   - TypeScript puede tipar catch clauses con este tipo
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly context?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = ERROR_HTTP_STATUS[code];
    this.context = context;

    // Necesario en TypeScript al extender clases built-in para preservar instanceof
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /** Serialización segura para enviar al cliente (sin context interno). */
  toClientResponse(): { error: string; code: ErrorCode } {
    return {
      error: this.message,
      code: this.code,
    };
  }
}

/**
 * Error de validación de datos de entrada (Zod u otras fuentes).
 * Incluye la lista de campos con errores para feedback al usuario.
 */
export class ValidationError extends AppError {
  readonly fieldErrors: Record<string, string[]>;

  constructor(fieldErrors: Record<string, string[]>, message?: string) {
    super(
      ErrorCode.VAL_INVALID_INPUT,
      message ?? "Los datos ingresados no son válidos",
      { fieldErrors }
    );
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  toClientResponse() {
    return {
      ...super.toClientResponse(),
      fieldErrors: this.fieldErrors,
    };
  }
}
