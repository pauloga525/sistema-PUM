/**
 * Script de seed — PUM Web
 * Carga datos iniciales: niveles, año lectivo, períodos, materias,
 * usuarios de prueba y asignaciones docentes para desarrollo.
 *
 * Ejecución: npm run db:seed
 * Seguro para re-ejecutar (usa upsert).
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed de PUM Web...\n");

  // ── Usuarios de desarrollo ───────────────────────────────────────────────
  console.log("👤 Cargando usuarios de desarrollo...");
  const devTeacher = await prisma.user.upsert({
    where: { email: "docente@test.com" },
    update: { name: "Docente de Prueba", role: "TEACHER" },
    create: { id: "teacher-dev-1", email: "docente@test.com", name: "Docente de Prueba", role: "TEACHER" },
  });
  await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: { name: "Administrador", role: "ADMIN" },
    create: { id: "admin-dev-1", email: "admin@test.com", name: "Administrador", role: "ADMIN" },
  });
  console.log(`  ✓ ${devTeacher.name} (${devTeacher.email})`);
  console.log("  ✓ Administrador (admin@test.com)");

  // ── Niveles educativos ───────────────────────────────────────────────────
  const levels = [
    { code: "1EB",  name: "1ro de Básica",       orderIndex: 1,  track: "BASICA" },
    { code: "2EB",  name: "2do de Básica",       orderIndex: 2,  track: "BASICA" },
    { code: "3EB",  name: "3ro de Básica",       orderIndex: 3,  track: "BASICA" },
    { code: "4EB",  name: "4to de Básica",       orderIndex: 4,  track: "BASICA" },
    { code: "5EB",  name: "5to de Básica",       orderIndex: 5,  track: "BASICA" },
    { code: "6EB",  name: "6to de Básica",       orderIndex: 6,  track: "BASICA" },
    { code: "7EB",  name: "7mo de Básica",       orderIndex: 7,  track: "BASICA" },
    { code: "8EB",  name: "8vo de Básica",       orderIndex: 8,  track: "BASICA" },
    { code: "9EB",  name: "9no de Básica",       orderIndex: 9,  track: "BASICA" },
    { code: "10EB", name: "10mo de Básica",      orderIndex: 10, track: "BASICA" },
    { code: "1BGU", name: "1ro de Bachillerato", orderIndex: 11, track: "BACHILLERATO" },
    { code: "2BGU", name: "2do de Bachillerato", orderIndex: 12, track: "BACHILLERATO" },
    { code: "3BGU", name: "3ro de Bachillerato", orderIndex: 13, track: "BACHILLERATO" },
  ];

  console.log("\n📚 Cargando niveles educativos...");
  const levelMap: Record<string, string> = {};
  for (const level of levels) {
    const record = await prisma.level.upsert({
      where: { code: level.code },
      update: { name: level.name, orderIndex: level.orderIndex, track: level.track },
      create: level,
    });
    levelMap[level.code] = record.id;
    console.log(`  ✓ ${level.name}`);
  }

  // ── Año lectivo ──────────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const academicYearLabel = `${currentYear}-${currentYear + 1}`;

  console.log(`\n📅 Cargando año lectivo ${academicYearLabel}...`);
  const academicYear = await prisma.academicYear.upsert({
    where: { label: academicYearLabel },
    update: { active: true },
    create: { label: academicYearLabel, yearStart: currentYear, active: true },
  });
  console.log(`  ✓ ${academicYear.label}`);

  // ── Períodos ─────────────────────────────────────────────────────────────
  const periodsData = [
    { name: "Primer Quimestre",  number: 1 },
    { name: "Segundo Quimestre", number: 2 },
  ];

  console.log("\n🗓️  Cargando períodos...");
  const periodMap: Record<number, string> = {};
  for (const p of periodsData) {
    const record = await prisma.period.upsert({
      where: { academicYearId_number: { academicYearId: academicYear.id, number: p.number } },
      update: { name: p.name },
      create: { name: p.name, number: p.number, academicYearId: academicYear.id },
    });
    periodMap[p.number] = record.id;
    console.log(`  ✓ ${p.name}`);
  }

  // ── Materias ─────────────────────────────────────────────────────────────
  const subjectsData = [
    { code: "MAT", name: "Matemáticas" },
    { code: "LEN", name: "Lengua y Literatura" },
    { code: "CN",  name: "Ciencias Naturales" },
    { code: "HCS", name: "Historia y Ciencias Sociales" },
    { code: "ING", name: "Inglés" },
    { code: "EFI", name: "Educación Física" },
  ];

  console.log("\n📖 Cargando materias...");
  const subjectMap: Record<string, string> = {};
  for (const s of subjectsData) {
    const record = await prisma.subject.upsert({
      where: { code: s.code },
      update: { name: s.name },
      create: s,
    });
    subjectMap[s.code] = record.id;
    console.log(`  ✓ ${s.name}`);
  }

  // ── Asignaciones del docente de prueba ───────────────────────────────────
  // El docente de desarrollo tiene 4 asignaciones: MAT en 8EB y 9EB, LEN en 8EB, CN en 1BGU
  const assignments = [
    { subjectCode: "MAT", levelCode: "8EB"  },
    { subjectCode: "MAT", levelCode: "9EB"  },
    { subjectCode: "LEN", levelCode: "8EB"  },
    { subjectCode: "CN",  levelCode: "1BGU" },
  ];

  console.log("\n🔗 Cargando asignaciones del docente de prueba...");
  for (const a of assignments) {
    const existing = await prisma.teacherAssignment.findFirst({
      where: {
        teacherId:      devTeacher.id,
        subjectId:      subjectMap[a.subjectCode],
        levelId:        levelMap[a.levelCode],
        academicYearId: academicYear.id,
      },
    });
    if (existing) {
      await prisma.teacherAssignment.update({ where: { id: existing.id }, data: { active: true } });
    } else {
      await prisma.teacherAssignment.create({
        data: {
          teacherId:      devTeacher.id,
          subjectId:      subjectMap[a.subjectCode],
          levelId:        levelMap[a.levelCode],
          academicYearId: academicYear.id,
          active:         true,
        },
      });
    }
    const levelName = levels.find(l => l.code === a.levelCode)?.name;
    const subjectName = subjectsData.find(s => s.code === a.subjectCode)?.name;
    console.log(`  ✓ ${subjectName} — ${levelName}`);
  }

  console.log("\n✅ Seed completado exitosamente.");
  console.log("   → Puedes ver los datos con: npm run db:studio\n");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
