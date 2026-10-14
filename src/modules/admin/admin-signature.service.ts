import { prisma } from "@/lib/prisma/client";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";
import { normalizePumRowData, normalizePlanMetadata } from "@/modules/planification/planification.service";
import { transitionPlan } from "@/modules/planification/planification.transitions";
import { loadActiveLinkChecker, visibleTeacherLinks } from "@/modules/planification/teacher-links";

export interface DashboardStats {
  totalTeachers: number;
  totalPlans: number;
  pendingSignature: number;
  signed: number;
  adminRejected: number;
  inProgress: number;
  overdue: number;
}

export interface PendingSignaturePlan {
  planId: string;
  planStatus: string;
  teacherName: string | null;
  teacherEmail: string;
  subjectName: string;
  levelCode: string;
  levelName: string;
  periodName: string;
  periodNumber: number;
  yearLabel: string;
  finalizedAt: Date | null;
}

export interface CoordinatorSignatureGroup {
  coordinatorId: string;
  coordinatorName: string | null;
  coordinatorEmail: string;
  plans: PendingSignaturePlan[];
}

export interface CoordinatorOverview {
  coordinatorId:    string;
  coordinatorName:  string | null;
  coordinatorEmail: string;
  teacherCount:     number;
  pendingReview:    number;
  pendingSignature: number;
  adminRejected:    number;
  signed:           number;
}

/** Dashboard del Admin y firma/rechazo de los PUM enviados por los coordinadores. */
export class AdminSignatureService {
  async getDashboardStats(yearId: string): Promise<DashboardStats> {
    const now = new Date();
    const [totalTeachers, totalPlans, pendingSignature, signed, adminRejected, overdue] = await Promise.all([
      prisma.user.count({
        where: { role: "TEACHER", assignments: { some: { academicYearId: yearId, active: true } } },
      }),
      prisma.planification.count({ where: { academicYearId: yearId } }),
      prisma.planification.count({ where: { academicYearId: yearId, status: "PENDING_SIGNATURE" } }),
      prisma.planification.count({ where: { academicYearId: yearId, status: "SIGNED" } }),
      prisma.planification.count({ where: { academicYearId: yearId, status: "ADMIN_REJECTED" } }),
      prisma.planification.count({
        where: { academicYearId: yearId, status: "DRAFT", editDeadlineAt: { lt: now } },
      }),
    ]);
    // ADMIN_REJECTED se reporta aparte (adminRejected), no como "en curso"
    const inProgress = totalPlans - pendingSignature - signed - adminRejected;
    return { totalTeachers, totalPlans, pendingSignature, signed, adminRejected, inProgress, overdue };
  }

