import os from "node:os";
import nodePath from "node:path";

export const appConfig = {
  /** Entorno de ejecución actual. */
  env: (process.env.NODE_ENV ?? "development") as "development" | "production" | "test",

  /** URL base de la aplicación (necesaria para callbacks OAuth y links en emails). */
  baseUrl: process.env.NEXTAUTH_URL ?? "http://localhost:3000",

  /** Nombre de la institución, mostrado en UI y documentos exportados. */
  institutionName: process.env.INSTITUTION_NAME ?? "Institución Educativa",

  /** Dominio de email institucional permitido en OAuth (@colegio.edu.ec). */
  allowedEmailDomain: process.env.ALLOWED_EMAIL_DOMAIN ?? "",

  /** Ruta del servidor donde se almacena la plantilla Word oficial. */
  templatePath: process.env.TEMPLATE_PATH ?? "./assets/template/Formato_PUM.docm",

  /** Directorio de imágenes PNG usadas en los documentos exportados. */
  imagesPath: process.env.IMAGES_PATH ?? "./assets/images/",

  /** Directorio temporal para archivos de exportación masiva (ZIP). */
  exportTempDir: process.env.EXPORT_TEMP_DIR ?? nodePath.join(os.tmpdir(), "pum-exports"),

  /** TTL en horas para archivos temporales de exportación. */
  exportTempTtlHours: Number(process.env.EXPORT_TEMP_TTL_HOURS ?? "24"),

  /** Habilita modo debug adicional (stack traces en respuestas de error). */
  debug: process.env.DEBUG === "true",
} as const;

export type AppConfig = typeof appConfig;
