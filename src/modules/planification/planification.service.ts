import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";
import { logger } from "@/lib/logger/logger";
import { prisma } from "@/lib/prisma/client";
import { auditService } from "@/modules/audit/audit.service";
import { assertCanEdit, assertCanFinalize } from "./planification.domain";
import type {
  Planification,
  PlanTeacher,
  PlanificationRow,
  PumRowData,
  DcdItem,
  MethodologySubItem,
  EjeTransversalId,
  PlanMetadata,
  PlanificationSummary,
  SubjectWithStatus,
  YearSummary,
  PeriodSummary,
  DisplayStatus,
} from "./planification.types";
import type {
  SavePlanificationRowsInput,
  FinalizePlanificationInput,
  SaveMetadataInput,
} from "./planification.schema";
import type { PlanificationStatus } from "@/constants/planification";
import type { UserId, AcademicYearId, PeriodId, SubjectId, LevelId } from "@/types";

const log = logger.child("PlanificationService");

// ── Normalización de datos históricos ─────────────────────────────────────────

export function normalizePumRowData(raw: unknown): PumRowData {
  const data = raw as Record<string, unknown> | null;

  if (!data || typeof data !== "object") {
    return emptyPumRowData();
  }

  const isLegacy =
    typeof data.indicator === "string" || typeof data.methodology === "string";

  if (isLegacy) {
    return {
      dcdItems: [{ text: String(data.dcd ?? ""), ejes: [] }],
      indicators: data.indicator ? [String(data.indicator)] : [],
      methodologyItems: data.methodology
        ? [{ text: String(data.methodology), principles: [] }]
        : [],
      resources: data.resources ? [{ text: String(data.resources), principles: [] }] : [],
      evaluations: data.evaluation ? [String(data.evaluation)] : [],
    };
  }

  // Normalize dcdItems: new format or backward compat from old dcd + ejeTransversales
  let dcdItems: DcdItem[];
  if (Array.isArray(data.dcdItems) && data.dcdItems.length > 0) {
    dcdItems = (data.dcdItems as Array<Record<string, unknown>>).map((item) => ({
      text: String(item.text ?? ""),
      ejes: Array.isArray(item.ejes) ? (item.ejes as EjeTransversalId[]) : [],
    }));
  } else {
    let ejes: EjeTransversalId[] = [];
    if (Array.isArray(data.ejeTransversales)) {
      ejes = data.ejeTransversales as EjeTransversalId[];
    } else if (data.ejeTransversal != null) {
      ejes = [data.ejeTransversal as EjeTransversalId];
    }
    dcdItems = [{ text: String(data.dcd ?? ""), ejes }];
  }

  return {
    dcdItems,
    indicators: Array.isArray(data.indicators)
      ? (data.indicators as unknown[]).map(String)
      : [],
    methodologyItems: Array.isArray(data.methodologyItems)
      ? (data.methodologyItems as MethodologySubItem[])
      : [],
    resources: Array.isArray(data.resources)
      ? (data.resources as unknown[]).map((item) =>
          typeof item === "string"
            ? { text: item, principles: [] }
            : (item as MethodologySubItem)
        )
      : [],
    evaluations: Array.isArray(data.evaluations)
      ? (data.evaluations as unknown[]).map(String)
      : [],
  };
}

function parseDuaSel(val: unknown): import("@/modules/planification/planification.types").DuaSelection | null {
  if (!val) return null;
  if (Array.isArray(val)) {
    const arr = (val as unknown[])
      .filter(
        (item): item is { pauta: number; subPautas: number[] } =>
          !!item &&
          typeof item === "object" &&
          typeof (item as Record<string, unknown>).pauta === "number" &&
          Array.isArray((item as Record<string, unknown>).subPautas),
      )
      .map((item) => ({
        pauta: item.pauta,
        subPautas: (item.subPautas as unknown[]).filter((n): n is number => typeof n === "number"),
      }))
      .filter((e) => e.subPautas.length > 0);
    return arr.length > 0 ? arr : null;
  }
  // Old single-object format: { pauta, subPautas } → wrap in array
  if (typeof val === "object") {
    const o = val as Record<string, unknown>;
    if (typeof o.pauta === "number" && Array.isArray(o.subPautas)) {
      const subPautas = (o.subPautas as unknown[]).filter((n): n is number => typeof n === "number");
      return subPautas.length > 0 ? [{ pauta: o.pauta, subPautas }] : null;
    }
  }
  return null;
}

