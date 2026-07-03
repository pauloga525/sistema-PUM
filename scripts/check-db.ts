/**
 * Script de verificación de base de datos — PUM Web
 *
 * Verifica que la conexión a PostgreSQL funcione correctamente.
 *
 * Ejecución:
 *   npm run db:check
 *
 * Sale con código 0 si OK, código 1 si hay error.
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function checkDb() {
  console.log("🔍 Verificando conexión a base de datos...");
  console.log(`   DATABASE_URL: ${maskUrl(process.env.DATABASE_URL ?? "")}`);

  try {
    await prisma.$queryRaw`SELECT 1 as ok`;
    console.log("✅ Conexión exitosa a PostgreSQL.");
  } catch (error) {
    console.error("❌ Error de conexión:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function maskUrl(url: string): string {
  return url.replace(/:([^@]+)@/, ":****@");
}

checkDb();
