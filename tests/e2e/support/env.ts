/**
 * Configuración compartida de las pruebas E2E (Playwright).
 *
 * La base de E2E es desechable: global-setup vacía todas sus tablas. Por eso
 * la URL nunca se toma de DATABASE_URL (que apunta a la base de desarrollo).
 */

export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:pum@127.0.0.1:5440/pum_e2e";

// 3100 lo suele ocupar otro proyecto local; se puede cambiar con E2E_PORT
export const E2E_PORT = Number(process.env.E2E_PORT ?? "3150");
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

/** Evita vaciar por error una base que no sea de E2E. */
export function assertE2eDatabase(url: string): void {
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!dbName.endsWith("_e2e")) {
    throw new Error(`La base de E2E debe terminar en "_e2e" (recibido: "${dbName}")`);
  }
}