  async getCoordinatorOverview(yearId: string): Promise<CoordinatorOverview[]> {
    const coordinators = await prisma.user.findMany({
      where: { role: "COORDINATOR", isActive: true },
      select: { id: true, name: true, email: true,
        coordinatorAssignmentsAsCoordinator: { select: { teacherId: true } },
      },
      orderBy: { name: "asc" },
    });
    const coordinatorIds = coordinators.map((c) => c.id);
    const legacyTeacherIds = coordinators.flatMap((c) => c.coordinatorAssignmentsAsCoordinator.map((a) => a.teacherId));

    // Los PUM de un coordinador salen de las mismas tres fuentes que usa su
    // bandeja: revisiones a su cargo, asignaciones con coordinatorId y el
    // vínculo coordinador→docente
    const [plans, directAssignments] = await Promise.all([
      prisma.planification.findMany({
        where: {
          academicYearId: yearId,
          OR: [
            { review: { coordinatorId: { in: coordinatorIds } } },
            { teachers: { some: { teacherId: { in: legacyTeacherIds } } } },
          ],
        },
        select: {
          id: true, status: true, subjectId: true, levelId: true,
          review:   { select: { coordinatorId: true } },
          teachers: { select: { teacherId: true } },
        },
      }),
      prisma.teacherAssignment.findMany({
        where:  { academicYearId: yearId, active: true, coordinatorId: { in: coordinatorIds } },
        select: { coordinatorId: true, teacherId: true, subjectId: true, levelId: true },
      }),
    ]);
    const comboPlans = directAssignments.length > 0
      ? await prisma.planification.findMany({
          where: {
            academicYearId: yearId,
            OR: directAssignments.map((a) => ({ subjectId: a.subjectId, levelId: a.levelId })),
          },
          select: { id: true, status: true, subjectId: true, levelId: true },
        })
      : [];

    return coordinators.map((c) => {
      const legacy  = new Set(c.coordinatorAssignmentsAsCoordinator.map((a) => a.teacherId));
      const direct  = directAssignments.filter((a) => a.coordinatorId === c.id);
      const statusById = new Map<string, string>();
      for (const p of plans) {
        if (p.review?.coordinatorId === c.id || p.teachers.some((t) => legacy.has(t.teacherId))) {
          statusById.set(p.id, p.status);
        }
      }
      for (const p of comboPlans) {
        if (direct.some((a) => a.subjectId === p.subjectId && a.levelId === p.levelId)) statusById.set(p.id, p.status);
      }
      const statuses = [...statusById.values()];
      const teacherIds = new Set([...legacy, ...direct.map((a) => a.teacherId)]);

      return {
        coordinatorId:    c.id,
        coordinatorName:  c.name,
        coordinatorEmail: c.email,
        teacherCount:     teacherIds.size,
        pendingReview:    statuses.filter((s) => ["FINALIZED", "FEEDBACK_RECEIVED"].includes(s)).length,
        pendingSignature: statuses.filter((s) => s === "PENDING_SIGNATURE").length,
        adminRejected:    statuses.filter((s) => s === "ADMIN_REJECTED").length,
        signed:           statuses.filter((s) => s === "SIGNED").length,
      };
    });
  }

  async getPendingSignaturePlans(yearId: string): Promise<CoordinatorSignatureGroup[]> {
    // Pendientes de firma de cualquier año (no deben quedar ocultos) y los
    // firmados solo del año indicado (el historial completo crecía sin límite)
    const plans = await prisma.planification.findMany({
      where: {
        OR: [
          { status: "PENDING_SIGNATURE" },
          { status: "SIGNED", academicYearId: yearId },
        ],
      },
      include: {
        teachers: {
          include: {
            teacher: {
              select: {
                id: true, name: true, email: true,
                coordinatorAssignmentsAsTeacher: {
                  include: { coordinator: { select: { id: true, name: true, email: true } } },
                },
              },
            },
          },
        },
        subject:      { select: { name: true } },
        level:        { select: { name: true, code: true } },
        period:       { select: { name: true, number: true } },
        academicYear: { select: { label: true } },
        review:       { select: { coordinator: { select: { id: true, name: true, email: true } } } },
      },
    });

    // Vínculos huérfanos (docentes removidos cuya asignación ya no está
    // activa) — mismo patrón que superadmin-plan.service.ts/coordinator.service.ts,
    // ver filterActiveTeacherLinks en planification.service.ts. Dos usos distintos:
    //  - "activeLinks": SIEMPRE filtrado (incluso en PUM ya SIGNED). Se usa solo
    //    para decidir a qué coordinador(es) pertenece este PUM en el panel — es
    //    enrutamiento operativo del Admin, no parte del registro histórico.
    //  - "displayLinks": filtrado solo si el PUM NO está firmado. En un PUM ya
    //    SIGNED se muestra el nombre tal como quedó al firmarse (registro
    //    institucional permanente) — una corrección puntual ahí requiere acción
    //    manual explícita de SuperAdmin, nunca automática.
    const isActive = await loadActiveLinkChecker(plans);

    const groups = new Map<string, CoordinatorSignatureGroup>();

    for (const plan of plans) {
      const activeLinks  = plan.teachers.filter((t) => isActive(plan, t.teacherId));
      const displayLinks = visibleTeacherLinks(plan, plan.teachers, isActive);

      const allTeacherNames = displayLinks.map((t) => t.teacher.name ?? t.teacher.email);
      const teacherDisplay  = allTeacherNames.length <= 2
        ? allTeacherNames.join(", ")
        : `${allTeacherNames[0]} + ${allTeacherNames.length - 1} más`;

      const editorLink = displayLinks.find((t) => t.isEditor) ?? displayLinks[0];
      const editorEmail = editorLink?.teacher.email ?? "";

      // Coordinador del PUM: quien lo revisó y envió a firma (PlanReview).
      // Antes solo se miraba CoordinatorAssignment, y un coordinador
      // vinculado por TeacherAssignment.coordinatorId podía enviar a firma un
      // PUM que el admin nunca veía. Sin revisión (datos antiguos), se cae al
      // vínculo coordinador→docente, siempre con activeLinks.
      const coordinatorSet = new Map<string, { id: string; name: string | null; email: string }>();
      if (plan.review) coordinatorSet.set(plan.review.coordinator.id, plan.review.coordinator);
      else for (const link of activeLinks) {
        for (const ca of link.teacher.coordinatorAssignmentsAsTeacher) {
          coordinatorSet.set(ca.coordinatorId, {
            id:    ca.coordinator.id,
            name:  ca.coordinator.name,
            email: ca.coordinator.email,
          });
        }
      }

      // Add to each coordinator's group
      for (const coord of coordinatorSet.values()) {
        if (!groups.has(coord.id)) {
          groups.set(coord.id, {
            coordinatorId:    coord.id,
            coordinatorName:  coord.name,
            coordinatorEmail: coord.email,
            plans: [],
          });
        }
        const existingInGroup = groups.get(coord.id)!.plans.some((p) => p.planId === plan.id);
        if (!existingInGroup) {
          groups.get(coord.id)!.plans.push({
            planId:       plan.id,
            planStatus:   plan.status,
            teacherName:  teacherDisplay,
            teacherEmail: editorEmail,
            subjectName:  plan.subject.name,
            levelCode:    plan.level.code,
            levelName:    plan.level.name,
            periodName:   plan.period.name,
            periodNumber: plan.period.number,
            yearLabel:    plan.academicYear.label,
            finalizedAt:  plan.finalizedAt,
          });
        }
      }
    }
    return [...groups.values()];
  }

