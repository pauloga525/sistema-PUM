/**
 * Tipos del módulo FTP / NAS.
 */

/** Parámetros para subir documentos al NAS. */
export interface FtpPushRequest {
  academicYearId: string;
  periodId?: string;
  subjectId?: string;
  levelId?: string;
}

/** Resultado de un push al NAS: archivos subidos y fallidos. */
export interface FtpPushResult {
  uploaded: FtpFileRecord[];
  failed: FtpFileRecord[];
  totalTime: number;
}

/** Registro de un archivo en el proceso de push FTP. */
export interface FtpFileRecord {
  planificationId: string;
  remotePath: string;
  filename: string;
  error?: string;
}
