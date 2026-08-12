import { prisma } from "@/lib/prisma/client";
import { REVIEW_SECTION_KEYS, BLOCKING_REVIEW_KEYS, type SectionStates, type ReviewStatus } from "@/constants/review";
import { normalizePumRowData, normalizePlanMetadata } from "@/modules/planification/planification.service";
import { auditService } from "@/modules/audit/audit.service";
import type { AssignedTeacher, TeacherAssignmentEntry, FinalizedPlanEntry, PlanReviewSummary } from "./coordinator.types";

// All non-pum_ keys (includes meta_*, plan_*, aportes_*, dua_*) — used for normalizing states
const ALL_FIXED_KEYS = REVIEW_SECTION_KEYS.filter((k) => !k.startsWith("pum_"));

// All non-pum_ fixed keys + dynamic row keys count toward progress
// "reviewed" = approved OR has a non-empty comment (mirrors ReviewClient.isReviewed)
function countProgress(
  states: SectionStates,
  rowCount: number,
): { approved: number; total: number } {
  const isReviewed = (s: { approved: boolean; comment: string | null } | undefined) =>
    s?.approved === true || !!(s?.comment?.trim());

  const fixedReviewed = ALL_FIXED_KEYS.filter((k) => isReviewed(states[k])).length;
  const rowReviewed = Object.keys(states).filter(
    (k) => /^row_\d+$/.test(k) && isReviewed((states as Record<string, { approved: boolean; comment: string | null }>)[k]),
  ).length;
  return {
    approved: fixedReviewed + rowReviewed,
    total: ALL_FIXED_KEYS.length + rowCount,
  };
}

function normalizeStates(raw: unknown): SectionStates {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const result: SectionStates = {};

  // Process all fixed section keys (includes meta_*, plan_*, aportes_*, dua_*, pum_*)
  for (const key of ALL_FIXED_KEYS) {
    const entry = obj[key] as { approved?: boolean; comment?: string | null } | undefined;
    if (entry) {
      result[key] = {
        approved: entry.approved ?? false,
        comment:  entry.comment  ?? null,
      };
    }
  }

  // Process per-row keys (row_0, row_1, …)
  for (const key of Object.keys(obj)) {
    if (/^row_\d+$/.test(key)) {
      const entry = obj[key] as { approved?: boolean; comment?: string | null } | undefined;
      if (entry) {
        result[key as `row_${number}`] = {
          approved: entry.approved ?? false,
          comment:  entry.comment  ?? null,
        };
      }
    }
  }

  return result;
}