  async signPlan(planId: string, actorId?: string, actorName?: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const ok = await transitionPlan(tx, planId, "SIGNED", {
        audit: {
          actorId:   actorId   ?? null,
          actorName: actorName ?? null,
          actorRole: "ADMIN",
          eventType: "SIGNED",
        },
      });
      if (!ok) throw new AppError(ErrorCode.PLAN_INVALID_TRANSITION, "El PUM ya no está pendiente de firma");
    });
  }

  async rejectPlan(planId: string, comment: string, actorId?: string, actorName?: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // La guarda de estado va en el UPDATE: un PUM firmado mientras tanto no
      // puede quedar rechazado
      const ok = await transitionPlan(tx, planId, "ADMIN_REJECTED", {
        data:  { adminRejectionComment: comment, adminRejectedAt: new Date() },
        audit: {
          actorId:   actorId   ?? null,
          actorName: actorName ?? null,
          actorRole: "ADMIN",
          eventType: "ADMIN_REJECTED",
          comment,
        },
      });
      if (!ok) throw new AppError(ErrorCode.PLAN_INVALID_TRANSITION, "El PUM ya no está pendiente de firma");

      await tx.planReview.updateMany({
        where: { planificationId: planId },
        data:  { status: "IN_REVIEW", approvedAt: null },
      });
    });
  }

  async getPlanForAdmin(planId: string) {
    const plan = await prisma.planification.findUnique({
      where: { id: planId },
      include: {
        rows:         { orderBy: { rowIndex: "asc" } },
        teachers:     { include: { teacher: true } },
        subject:      true,
        level:        true,
        period:       true,
        academicYear: true,
      },
    });
    if (!plan) return null;
    return {
      status:      plan.status,
      teacherName: plan.teachers.map((t) => t.teacher.name ?? t.teacher.email).join(", ") || null,
      subjectName: plan.subject.name,
      levelName:   plan.level.name,
      levelCode:   plan.level.code,
      levelTrack:  plan.level.track,
      periodName:  plan.period.name,
      yearLabel:   plan.academicYear.label,
      metadata:    normalizePlanMetadata(plan.metadata),
      rows: plan.rows.map((r) => ({
        id:       r.id,
        rowIndex: r.rowIndex,
        data:     normalizePumRowData(r.data),
      })),
    };
  }
}

export const adminSignatureService = new AdminSignatureService();