export function normalizePlanMetadata(raw: unknown): PlanMetadata | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const strArr = (v: unknown) =>
    Array.isArray(v) ? (v as unknown[]).map(String).filter(Boolean) : [];
  return {
    areaEstudio:       String(m.areaEstudio ?? ""),
    numUnidad:         String(m.numUnidad ?? ""),
    titulo:            String(m.titulo ?? ""),
    objetivos:         strArr(m.objetivos),
    criterios:         strArr(m.criterios),
    nPeriodos:         String(m.nPeriodos ?? ""),
    fechInicio:        String(m.fechInicio ?? ""),
    fechFin:           String(m.fechFin ?? ""),
    ejesTransversales: String(m.ejesTransversales ?? ""),
    aportes: Array.isArray(m.aportes)
      ? (m.aportes as Array<Record<string, unknown>>).map((a) => ({
          dim:    String(a.dim ?? ""),
          aporte: String(a.aporte ?? ""),
          como:   String(a.como ?? ""),
        }))
      : [],
    p1: parseDuaSel(m.p1),
    p2: parseDuaSel(m.p2),
    p3: parseDuaSel(m.p3),
    ...(typeof m.nivelSubnivelOverride === "string" && m.nivelSubnivelOverride
      ? { nivelSubnivelOverride: m.nivelSubnivelOverride }
      : {}),
    ...(typeof m.nivelGradoOverride === "string" && m.nivelGradoOverride
      ? { nivelGradoOverride: m.nivelGradoOverride }
      : {}),
  };
}

