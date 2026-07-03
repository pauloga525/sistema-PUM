/**
 * Configuración del servicio de exportación de documentos.
 *
 * Agrupa todos los parámetros que controlan cómo se generan los
 * documentos Word y PDF, y cómo se transfieren al NAS del colegio.
 */
export const exportConfig = {
  // --- Word / DOCX ---
  /** Nombre del archivo de plantilla Word oficial. */
  templateFileName: "Formato_PUM.docm",

  /** Codificación de caracteres del documento (UTF-8). */
  docxEncoding: "utf-8" as const,

  // --- FTP / NAS ---
  /** Host del servidor NAS del colegio. */
  ftpHost: process.env.FTP_HOST ?? "",

  /** Puerto FTP (21 estándar, 22 SFTP). */
  ftpPort: Number(process.env.FTP_PORT ?? "21"),

  /** Usuario FTP. */
  ftpUser: process.env.FTP_USER ?? "",

  /** Contraseña FTP. NUNCA exponer al cliente. */
  ftpPassword: process.env.FTP_PASSWORD ?? "",

  /** Ruta base en el NAS donde se almacenan los PUM. */
  ftpBasePath: process.env.FTP_BASE_PATH ?? "/pum",

  /** Usar FTPS (FTP sobre TLS). Requerido en producción. */
  ftpSecure: process.env.FTP_SECURE === "true",

  /** Timeout de conexión FTP en milisegundos. */
  ftpTimeoutMs: Number(process.env.FTP_TIMEOUT_MS ?? "30000"),

  // --- Nomenclatura de archivos en el NAS ---
  /**
   * Patrón de nombre de archivo al subir al NAS.
   * Variables disponibles: {materia}, {nivel}, {docente}, {periodo}, {ext}
   * Resultado ejemplo: "Matematicas_2do-Bachillerato_Perez-Juan_Q1.docx"
   */
  ftpFilePattern: "{materia}_{nivel}_{docente}_{periodo}.{ext}",
} as const;

export type ExportConfig = typeof exportConfig;
