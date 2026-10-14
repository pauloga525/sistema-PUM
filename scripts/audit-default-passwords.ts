/**
 * Auditoría de contraseñas por defecto — PUM Web
 *
 * Antes del plan de seguridad (fase 3), la contraseña inicial y la de cada
 * reseteo era la cédula. Este script lista las cuentas cuya contraseña sigue
 * siendo su cédula.
 *
 * Uso:
 *   npx tsx scripts/audit-default-passwords.ts           → solo reporta
 *   npx tsx scripts/audit-default-passwords.ts --lock    → además las bloquea
 *
 * --lock reemplaza la contraseña por una aleatoria que nadie conoce y la marca
 * como temporal vencida: el usuario no puede entrar hasta que un admin le
 * restablezca la contraseña (y reciba una temporal nueva).
 */

import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

async function main() {
  const lock = process.argv.includes("--lock");

  const users = await prisma.user.findMany({
    where:  { cedula: { not: null }, passwordHash: { not: null } },
    select: { id: true, email: true, role: true, cedula: true, passwordHash: true, isActive: true },
  });

  const affected: typeof users = [];
  for (const u of users) {
    if (await bcrypt.compare(u.cedula!, u.passwordHash!)) affected.push(u);
  }

  console.log(`Cuentas revisadas: ${users.length}`);
  console.log(`Con la cédula como contraseña: ${affected.length}`);
  for (const u of affected) {
    console.log(`  - ${u.email} (${u.role}${u.isActive ? "" : ", inactiva"})`);
  }

  if (!lock || affected.length === 0) {
    if (affected.length > 0) console.log("\nEjecuta con --lock para bloquearlas.");
    return;
  }

  const now = new Date();
  for (const u of affected) {
    const passwordHash = await bcrypt.hash(randomBytes(32).toString("base64url"), 10);
    await prisma.user.update({
      where: { id: u.id },
      data:  { passwordHash, forcePasswordChange: true, tempPasswordExpiresAt: now },
    });
  }
  console.log(`\nBloqueadas ${affected.length} cuentas. Un admin debe restablecer su contraseña.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
