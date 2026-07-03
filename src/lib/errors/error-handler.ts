import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, ValidationError } from "./app-error";
import { ErrorCode } from "./error-codes";
import { logger } from "@/lib/logger/logger";

/**
 * Convierte un error capturado en una NextResponse JSON estandarizada.
 *
 * Flujo de decisión:
 *   1. AppError  → usa su propio código HTTP y mensaje; loguea como warn/error según severidad
 *   2. ZodError  → convierte a ValidationError para respuesta uniforme
 *   3. Error genérico → loguea como error crítico, devuelve 500 sin detalles internos
 *
 * Por qué centralizar aquí y no en cada route:
 *   - Un solo lugar para modificar el formato de error de la API
 *   - Garantiza que errores inesperados nunca filtren stack traces al cliente
 *   - Facilita agregar métricas o alertas en el futuro
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    logger.warn("Validation error", { code: error.code, fields: error.fieldErrors });
    return NextResponse.json(error.toClientResponse(), { status: 400 });
  }

  if (error instanceof AppError) {
    const level = error.httpStatus >= 500 ? "error" : "warn";
    logger[level](`AppError [${error.code}]: ${error.message}`, {
      code: error.code,
      context: error.context,
    });
    return NextResponse.json(error.toClientResponse(), { status: error.httpStatus });
  }

  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const field = issue.path.join(".");
      fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
    }
    const valError = new ValidationError(fieldErrors);
    logger.warn("Zod validation error", { fieldErrors });
    return NextResponse.json(valError.toClientResponse(), { status: 400 });
  }

  // Error inesperado: logueamos el detalle completo pero solo devolvemos mensaje genérico
  logger.error("Unhandled error in API route", { error: String(error) });
  return NextResponse.json(
    { error: "Error interno del servidor", code: ErrorCode.INTERNAL_ERROR },
    { status: 500 }
  );
}

/**
 * Wrapper para Server Actions: convierte errores en un objeto de resultado
 * en lugar de lanzar (las Server Actions no deben lanzar errores no controlados
 * porque Next.js los serializa de forma genérica).
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>
): Promise<{ data: T; error: null } | { data: null; error: { message: string; code: ErrorCode } }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (err) {
    if (err instanceof AppError) {
      return { data: null, error: { message: err.message, code: err.code } };
    }
    logger.error("Unhandled error in Server Action", { error: String(err) });
    return {
      data: null,
      error: { message: "Error interno del servidor", code: ErrorCode.INTERNAL_ERROR },
    };
  }
}
