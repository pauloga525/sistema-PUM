/**
 * Tipos del sistema de logging de PUM Web.
 *
 * Se definen separados del logger para poder importarlos sin
 * inicializar la instancia del logger (útil en tests y módulos
 * que solo necesitan tipar su contexto de log).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

/** Contexto adicional que puede adjuntarse a cualquier entrada de log. */
export type LogContext = Record<string, unknown>;

/** Entrada de log estructurada, lista para serializar a JSON. */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  module?: string;
  context?: LogContext;
}

/** Interfaz que debe cumplir cualquier implementación de logger. */
export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  /** Crea un logger hijo con un módulo específico para contextualizar logs. */
  child(module: string): ILogger;
}