export const coordinatorService = {
  // ── Docentes asignados ──────────────────────────────────────────────────────

  async getAssignedTeachers(coordinatorId: string): Promise<AssignedTeacher[]> {
    const [cas, self] = await Promise.all([
      prisma.coordinatorAssignment.findMany({
        where: { coordinatorId },
        include: {
          teacher: {
            select: {
              id: true, name: true, email: true, cedula: true,
              assignments: {
                where: { active: true },
                include: {
                  subject:      { select: { id: true, name: true, code: true } },
                  level:        { select: { id: true, name: true, code: true } },
                  academicYear: { select: { id: true, label: true } },
                },
                orderBy: [{ academicYear: { yearStart: "desc" } }, { subject: { name: "asc" } }],
              },
            },
          },
        },
        orderBy: [{ teacher: { name: "asc" } }],
      }),
      prisma.user.findUnique({
        where:  { id: coordinatorId },
        select: {
          id: true, name: true, email: true, cedula: true,
          assignments: {
            where: { active: true },
            include: {
              subject:      { select: { id: true, name: true, code: true } },
              level:        { select: { id: true, name: true, code: true } },
              academicYear: { select: { id: true, label: true } },
            },
            orderBy: [{ academicYear: { yearStart: "desc" } }, { subject: { name: "asc" } }],
          },
        },
      }),
    ]);

    // Recopilar todos los teacherIds involucrados para hacer una sola query de PlanificationTeacher
    const allTeacherIds = [
      ...cas.map((ca) => ca.teacher.id),
      ...(self ? [self.id] : []),
    ];

    // Obtener todos los vínculos PlanificationTeacher de estos docentes de una sola vez
    const planLinks = await prisma.planificationTeacher.findMany({
      where: { teacherId: { in: allTeacherIds } },
      select: {
        teacherId: true,
        isEditor:  true,
        planification: {
          select: { subjectId: true, levelId: true, academicYearId: true },
        },
      },
    });

    // Construir un mapa: "teacherId|subjectId|levelId|yearId" → isEditor
    // Si hay múltiples periodos para el mismo combo, basta con que uno sea editor.
    const editorMap = new Map<string, boolean>();
    for (const link of planLinks) {
      const key = `${link.teacherId}|${link.planification.subjectId}|${link.planification.levelId}|${link.planification.academicYearId}`;
      // Si en cualquier periodo del combo es editor, marcamos true
      if (!editorMap.has(key) || link.isEditor) {
        editorMap.set(key, link.isEditor);
      }
    }

    // Mapa de combos que tienen PUM (para distinguir null de false)
    const planExistsMap = new Set<string>();
    for (const link of planLinks) {
      const key = `${link.teacherId}|${link.planification.subjectId}|${link.planification.levelId}|${link.planification.academicYearId}`;
      planExistsMap.add(key);
    }

    function mapAssignments(
      teacherId: string,
      assignments: Array<{
        id: string; subjectId: string; levelId: string;
        subject: { name: string; code: string };
        level:   { name: string; code: string };
        academicYear: { id: string; label: string };
      }>
    ): TeacherAssignmentEntry[] {
      return assignments.map((a) => {
        const key = `${teacherId}|${a.subjectId}|${a.levelId}|${a.academicYear.id}`;
        const hasPlan = planExistsMap.has(key);
        return {
          id:          a.id,
          subjectId:   a.subjectId,
          subjectName: a.subject.name,
          subjectCode: a.subject.code,
          levelId:     a.levelId,
          levelName:   a.level.name,
          levelCode:   a.level.code,
          yearId:      a.academicYear.id,
          yearLabel:   a.academicYear.label,
          isEditor:    hasPlan ? (editorMap.get(key) ?? false) : null,
        };
      });
    }

    const teachers: AssignedTeacher[] = cas.map((ca) => ({
      id:          ca.teacher.id,
      name:        ca.teacher.name,
      email:       ca.teacher.email,
      cedula:      ca.teacher.cedula,
      assignments: mapAssignments(ca.teacher.id, ca.teacher.assignments),
    }));

    // Prepend coordinator themselves so they can assign subjects to themselves
    if (self) {
      teachers.unshift({
        id:          self.id,
        name:        self.name,
        email:       self.email,
        cedula:      self.cedula,
        assignments: mapAssignments(self.id, self.assignments),
      });
    }

    return teachers;
  },

  // ── Planes en ciclo de revisión para retroalimentación ──────────────────────

  async getFinalizedPlans(coordinatorId: string): Promise<FinalizedPlanEntry[]> {
    // Plans visible to this coordinator: those whose subject+level+year have at least
    // one TeacherAssignment with coordinatorId = this coordinator.
    // Fall back to CoordinatorAssignment (teacher-based) for assignments without coordinatorId.
    const [directAssignments, cas] = await Promise.all([
      prisma.teacherAssignment.findMany({
        where: { coordinatorId, active: true },
        select: { subjectId: true, levelId: true, academicYearId: true },
        distinct: ["subjectId", "levelId", "academicYearId"],
      }),
      prisma.coordinatorAssignment.findMany({
        where: { coordinatorId },
        select: { teacherId: true },
      }),
    ]);

    // Build plan ID set from both sources (deduplicated)
    const planIdSet = new Set<string>();

    // Source 1: assignments with coordinatorId set (new model)
    if (directAssignments.length > 0) {
      const directPlans = await prisma.planification.findMany({
        where: {
          OR: directAssignments.map((a) => ({
            subjectId:      a.subjectId,
            levelId:        a.levelId,
            academicYearId: a.academicYearId,
          })),
          status: { in: ["FINALIZED", "FEEDBACK_RECEIVED", "APPROVED", "PENDING_SIGNATURE", "ADMIN_REJECTED", "SIGNED"] },
        },
        select: { id: true },
      });
      directPlans.forEach((p) => planIdSet.add(p.id));
    }

    // Source 2: legacy CoordinatorAssignment (teacher-based) for assignments without coordinatorId
    const teacherIds = cas.map((c) => c.teacherId);
    if (teacherIds.length > 0) {
      const legacyLinks = await prisma.planificationTeacher.findMany({
        where: {
          teacherId: { in: teacherIds },
          planification: {
            status: { in: ["FINALIZED", "FEEDBACK_RECEIVED", "APPROVED", "PENDING_SIGNATURE", "ADMIN_REJECTED", "SIGNED"] },
          },
        },
        select: { planificationId: true },
      });
      legacyLinks.forEach((l) => planIdSet.add(l.planificationId));
    }

    if (planIdSet.size === 0) return [];

    const plans = await prisma.planification.findMany({
      where: { id: { in: Array.from(planIdSet) } },
      include: {
        teachers:     { include: { teacher: { select: { name: true, email: true } } } },
        subject:      true,
        level:        true,
        period:       true,
        academicYear: true,
        review:       true,
        _count:       { select: { rows: true } },
      },
      orderBy: [{ academicYear: { yearStart: "desc" } }, { finalizedAt: "desc" }],
    });

    return plans.map((p) => {
      const states  = normalizeStates(p.review?.sectionStates);
      const { approved, total } = countProgress(states, p._count.rows);
      const reviewStatus: ReviewStatus = p.status === "ADMIN_REJECTED"
        ? "IN_REVIEW"
        : ((p.review?.status as ReviewStatus) ?? "IN_REVIEW");

      const reviewSummary: PlanReviewSummary = {
        reviewId:         p.review?.id ?? null,
        planificationId:  p.id,
        status:           reviewStatus,
        sectionStates:    states,
        approvedAt:       p.review?.approvedAt ?? null,
        approvedSections: approved,
        totalSections:    total,
      };

      const meta = (p.metadata && typeof p.metadata === "object" && !Array.isArray(p.metadata))
        ? (p.metadata as Record<string, unknown>)
        : {};
      const adminRejectionComment = typeof meta.adminRejectionComment === "string"
        ? meta.adminRejectionComment
        : null;

      const editorLink = p.teachers.find((t) => t.isEditor);
      const allNames   = p.teachers.map((t) => t.teacher.name ?? t.teacher.email);
      const teacherNames = allNames.length <= 2
        ? allNames.join(", ")
        : `${allNames[0]} + ${allNames.length - 1} más`;

      return {
        planificationId:      p.id,
        planStatus:           p.status,
        teacherId:            editorLink?.teacherId ?? "",
        teacherName:          teacherNames,
        teacherEmail:         editorLink?.teacher.email ?? "",
        subjectName:          p.subject.name,
        levelName:            p.level.name,
        levelCode:            p.level.code,
        periodName:           p.period.name,
        yearLabel:            p.academicYear.label,
        finalizedAt:          p.finalizedAt,
        review:               reviewSummary,
        adminRejectionComment,
      };
    });
  },

  // ── Revisión de un PUM ────────────────────────────────────────────────────────

  async getOrCreateReview(coordinatorId: string, planificationId: string) {
    const existing = await prisma.planReview.findUnique({
      where: { planificationId },
    });
    if (existing) {
      let record = existing;

      // If coordinator was reassigned, update the review's owner so actions succeed
      if (existing.coordinatorId !== coordinatorId) {
        record = await prisma.planReview.update({
          where: { id: existing.id },
          data:  { coordinatorId },
        });
      }

      // If plan was admin-rejected but review still shows APPROVED, reset it so coordinator can re-review
      if (record.status === "APPROVED") {
        const plan = await prisma.planification.findUnique({
          where: { id: planificationId },
          select: { status: true },
        });
        if (plan?.status === "ADMIN_REJECTED") {
          await prisma.planReview.update({
            where: { id: record.id },
            data:  { status: "IN_REVIEW", approvedAt: null },
          });
          return {
            ...record,
            sectionStates: normalizeStates(record.sectionStates),
            status: "IN_REVIEW" as ReviewStatus,
          };
        }
      }
      return {
        ...record,
        sectionStates: normalizeStates(record.sectionStates),
        status: record.status as ReviewStatus,
      };
    }

    const [created, coordinator] = await Promise.all([
      prisma.planReview.create({
        data: { planificationId, coordinatorId, sectionStates: {} },
      }),
      prisma.user.findUnique({
        where: { id: coordinatorId },
        select: { name: true },
      }),
    ]);

    // Log audit event for review start
    await auditService.log({
      planificationId,
      actorId:   coordinatorId,
      actorName: coordinator?.name ?? null,
      actorRole: "COORDINATOR",
      eventType: "REVIEW_STARTED",
    });

    return { ...created, sectionStates: {} as SectionStates, status: "IN_REVIEW" as ReviewStatus };
  },

  async updateSectionState(
    reviewId: string,
    coordinatorId: string,
    sectionKey: string,
    approved: boolean,
    comment: string | null,
  ): Promise<void> {
    const review = await prisma.planReview.findUnique({ where: { id: reviewId } });
    if (!review || review.coordinatorId !== coordinatorId) return;

    const states = normalizeStates(review.sectionStates);
    const prev = (states as Record<string, { approved: boolean; comment: string | null }>)[sectionKey];

    (states as Record<string, { approved: boolean; comment: string | null }>)[sectionKey] = { approved, comment };

    await prisma.planReview.update({
      where: { id: reviewId },
      data:  { sectionStates: states as object },
    });

    // Determine audit event type based on what changed
    let eventType: "SECTION_APPROVED" | "SECTION_APPROVAL_REMOVED" | "SECTION_COMMENTED" | null = null;
    if (approved && !prev?.approved) {
      eventType = "SECTION_APPROVED";
    } else if (!approved && prev?.approved) {
      eventType = "SECTION_APPROVAL_REMOVED";
    } else if (comment && comment !== prev?.comment) {
      eventType = "SECTION_COMMENTED";
    }

    if (eventType) {
      const coordinator = await prisma.user.findUnique({
        where: { id: coordinatorId },
        select: { name: true },
      });
      await auditService.log({
        planificationId: review.planificationId,
        actorId:         coordinatorId,
        actorName:       coordinator?.name ?? null,
        actorRole:       "COORDINATOR",
        eventType,
        sectionKey,
        comment:         eventType === "SECTION_COMMENTED" ? (comment ?? null) : null,
      });
    }
  },

  async sendFeedback(reviewId: string, coordinatorId: string): Promise<boolean> {
    const review = await prisma.planReview.findUnique({ where: { id: reviewId } });
    if (!review || review.coordinatorId !== coordinatorId) return false;

    await prisma.$transaction(async (tx) => {
      await tx.planReview.update({
        where: { id: reviewId },
        data:  { status: "FEEDBACK_SENT" },
      });
      await tx.planification.update({
        where: { id: review.planificationId },
        data:  { status: "FEEDBACK_RECEIVED" },
      });
    });

    const coordinator = await prisma.user.findUnique({
      where: { id: coordinatorId },
      select: { name: true },
    });
    await auditService.log({
      planificationId: review.planificationId,
      actorId:         coordinatorId,
      actorName:       coordinator?.name ?? null,
      actorRole:       "COORDINATOR",
      eventType:       "FEEDBACK_SENT",
    });
    return true;
  },

  async approvePlan(reviewId: string, coordinatorId: string): Promise<boolean> {
    const review = await prisma.planReview.findUnique({ where: { id: reviewId } });
    if (!review || review.coordinatorId !== coordinatorId) return false;

    const states = normalizeStates(review.sectionStates);

    // All fixed sections (meta_*, plan_*, aportes_*, dua_*) must be approved
    const sectionsDone = ALL_FIXED_KEYS.every((k) => states[k]?.approved === true);

    // All existing row_N keys must be approved
    const rowKeys = Object.keys(states).filter((k) => /^row_\d+$/.test(k));
    const rowsDone = rowKeys.length > 0 &&
      rowKeys.every((k) => (states as Record<string, { approved: boolean }>)[k]?.approved === true);

    if (!sectionsDone || !rowsDone) return false;

    await prisma.$transaction(async (tx) => {
      await tx.planReview.update({
        where: { id: reviewId },
        data:  { status: "APPROVED", approvedAt: new Date() },
      });
      await tx.planification.update({
        where: { id: review.planificationId },
        data:  { status: "APPROVED" },
      });
    });

    const coordinator = await prisma.user.findUnique({
      where: { id: coordinatorId },
      select: { name: true },
    });
    await auditService.log({
      planificationId: review.planificationId,
      actorId:         coordinatorId,
      actorName:       coordinator?.name ?? null,
      actorRole:       "COORDINATOR",
      eventType:       "PLAN_APPROVED",
    });
    return true;
  },

  async sendForSignature(planificationId: string, coordinatorId: string): Promise<void> {
    const canAccess = await this._coordinatorCanAccessPlan(coordinatorId, planificationId);
    if (!canAccess) return;

    const plan = await prisma.planification.findUnique({
      where: { id: planificationId },
      select: { status: true, metadata: true },
    });
    if (!plan || (plan.status !== "APPROVED" && plan.status !== "ADMIN_REJECTED")) return;

    const rawMeta = (plan.metadata && typeof plan.metadata === "object" && !Array.isArray(plan.metadata))
      ? (plan.metadata as Record<string, unknown>)
      : {};
    const cleanMeta: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rawMeta)) {
      if (k !== "adminRejectionComment" && k !== "adminRejectedAt") {
        cleanMeta[k] = v;
      }
    }

    await prisma.planification.update({
      where: { id: planificationId },
      data:  { status: "PENDING_SIGNATURE", metadata: cleanMeta as object },
    });

    const coordinator = await prisma.user.findUnique({
      where: { id: coordinatorId },
      select: { name: true },
    });
    await auditService.log({
      planificationId,
      actorId:   coordinatorId,
      actorName: coordinator?.name ?? null,
      actorRole: "COORDINATOR",
      eventType: "SENT_FOR_SIGNATURE",
    });
  },

  // ── Catálogo para gestión de asignaciones ────────────────────────────────────

  async getCatalogForAssignments(coordinatorId?: string) {
    // Fetch coordinator's allowed subjects (if any). Empty = no restriction.
    const allowedSubjectIds = coordinatorId
      ? await prisma.coordinatorSubjectAssignment.findMany({
          where:  { coordinatorId },
          select: { subjectId: true },
        }).then((rows) => rows.map((r) => r.subjectId))
      : [];

    const [years, subjects, levels] = await Promise.all([
      prisma.academicYear.findMany({
        orderBy: { yearStart: "desc" },
        select: { id: true, label: true, active: true },
      }),
      prisma.subject.findMany({
        where:   allowedSubjectIds.length > 0 ? { id: { in: allowedSubjectIds } } : undefined,
        orderBy: { name: "asc" },
        select:  { id: true, name: true, code: true },
      }),
      prisma.level.findMany({
        orderBy: { orderIndex: "asc" },
        select: { id: true, name: true, code: true, track: true },
      }),
    ]);
    return { years, subjects, levels };
  },

  // ── Helper de acceso del coordinador ────────────────────────────────────────

  async _coordinatorCanAccessPlan(coordinatorId: string, planificationId: string): Promise<boolean> {
    // Check 1: direct assignment (coordinatorId on TeacherAssignment)
    const plan = await prisma.planification.findUnique({
      where: { id: planificationId },
      select: { subjectId: true, levelId: true, academicYearId: true },
    });
    if (!plan) return false;

    const directAssignment = await prisma.teacherAssignment.findFirst({
      where: {
        coordinatorId,
        subjectId:      plan.subjectId,
        levelId:        plan.levelId,
        academicYearId: plan.academicYearId,
        active:         true,
      },
    });
    if (directAssignment) return true;

    // Check 2: legacy CoordinatorAssignment (coordinator→teacher)
    const legacyLink = await prisma.planificationTeacher.findFirst({
      where: {
        planificationId,
        teacher: {
          coordinatorAssignmentsAsTeacher: { some: { coordinatorId } },
        },
      },
    });
    return !!legacyLink;
  },

  // ── Vista del plan para el coordinador ──────────────────────────────────────

  async getPlanForReview(planificationId: string, coordinatorId: string) {
    const canAccess = await this._coordinatorCanAccessPlan(coordinatorId, planificationId);
    if (!canAccess) return null;

    const plan = await prisma.planification.findUnique({
      where: { id: planificationId },
      include: {
        rows:         { orderBy: { rowIndex: "asc" } },
        teachers:     { include: { teacher: { select: { name: true } } } },
        subject:      true,
        level:        true,
        period:       true,
        academicYear: true,
        review:       true,
      },
    });
    if (!plan) return null;

    const allNames = plan.teachers.map((t) => t.teacher.name ?? "—");
    const teacherNames = allNames.length <= 2
      ? allNames.join(", ")
      : `${allNames[0]} + ${allNames.length - 1} más`;

    return {
      status:       plan.status,
      teacherName:  teacherNames,
      subjectName:  plan.subject.name,
      levelName:    plan.level.name,
      levelCode:    plan.level.code,
      levelTrack:   plan.level.track,
      periodName:   plan.period.name,
      yearLabel:    plan.academicYear.label,
      metadata:     normalizePlanMetadata(plan.metadata),
      createdAt:    plan.createdAt.toISOString(),
      rows: plan.rows.map((r) => ({
        id:       r.id,
        rowIndex: r.rowIndex,
        data:     normalizePumRowData(r.data),
      })),
    };
  },

  // ── Limpieza de feedback cuando el docente corrige un campo ─────────────────

  async clearSectionFeedback(planificationId: string, keys: string[]): Promise<void> {
    if (!keys.length) return;
    const review = await prisma.planReview.findUnique({ where: { planificationId } });
    if (!review) return;
    const states = normalizeStates(review.sectionStates);
    for (const key of keys) {
      delete (states as Record<string, unknown>)[key];
    }
    await prisma.planReview.update({
      where: { id: review.id },
      data:  { sectionStates: states as object },
    });
  },

  // ── Datos de revisión para docentes ─────────────────────────────────────────

  async getReviewForTeacher(planificationId: string) {
    const review = await prisma.planReview.findUnique({
      where: { planificationId },
    });
    if (!review) return null;
    return {
      id:            review.id,
      status:        review.status as ReviewStatus,
      sectionStates: normalizeStates(review.sectionStates),
    };
  },
};
