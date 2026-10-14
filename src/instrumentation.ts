/**
 * Instrumentation de Next.js — se ejecuta una vez al arrancar el servidor.
 *
 * Programa la limpieza diaria de retención (rate limits, auditoría de
 * usuarios y log de errores). Solo en el runtime de Node.js.
 */

const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;
const RETENTION_FIRST_RUN_MS = 5 * 60 * 1000; // 5 min tras el arranque

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { runRetention } = await import("@/modules/system/retention.service");
  const { logger } = await import("@/lib/logger/logger");
  const log = logger.child("Instrumentation");

  const run = () => {
    runRetention().catch((e) => log.error("Falló la limpieza de retención", { error: String(e) }));
  };

  // unref(): el temporizador no impide que el proceso termine
  setTimeout(run, RETENTION_FIRST_RUN_MS).unref();
  setInterval(run, RETENTION_INTERVAL_MS).unref();
}
