import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/logger/logger";
import { rateLimitService } from "@/modules/security/rate-limit.service";

const log = logger.child("Retention");

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Días de retención por tabla (configurables por variable de entorno).
 *
 * plan_audit_events no se purga: es el historial del PUM y alimenta el
 * bloque de firmas de los documentos exportados.
 */
const RETENTION_DAYS = {
  userAudit: Number(process.env.USER_AUDIT_RETENTION_DAYS ?? "730"), // 2 años
  errorLog:  Number(process.env.ERROR_LOG_RETENTION_DAYS  ?? "180"), // 6 meses
};

export interface RetentionResult {
  rateLimits: number;
  userAudit:  number;
  errorLogs:  number;
}

/** Elimina registros vencidos. Se ejecuta a diario desde src/instrumentation.ts. */
export async function runRetention(): Promise<RetentionResult> {
  const now = Date.now();

  const [rateLimits, userAudit, errorLogs] = await Promise.all([
    rateLimitService.clearExpired(),
    prisma.userAuditLog
      .deleteMany({ where: { createdAt: { lt: new Date(now - RETENTION_DAYS.userAudit * DAY_MS) } } })
      .then((r) => r.count),
    prisma.systemErrorLog
      .deleteMany({ where: { createdAt: { lt: new Date(now - RETENTION_DAYS.errorLog * DAY_MS) } } })
      .then((r) => r.count),
  ]);

  const result = { rateLimits, userAudit, errorLogs };
  log.info("Limpieza de retención completada", { ...result });
  return result;
}
