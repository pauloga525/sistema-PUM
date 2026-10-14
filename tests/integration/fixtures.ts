import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import type { PumRowData } from "@/modules/planification/planification.types";

export const hasTestDb = !!process.env.TEST_DATABASE_URL;

/** Vacía todas las tablas de la aplicación (no toca _prisma_migrations). */
export async function resetDb(): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

export async function createUser(id: string, role: Role = "TEACHER") {
  return prisma.user.create({ data: { id, email: `${id}@test.local`, name: id, role } });
}

/** Año activo con dos periodos, una materia y un nivel. */
export async function createCatalog() {
  const year = await prisma.academicYear.create({ data: { label: "2026-2027", yearStart: 2026, active: true } });
  const [p1, p2] = await Promise.all([
    prisma.period.create({ data: { academicYearId: year.id, name: "Trimestre 1", number: 1 } }),
    prisma.period.create({ data: { academicYearId: year.id, name: "Trimestre 2", number: 2 } }),
  ]);
  const subject = await prisma.subject.create({ data: { name: "Matemática", code: "MAT" } });
  const level = await prisma.level.create({ data: { name: "8vo de Básica", code: "8EB", orderIndex: 8, track: "BASICA" } });
  return { year, periods: [p1, p2], subject, level };
}

export async function assign(
  teacherId: string,
  catalog: Awaited<ReturnType<typeof createCatalog>>,
  coordinatorId?: string,
) {
  return prisma.teacherAssignment.create({
    data: {
      teacherId,
      subjectId:      catalog.subject.id,
      levelId:        catalog.level.id,
      academicYearId: catalog.year.id,
      coordinatorId:  coordinatorId ?? null,
    },
  });
}

export function row(text: string): PumRowData {
  return {
    dcdItems:         [{ text, ejes: [] }],
    indicators:       ["Indicador"],
    methodologyItems: [],
    resources:        [{ text: "Recurso", principles: [] }],
    evaluations:      ["Evaluación"],
  };
}

export async function planStatus(planId: string) {
  const p = await prisma.planification.findUniqueOrThrow({ where: { id: planId }, include: { review: true } });
  return { plan: p.status, review: p.review?.status ?? null, rejection: p.adminRejectionComment };
}
