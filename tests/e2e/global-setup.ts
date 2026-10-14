/**
 * Deja la base de E2E en un estado conocido antes de cada corrida: vacía las
 * tablas (incluye rate_limits, que limita los intentos de login) y crea los
 * usuarios por rol, el catálogo y la asignación docente ↔ coordinador.
 */

import { prisma, resetDb, seedBase } from "./support/db";

export default async function globalSetup(): Promise<void> {
  try {
    await resetDb();
    await seedBase();
  } finally {
    await prisma.$disconnect();
  }
}
