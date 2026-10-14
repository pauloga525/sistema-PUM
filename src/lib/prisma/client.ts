import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const STATEMENT_TIMEOUT_MS = Number(process.env.DATABASE_STATEMENT_TIMEOUT_MS ?? "30000");

function createPrismaClient(): PrismaClient {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    max: Number(process.env.DATABASE_POOL_MAX ?? "10"),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // Una consulta colgada no retiene la conexión indefinidamente: Postgres la
    // cancela y el cliente deja de esperar poco después
    statement_timeout: STATEMENT_TIMEOUT_MS,
    query_timeout: STATEMENT_TIMEOUT_MS + 5_000,
    // Identifica las conexiones de la app en pg_stat_activity
    application_name: process.env.DATABASE_APP_NAME ?? "pum-web",
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    // El log de cada consulta se activa a pedido (PRISMA_LOG_QUERIES=true)
    log: process.env.PRISMA_LOG_QUERIES === "true"
      ? ["query", "info", "warn", "error"]
      : ["warn", "error"],
  });
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

// Persist singleton on globalThis to survive hot-reloads in all environments
globalThis.__prisma = prisma;