function emptyPumRowData(): PumRowData {
  return {
    dcdItems: [{ text: "", ejes: [] }],
    indicators: [],
    methodologyItems: [],
    resources: [],
    evaluations: [],
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPlanFromDb(
  plan: {
    id: string;
    academicYearId: string;
    periodId: string;
    subjectId: string;
    levelId: string;
    status: string;
    metadata: unknown;
    editDeadlineAt: Date | null;
    finalizedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    teachers: Array<{ teacherId: string; isEditor: boolean; teacher: { name: string | null } }>;
    rows: Array<{ id: string; rowIndex: number; data: unknown }>;
  },
  requestingTeacherId: UserId
): Planification {
  const teachers: PlanTeacher[] = plan.teachers.map((t) => ({
    id:       t.teacherId,
    name:     t.teacher.name,
    isEditor: t.isEditor,
  }));

  const myLink = plan.teachers.find((t) => t.teacherId === requestingTeacherId);
  const editorLink = plan.teachers.find((t) => t.isEditor);

  return {
    id:             plan.id,
    academicYearId: plan.academicYearId,
    periodId:       plan.periodId,
    subjectId:      plan.subjectId,
    levelId:        plan.levelId,
    status:         plan.status as PlanificationStatus,
    metadata:       normalizePlanMetadata(plan.metadata),
    editDeadlineAt: plan.editDeadlineAt,
    finalizedAt:    plan.finalizedAt,
    createdAt:      plan.createdAt,
    updatedAt:      plan.updatedAt,
    teachers,
    isEditor:    myLink?.isEditor ?? false,
    editorName:  editorLink?.teacher.name ?? null,
    rows: plan.rows.map((r): PlanificationRow => ({
      id:       r.id,
      rowIndex: r.rowIndex,
      data:     normalizePumRowData(r.data),
    })),
  };
}

const PLAN_INCLUDE = {
  teachers: {
    include: { teacher: { select: { name: true } } },
  },
  rows: { orderBy: { rowIndex: "asc" as const } },
} as const;

// ── PlanificationService ──────────────────────────────────────────────────────

export class PlanificationService {
  // ── Navegación wizard ────────────────────────────────────────────────────

  async getYearsForTeacher(teacherId: UserId): Promise<YearSummary[]> {
    log.info("getYearsForTeacher", { teacherId });

    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId, active: true },
      select: { academicYearId: true },
      distinct: ["academicYearId"],
    });

    if (assignments.length === 0) return [];

    const yearIds = assignments.map((a) => a.academicYearId);

    const years = await prisma.academicYear.findMany({
      where: { id: { in: yearIds } },
      orderBy: { yearStart: "desc" },
    });

    const counts = await prisma.teacherAssignment.groupBy({
      by: ["academicYearId"],
      where: { teacherId, active: true, academicYearId: { in: yearIds } },
      _count: { id: true },
    });
    const countMap = Object.fromEntries(counts.map((c) => [c.academicYearId, c._count.id]));

    return years.map((y) => ({
      id:              y.id,
      label:           y.label,
      yearStart:       y.yearStart,
      active:          y.active,
      assignmentCount: countMap[y.id] ?? 0,
    }));
  }

  async getPeriodsForYear(teacherId: UserId, yearId: AcademicYearId): Promise<PeriodSummary[]> {
    log.info("getPeriodsForYear", { teacherId, yearId });

    const [periods, assignments, planLinks] = await Promise.all([
      prisma.period.findMany({
        where: { academicYearId: yearId },
        orderBy: { number: "asc" },
      }),
      prisma.teacherAssignment.findMany({
        where: { teacherId, academicYearId: yearId, active: true },
        select: { subjectId: true, levelId: true },
      }),
      prisma.planificationTeacher.findMany({
        where: { teacherId, planification: { academicYearId: yearId } },
        select: {
          planification: {
            select: { periodId: true, status: true, academicYearId: true },
          },
        },
      }),
    ]);

    const uniquePairs = new Set(assignments.map((a) => `${a.subjectId}|${a.levelId}`));
    const totalCount  = uniquePairs.size;

    const planifications = planLinks
      .map((l) => l.planification)
      .filter((p) => p.academicYearId === yearId);

    return periods.map((p) => {
      const periodPlans = planifications.filter((pl) => pl.periodId === p.id);
      return {
        id:             p.id,
        name:           p.name,
        number:         p.number,
        finalizedCount: periodPlans.filter((pl) =>
          ["FINALIZED", "FEEDBACK_RECEIVED", "APPROVED", "PENDING_SIGNATURE", "SIGNED", "ADMIN_REJECTED"].includes(pl.status)
        ).length,
        totalCount,
      };
    });
  }

  async getSubjectsWithStatus(
    teacherId: UserId,
    yearId: AcademicYearId,
    periodId: PeriodId
  ): Promise<SubjectWithStatus[]> {
    log.info("getSubjectsWithStatus", { teacherId, yearId, periodId });

    const [assignments, planLinks] = await Promise.all([
      prisma.teacherAssignment.findMany({
        where: { teacherId, academicYearId: yearId, active: true },
        include: { subject: true, level: true },
      }).then((rows) =>
        rows.sort((a, b) =>
          a.level.orderIndex !== b.level.orderIndex
            ? a.level.orderIndex - b.level.orderIndex
            : a.subject.name.localeCompare(b.subject.name, "es")
        )
      ),
      prisma.planificationTeacher.findMany({
        where: { teacherId, planification: { academicYearId: yearId } },
        select: {
          isEditor: true,
          planification: {
            select: { id: true, status: true, editDeadlineAt: true, finalizedAt: true, subjectId: true, levelId: true, periodId: true, academicYearId: true },
          },
        },
      }),
    ]);

    const now = new Date();

    const myPlans = planLinks
      .map((l) => ({ ...l.planification, isEditor: l.isEditor }))
      .filter((p) => p.periodId === periodId);

    return assignments.map((a) => {
      const plan = myPlans.find(
        (p) => p.subjectId === a.subjectId && p.levelId === a.levelId
      ) ?? null;

      let displayStatus: DisplayStatus;
      if (!plan) {
        displayStatus = "NOT_STARTED";
      } else if (["APPROVED", "PENDING_SIGNATURE", "SIGNED", "ADMIN_REJECTED"].includes(plan.status)) {
        displayStatus = "APPROVED";
      } else if (plan.status === "FINALIZED") {
        displayStatus = "FINALIZED";
      } else if (plan.status === "FEEDBACK_RECEIVED") {
        displayStatus = "FEEDBACK_RECEIVED";
      } else if (plan.editDeadlineAt && plan.editDeadlineAt < now) {
        displayStatus = "OVERDUE";
      } else {
        displayStatus = "DRAFT";
      }

      return {
        assignmentId: a.id,
        subject: { id: a.subject.id, name: a.subject.name, code: a.subject.code },
        level: {
          id:         a.level.id,
          name:       a.level.name,
          code:       a.level.code,
          track:      a.level.track,
          orderIndex: a.level.orderIndex,
        },
        planification: plan
          ? {
              id:             plan.id,
              status:         plan.status as "DRAFT" | "FINALIZED",
              editDeadlineAt: plan.editDeadlineAt,
              finalizedAt:    plan.finalizedAt,
            }
          : null,
        displayStatus,
      };
    });
  }

  async getSubjectsForYear(
    teacherId: UserId,
    yearId: AcademicYearId
  ): Promise<import("./planification.types").SubjectYearSummary[]> {
    log.info("getSubjectsForYear", { teacherId, yearId });

    const [assignments, periods, planLinks] = await Promise.all([
      prisma.teacherAssignment.findMany({
        where: { teacherId, academicYearId: yearId, active: true },
        include: {
          subject: true,
          level:   true,
        },
      }).then((rows) =>
        rows.sort((a, b) =>
          a.level.orderIndex !== b.level.orderIndex
            ? a.level.orderIndex - b.level.orderIndex
            : a.subject.name.localeCompare(b.subject.name, "es")
        )
      ),
      prisma.period.findMany({
        where: { academicYearId: yearId },
        orderBy: { number: "asc" },
      }),
      prisma.planificationTeacher.findMany({
        where: { teacherId, planification: { academicYearId: yearId } },
        select: {
          planification: {
            select: { id: true, periodId: true, subjectId: true, levelId: true, status: true, editDeadlineAt: true, finalizedAt: true, academicYearId: true },
          },
        },
      }),
    ]);

    const now = new Date();

    const myPlans = planLinks.map((l) => l.planification);

    const computeStatus = (plan: typeof myPlans[number] | null): import("./planification.types").DisplayStatus => {
      if (!plan) return "NOT_STARTED";
      if (["APPROVED", "PENDING_SIGNATURE", "SIGNED", "ADMIN_REJECTED"].includes(plan.status)) return "APPROVED";
      if (plan.status === "FEEDBACK_RECEIVED") return "FEEDBACK_RECEIVED";
      if (plan.status === "FINALIZED") return "FINALIZED";
      if (plan.editDeadlineAt && plan.editDeadlineAt < now) return "OVERDUE";
      return "DRAFT";
    };

    const map = new Map<string, import("./planification.types").SubjectYearSummary>();
    for (const a of assignments) {
      const key = `${a.subjectId}-${a.levelId}`;
      if (!map.has(key)) {
        const periodStatuses = periods.map((p) => {
          const plan = myPlans.find(
            (pl) => pl.subjectId === a.subjectId && pl.levelId === a.levelId && pl.periodId === p.id
          ) ?? null;
          return {
            periodId:       p.id,
            periodName:     p.name,
            periodNumber:   p.number,
            planId:         plan?.id ?? null,
            planStatus:     (plan?.status ?? null) as import("./planification.types").PeriodPlanStatus["planStatus"],
            editDeadlineAt: plan?.editDeadlineAt ?? null,
            displayStatus:  computeStatus(plan),
          };
        });
        map.set(key, {
          subjectId:       a.subjectId,
          subjectName:     a.subject.name,
          subjectCode:     a.subject.code,
          levelId:         a.levelId,
          levelName:       a.level.name,
          levelCode:       a.level.code,
          levelOrderIndex: a.level.orderIndex,
          periods:         periodStatuses,
        });
      }
    }

    return Array.from(map.values());
  }

  async getOrCreatePlanification(
    teacherId: UserId,
    yearId: AcademicYearId,
    periodId: PeriodId,
    subjectId: SubjectId,
    levelId: LevelId
  ): Promise<{ planId: string; isNewPlan: boolean }> {
    log.info("getOrCreatePlanification", { teacherId, yearId, periodId, subjectId, levelId });

    const [assignment, coAssigned] = await Promise.all([
      prisma.teacherAssignment.findFirst({
        where: { teacherId, subjectId, levelId, academicYearId: yearId, active: true },
      }),
      prisma.teacherAssignment.findMany({
        where: { subjectId, levelId, academicYearId: yearId, active: true },
        select: { teacherId: true },
      }),
    ]);

    if (!assignment) {
      throw new AppError(
        ErrorCode.AUTH_UNAUTHORIZED,
        "No tienes asignación para esta materia y nivel"
      );
    }

    const allTeacherIds = [...new Set(coAssigned.map((a) => a.teacherId))];

    const existing = await prisma.planification.findUnique({
      where: { academicYearId_periodId_subjectId_levelId: { academicYearId: yearId, periodId, subjectId, levelId } },
      select: { id: true },
    });

    if (existing) {
      // PUM existente: solo vincular nuevos docentes co-asignados como viewers.
      // Nunca se toca isEditor de registros ya existentes — el editor actual se preserva.
      // El coordinador puede cambiar el editor explícitamente desde su panel.
      await Promise.all(
        allTeacherIds.map((tid) =>
          prisma.planificationTeacher.upsert({
            where: { planificationId_teacherId: { planificationId: existing.id, teacherId: tid } },
            create: { planificationId: existing.id, teacherId: tid, isEditor: false },
            update: {},
          })
        )
      );
      return { planId: existing.id, isNewPlan: false };
    }

    // PUM nuevo: quien lo crea es el editor (primer docente que accede).
    const editorId = teacherId;

    let created: { id: string };
    const teacher = await prisma.user.findUnique({ where: { id: teacherId }, select: { name: true } });

    try {
      created = await prisma.planification.create({
        data: { academicYearId: yearId, periodId, subjectId, levelId, status: "DRAFT" },
        select: { id: true },
      });
    } catch (err) {
      // P2002 = two teachers opened the PUM simultaneously — the second one links to the winner
      if ((err as { code?: string }).code === "P2002") {
        const conflict = await prisma.planification.findUnique({
          where: { academicYearId_periodId_subjectId_levelId: { academicYearId: yearId, periodId, subjectId, levelId } },
          select: { id: true },
        });
        if (!conflict) throw err;
        await Promise.all(
          allTeacherIds.map((tid) =>
            prisma.planificationTeacher.upsert({
              where:  { planificationId_teacherId: { planificationId: conflict.id, teacherId: tid } },
              create: { planificationId: conflict.id, teacherId: tid, isEditor: false },
              update: {},
            })
          )
        );
        return { planId: conflict.id, isNewPlan: false };
      }
      throw err;
    }

    await prisma.planificationTeacher.createMany({
      data: allTeacherIds.map((tid) => ({
        planificationId: created.id,
        teacherId:       tid,
        isEditor:        tid === editorId,
      })),
      skipDuplicates: true,
    });

    await auditService.log({
      planificationId: created.id,
      actorId:   teacherId,
      actorName: teacher?.name ?? null,
      actorRole: "TEACHER",
      eventType: "PLAN_CREATED",
    });

    return { planId: created.id, isNewPlan: true };
  }

  // ── Métodos de edición ───────────────────────────────────────────────────

  async listForTeacher(
    teacherId: UserId,
    yearId: AcademicYearId,
    periodId: PeriodId
  ): Promise<PlanificationSummary[]> {
    log.info("listForTeacher", { teacherId, yearId, periodId });
    throw new AppError(ErrorCode.NOT_IMPLEMENTED, "PlanificationService.listForTeacher — Fase 3C");
  }

  async getById(planId: string, teacherId: UserId): Promise<Planification> {
    log.info("getById", { planId, teacherId });

    const plan = await prisma.planification.findUnique({
      where: { id: planId },
      include: PLAN_INCLUDE,
    });

    if (!plan) {
      throw new AppError(ErrorCode.PLAN_NOT_FOUND, "Planificación no encontrada");
    }

    const isLinked = plan.teachers.some((t) => t.teacherId === teacherId);
    if (!isLinked) {
      throw new AppError(ErrorCode.PLAN_NOT_OWNED_BY_TEACHER, "No tienes permiso para acceder a esta planificación");
    }

    return buildPlanFromDb(plan, teacherId);
  }

  /** getById sin verificar pertenencia — para uso interno de servicios (export, admin). */
  async getByIdUnchecked(planId: string): Promise<Planification> {
    log.info("getByIdUnchecked", { planId });

    const plan = await prisma.planification.findUnique({
      where: { id: planId },
      include: PLAN_INCLUDE,
    });

    if (!plan) {
      throw new AppError(ErrorCode.PLAN_NOT_FOUND, "Planificación no encontrada");
    }

    const editorTeacherId = plan.teachers.find((t) => t.isEditor)?.teacherId ?? "";
    return buildPlanFromDb(plan, editorTeacherId);
  }

  /** Batch version of getByIdUnchecked — one query for N plans instead of N queries. */
  async getManyByIdUnchecked(planIds: string[]): Promise<Planification[]> {
    if (!planIds.length) return [];
    const plans = await prisma.planification.findMany({
      where: { id: { in: planIds } },
      include: PLAN_INCLUDE,
    });
    return plans.map((plan) => {
      const editorTeacherId = plan.teachers.find((t) => t.isEditor)?.teacherId ?? "";
      return buildPlanFromDb(plan, editorTeacherId);
    });
  }

  async saveRows(input: SavePlanificationRowsInput, teacherId: UserId): Promise<void> {
    log.info("saveRows", { planId: input.planificationId, rowCount: input.rows.length });

    const plan = await this.getById(input.planificationId, teacherId);
    assertCanEdit(plan);

    await prisma.$transaction(async (tx) => {
      await tx.planificationRow.deleteMany({
        where: { planificationId: input.planificationId },
      });

      if (input.rows.length > 0) {
        await tx.planificationRow.createMany({
          data: input.rows.map((r) => ({
            planificationId:  input.planificationId,
            rowIndex:         r.rowIndex,
            data:             r.data,
            methodologyIcons: [],
          })),
        });
      }

      await tx.planification.update({
        where: { id: input.planificationId },
        data:  { updatedAt: new Date() },
      });
    });
  }

  async finalize(input: FinalizePlanificationInput, teacherId: UserId): Promise<void> {
    log.info("finalize", { planId: input.planificationId });

    const plan = await this.getById(input.planificationId, teacherId);
    assertCanFinalize(plan);

    const isResubmission = plan.status === "FEEDBACK_RECEIVED";

    // Sincroniza docentes co-asignados: agrega cualquier docente que haya sido
    // asignado a la materia después de que el plan fue creado. skipDuplicates
    // garantiza que no se sobreescriben los registros existentes (isEditor incluido).
    const coAssigned = await prisma.teacherAssignment.findMany({
      where: {
        subjectId:      plan.subjectId,
        levelId:        plan.levelId,
        academicYearId: plan.academicYearId,
        active:         true,
      },
      select: { teacherId: true },
    });
    if (coAssigned.length > 0) {
      await prisma.planificationTeacher.createMany({
        data: coAssigned.map((a) => ({
          planificationId: input.planificationId,
          teacherId:       a.teacherId,
          isEditor:        a.teacherId === teacherId,
        })),
        skipDuplicates: true,
      });
    }

    await prisma.$transaction(async (tx) => {
      // Status guard prevents double-finalization if two requests race
      await tx.planification.update({
        where: { id: input.planificationId, status: { in: ["DRAFT", "FEEDBACK_RECEIVED"] } },
        data:  { status: "FINALIZED", finalizedAt: new Date() },
      });
      await tx.planReview.updateMany({
        where: { planificationId: input.planificationId, status: "FEEDBACK_SENT" },
        data:  { status: "IN_REVIEW" },
      });
    });

    const teacher = await prisma.user.findUnique({
      where:  { id: teacherId },
      select: { name: true },
    });
    await auditService.log({
      planificationId: input.planificationId,
      actorId:   teacherId,
      actorName: teacher?.name ?? null,
      actorRole: "TEACHER",
      eventType: isResubmission ? "TEACHER_RESUBMITTED" : "FINALIZED",
    });
  }

  async saveMetadata(input: SaveMetadataInput, teacherId: UserId): Promise<void> {
    log.info("saveMetadata", { planId: input.planificationId });

    const plan = await this.getById(input.planificationId, teacherId);
    assertCanEdit(plan);

    await prisma.planification.update({
      where: { id: input.planificationId },
      data:  { metadata: input.metadata, updatedAt: new Date() },
    });
  }

  async cloneFromPrevious(sourcePlanId: string, teacherId: UserId): Promise<Planification> {
    log.info("cloneFromPrevious", { sourcePlanId });
    throw new AppError(ErrorCode.NOT_IMPLEMENTED, "PlanificationService.cloneFromPrevious — Fase 3C");
  }
}

export const planificationService = new PlanificationService();
