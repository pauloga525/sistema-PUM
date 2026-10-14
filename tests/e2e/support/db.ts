/**
 * Acceso directo a la base de E2E para preparar precondiciones y verificar
 * estados. Las acciones bajo prueba se hacen por la UI; esto solo cubre los
 * caminos largos que no se prueban (p. ej. llenar los datos de la unidad).
 */

import bcrypt from "bcryptjs";
import { PrismaClient, type PlanStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { REVIEW_SECTION_KEYS } from "../../../src/constants/review";
import { E2E_DATABASE_URL, assertE2eDatabase } from "./env";
import { CATALOG, COMPLETE_METADATA, PASSWORD, USERS } from "./data";

assertE2eDatabase(E2E_DATABASE_URL);

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: E2E_DATABASE_URL }),
});

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

/** Usuarios por rol, catálogo y la asignación docente ↔ coordinador. */
export async function seedBase(): Promise<void> {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const [teacher, coordinator] = await Promise.all(
    (["teacher", "coordinator", "admin"] as const).map((key) =>
      prisma.user.create({
        data: {
          email:               USERS[key].email,
          name:                USERS[key].name,
          role:                USERS[key].role,
          passwordHash,
          forcePasswordChange: false,
          isActive:            true,
        },
      }),
    ),
  );

  const year = await prisma.academicYear.create({
    data: { label: CATALOG.yearLabel, yearStart: 2026, active: true },
  });
  await prisma.period.createMany({
    data: CATALOG.periods.map((name, i) => ({ academicYearId: year.id, name, number: i + 1 })),
  });
  const subject = await prisma.subject.create({
    data: { name: CATALOG.subjectName, code: CATALOG.subjectCode },
  });
  const level = await prisma.level.create({
    data: { name: CATALOG.levelName, code: CATALOG.levelCode, orderIndex: 8, track: "BASICA" },
  });
  await prisma.subjectLevel.create({ data: { subjectId: subject.id, levelId: level.id } });

  // El acceso del coordinador sale de TeacherAssignment.coordinatorId
  await prisma.teacherAssignment.create({
    data: {
      teacherId:      teacher.id,
      subjectId:      subject.id,
      levelId:        level.id,
      academicYearId: year.id,
      coordinatorId:  coordinator.id,
    },
  });
  // Sin CoordinatorAssignment a propósito: el coordinador accede solo por
  // TeacherAssignment.coordinatorId y el admin debe ver igual sus PUM a firmar.
}

/** Ids del catálogo y de los usuarios creados en global-setup. */
export async function getContext() {
  const [year, subject, level, teacher, coordinator] = await Promise.all([
    prisma.academicYear.findUniqueOrThrow({ where: { label: CATALOG.yearLabel } }),
    prisma.subject.findUniqueOrThrow({ where: { code: CATALOG.subjectCode } }),
    prisma.level.findUniqueOrThrow({ where: { code: CATALOG.levelCode } }),
    prisma.user.findUniqueOrThrow({ where: { email: USERS.teacher.email } }),
    prisma.user.findUniqueOrThrow({ where: { email: USERS.coordinator.email } }),
  ]);
  const periods = await prisma.period.findMany({
    where: { academicYearId: year.id },
    orderBy: { number: "asc" },
  });
  return { year, subject, level, teacher, coordinator, periods };
}

/** Una fila completa de la tabla PUM (formato de PlanificationRow.data). */
export function completeRow(prefix: string) {
  return {
    dcdItems:         [{ text: `${prefix} — destreza`, ejes: [] }],
    indicators:       [`${prefix} — indicador`],
    methodologyItems: [],
    resources:        [{ text: `${prefix} — recurso`, principles: [] }],
    evaluations:      [`${prefix} — evaluación`],
  };
}

/** Todas las secciones fijas y las filas aprobadas (requisito para aprobar). */
export function allApprovedStates(rowCount: number) {
  const states: Record<string, { approved: boolean; comment: string | null }> = {};
  for (const key of REVIEW_SECTION_KEYS.filter((k) => !k.startsWith("pum_"))) {
    states[key] = { approved: true, comment: null };
  }
  for (let i = 0; i < rowCount; i++) states[`row_${i}`] = { approved: true, comment: null };
  return states;
}

/**
 * Crea un PUM del docente en el periodo indicado, con datos de la unidad y una
 * fila completa. Con status APPROVED/PENDING_SIGNATURE también crea la revisión
 * aprobada del coordinador.
 */
export async function seedPlan(periodNumber: number, status: PlanStatus): Promise<string> {
  const ctx = await getContext();
  const period = ctx.periods.find((p) => p.number === periodNumber);
  if (!period) throw new Error(`No existe el periodo ${periodNumber}`);

  const plan = await prisma.planification.create({
    data: {
      academicYearId: ctx.year.id,
      periodId:       period.id,
      subjectId:      ctx.subject.id,
      levelId:        ctx.level.id,
      status,
      metadata:       COMPLETE_METADATA,
      finalizedAt:    status === "DRAFT" ? null : new Date(),
      teachers:       { create: { teacherId: ctx.teacher.id, isEditor: true } },
      rows:           { create: { rowIndex: 0, data: completeRow(`Fila ${period.name}`) } },
    },
  });

  if (status === "APPROVED" || status === "PENDING_SIGNATURE") {
    await prisma.planReview.create({
      data: {
        planificationId: plan.id,
        coordinatorId:   ctx.coordinator.id,
        status:          "APPROVED",
        approvedAt:      new Date(),
        sectionStates:   allApprovedStates(1),
      },
    });
  }
  return plan.id;
}

export async function planState(planId: string) {
  const p = await prisma.planification.findUniqueOrThrow({
    where:   { id: planId },
    include: { review: true },
  });
  return {
    plan:      p.status,
    review:    p.review?.status ?? null,
    rejection: p.adminRejectionComment,
    states:    (p.review?.sectionStates ?? {}) as Record<string, { approved: boolean; comment: string | null }>,
  };
}
