/**
 * Servicio FTP / NAS — skeleton para Fase 1.
 *
 * Gestiona la subida de documentos generados al servidor NAS del colegio.
 * Trabaja con buffers en memoria: genera el documento, lo sube por FTP,
 * descarta el buffer. No deja archivos en el servidor de la app.
 *
 * Implementación completa: Fase 4 (módulo admin).
 */

import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";
import { logger } from "@/lib/logger/logger";
import type { FtpPushRequest, FtpPushResult } from "./ftp.types";

const log = logger.child("FtpService");

export class FtpService {
  /**
   * Sube documentos de planificaciones al NAS con la estructura:
   *   {año_lectivo}/{materia}/{nivel}/{materia}_{nivel}_{docente}_{periodo}.docx|pdf
   */
  async push(request: FtpPushRequest): Promise<FtpPushResult> {
    log.info("push called", { request });
    // TODO: implementar en Fase 4
    throw new AppError(ErrorCode.NOT_IMPLEMENTED, "FtpService.push no implementado aún");
  }

  /**
   * Verifica la conectividad con el servidor NAS.
   * Útil para que el admin compruebe la configuración antes de un push masivo.
   */
  async testConnection(): Promise<{ connected: boolean; latencyMs: number }> {
    log.info("testConnection called");
    // TODO: implementar en Fase 4
    throw new AppError(ErrorCode.NOT_IMPLEMENTED, "FtpService.testConnection no implementado aún");
  }
}

export const ftpService = new FtpService();
