import { prisma } from "@/lib/prisma/client";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";
import { auditService } from "@/modules/audit/audit.service";
import { filterActiveTeacherLinks } from "@/modules/planification/planification.service";
import type { CorrectPlanStatusInput, ReassignCoordinatorInput } from "./superadmin.schema";

export interface PlanListItem {
  id:            string;
  status:        string;
  teacherName:   string | null;
  teacherEmail:  string;
  subjectName:   string;
  levelName:     string;
  yearLabel:     string;
  periodName:    string;
  periodNumber:  number;
  coordinatorName: string | null;
  coordinatorId:   string | null;
  updatedAt:     string;
}

export interface PlanDetail {
  id:              string;
  status:          string;
  teacherName:     string | null;
  teacherEmail:    string;
  subjectName:     string;
  levelName:       string;
  yearLabel:       string;
  periodName:      string;
  coordinatorName:  string | null;
  coordinatorEmail: string | null;
  coordinatorId:    string | null;
  reviewId:         string | null;
  editDeadlineAt:   string | null;
  createdAt:        string;
  updatedAt:        string;
}

export type LinkedPersonRole = "EDITOR" | "VISUALIZA" | "COORDINADOR_ASIGNADO";

export interface LinkedPerson {
  userId:              string;
  name:                string | null;
  email:               string;
  roles:               LinkedPersonRole[];
  // false = su TeacherAssignment para esta materia/nivel/año ya no está activa
  // (vínculo huérfano — candidato a corrección). No aplica al coordinador.
  hasActiveAssignment: boolean;
  // false para el coordinador asignado: su remoción usa la herramienta de
  // "Reasignar coordinador" que ya existe, no este botón.
  removable:           boolean;
}

export interface PlanFilters {
  search?:   string;
  status?:   string;
  yearId?:   string;
  periodId?: string;
  page?:     number;
  pageSize?: number;
}

const PAGE_SIZE = 20;

interface CoordinatorRef { id: string; name: string | null; email: string }

/**
 * Resuelve el "coordinador por defecto" de un lote de PUM a partir de la
 * asignación de materia (no de PlanReview), para no depender de que el
 * coordinador ya haya abierto ese PUM puntual a revisar.
 *
 * Un coordinador queda vinculado a una materia+nivel+año en cuanto asigna
 * a un docente — es coordinador de los 3 trimestres de ese combo, no solo
 * de aquellos cuya revisión ya inició. Antes de este fix, superadmin-plan
 * .service.ts sacaba el coordinador ÚNICAMENTE de PlanReview, que solo
 * existe para el trimestre que el coordinador ya abrió — por eso un PUM
 * de un trimestre aún no revisado aparecía como "Sin asignar".
 *
 * Mismo patrón de dos fuentes que coordinator.service.ts#getFinalizedPlans:
 *   1. TeacherAssignment.coordinatorId (modelo nuevo, por materia+nivel+año).
 *   2. CoordinatorAssignment (legado, por docente) + CoordinatorSubjectAssignment
 *      para no filtrar materias que ese coordinador no tiene permitidas.
 */
async function resolveDefaultCoordinators(
  plans: Array<{
    id: string;
    subjectId: string;
    levelId: string;
    academicYearId: string;
    teachers: Array<{ teacherId: string; isEditor: boolean }>;
  }>,
): Promise<Map<string, CoordinatorRef>> {
  const result = new Map<string, CoordinatorRef>();
  const allTeacherIds = [...new Set(plans.flatMap((p) => p.teachers.map((t) => t.teacherId)))];
  if (allTeacherIds.length === 0) return result;
  const allSubjectIds = [...new Set(plans.map((p) => p.subjectId))];

  const [direct, legacyLinks, subjectScope] = await Promise.all([
    prisma.teacherAssignment.findMany({
      where: { teacherId: { in: allTeacherIds }, active: true, coordinatorId: { not: null } },
      select: {
        teacherId: true, subjectId: true, levelId: true, academicYearId: true,
        coordinator: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.coordinatorAssignment.findMany({
      where:  { teacherId: { in: allTeacherIds } },
      select: { teacherId: true, coordinator: { select: { id: true, name: true, email: true } } },
    }),
    prisma.coordinatorSubjectAssignment.findMany({
      where:  { subjectId: { in: allSubjectIds } },
      select: { coordinatorId: true, subjectId: true },
    }),
  ]);

  const directKey = (s: string, l: string, y: string, t: string) => `${s}|${l}|${y}|${t}`;
  const directMap = new Map(direct.map((d) => [directKey(d.subjectId, d.levelId, d.academicYearId, d.teacherId), d.coordinator]));
  const legacyByTeacher = new Map(legacyLinks.map((l) => [l.teacherId, l.coordinator]));
  const allowedPairs = new Set(subjectScope.map((s) => `${s.coordinatorId}|${s.subjectId}`));

  for (const plan of plans) {
    const editor = plan.teachers.find((t) => t.isEditor);
    const orderedTeachers = editor ? [editor, ...plan.teachers.filter((t) => t !== editor)] : plan.teachers;

    let found: CoordinatorRef | null = null;
    for (const t of orderedTeachers) {
      const d = directMap.get(directKey(plan.subjectId, plan.levelId, plan.academicYearId, t.teacherId));
      if (d) { found = d; break; }
    }
    if (!found) {
      for (const t of orderedTeachers) {
        const legacy = legacyByTeacher.get(t.teacherId);
        if (legacy && allowedPairs.has(`${legacy.id}|${plan.subjectId}`)) { found = legacy; break; }
      }
    }
    if (found) result.set(plan.id, found);
  }

  return result;
}

export const superAdminPlanService = {
  async getAllPlans(
    filters: PlanFilters = {},
  ): Promise<{ plans: PlanListItem[]; total: number; pages: number }> {
    const page     = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? PAGE_SIZE;
    const skip     = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (filters.status)   where.status        = filters.status;
    if (filters.yearId)   where.academicYearId = filters.yearId;
    if (filters.periodId) where.periodId       = filters.periodId;
    if (filters.search) {
      const s = filters.search.trim();
      where.OR = [
        { teachers: { some: { teacher: { name:  { contains: s, mode: "insensitive" } } } } },
        { teachers: { some: { teacher: { email: { contains: s, mode: "insensitive" } } } } },
        { subject:  { name: { contains: s, mode: "insensitive" } } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.planification.count({ where }),
      prisma.planification.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ period: { number: "asc" } }, { updatedAt: "desc" }],
        include: {
          teachers:     { include: { teacher: { select: { name: true, email: true } } } },
          subject:      { select: { name: true } },
          level:        { select: { name: true } },
          academicYear: { select: { label: true } },
          period:       { select: { name: true, number: true } },
          review:       { select: { coordinatorId: true, coordinator: { select: { name: true } } } },
        },
      }),
    ]);

    // Oculta vínculos huérfanos (docentes removidos cuya asignación ya no
    // está activa) en un solo query batch; los PUM ya SIGNED no se filtran
    // (registro histórico permanente). Ver planification.service.ts.
    const allTeacherIds = [...new Set(rows.flatMap((r) => r.teachers.map((t) => t.teacherId)))];
    const activeAssignments = allTeacherIds.length > 0
      ? await prisma.teacherAssignment.findMany({
          where: { teacherId: { in: allTeacherIds }, active: true },
          select: { teacherId: true, subjectId: true, levelId: true, academicYearId: true },
        })
      : [];
    const activeKey = (s: string, l: string, y: string, t: string) => `${s}|${l}|${y}|${t}`;
    const activeSet = new Set(activeAssignments.map((a) => activeKey(a.subjectId, a.levelId, a.academicYearId, a.teacherId)));

    // Coordinador por defecto (vía asignación de materia) para los PUM que
    // aún no tienen PlanReview — ver resolveDefaultCoordinators.
    const defaultCoordinators = await resolveDefaultCoordinators(
      rows.map((r) => ({
        id: r.id, subjectId: r.subjectId, levelId: r.levelId, academicYearId: r.academicYearId,
        teachers: r.teachers.map((t) => ({ teacherId: t.teacherId, isEditor: t.isEditor })),
      })),
    );

    return {
      total,
      pages: Math.ceil(total / pageSize),
      plans: rows.map((r) => {
        const visibleTeachers = r.status === "SIGNED"
          ? r.teachers
          : r.teachers.filter((t) => activeSet.has(activeKey(r.subjectId, r.levelId, r.academicYearId, t.teacherId)));
        const editor = (visibleTeachers.find((t) => t.isEditor) ?? visibleTeachers[0])?.teacher;
        const defaultCoord = defaultCoordinators.get(r.id) ?? null;
        return {
          id:              r.id,
          status:          r.status,
          teacherName:     editor?.name ?? null,
          teacherEmail:    editor?.email ?? "",
          subjectName:     r.subject.name,
          levelName:       r.level.name,
          yearLabel:       r.academicYear.label,
          periodName:      r.period.name,
          periodNumber:    r.period.number,
          coordinatorName: r.review?.coordinator.name ?? defaultCoord?.name ?? null,
          coordinatorId:   r.review?.coordinatorId ?? defaultCoord?.id ?? null,
          updatedAt:       r.updatedAt.toISOString(),
        };
      }),
    };
  },

  async getPlanDetail(planId: string): Promise<PlanDetail> {
    const p = await prisma.planification.findUnique({
      where: { id: planId },
      include: {
        teachers:     { include: { teacher: { select: { name: true, email: true } } } },
        subject:      { select: { name: true } },
        level:        { select: { name: true } },
        academicYear: { select: { label: true } },
        period:       { select: { name: true } },
        review: {
          select: {
            id: true,
            coordinatorId: true,
            coordinator: { select: { name: true, email: true } },
          },
        },
      },
    });
    if (!p) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "PUM no encontrado");
    const visibleTeachers = await filterActiveTeacherLinks(p, p.teachers);
    const editor = (visibleTeachers.find((t) => t.isEditor) ?? visibleTeachers[0])?.teacher;

    // Coordinador por defecto (vía asignación de materia) si aún no hay
    // PlanReview — ver resolveDefaultCoordinators.
    const defaultCoordinators = await resolveDefaultCoordinators([{
      id: p.id, subjectId: p.subjectId, levelId: p.levelId, academicYearId: p.academicYearId,
      teachers: p.teachers.map((t) => ({ teacherId: t.teacherId, isEditor: t.isEditor })),
    }]);
    const defaultCoord = defaultCoordinators.get(p.id) ?? null;

    return {
      id:               p.id,
      status:           p.status,
      teacherName:      editor?.name ?? null,
      teacherEmail:     editor?.email ?? "",
      subjectName:      p.subject.name,
      levelName:        p.level.name,
      yearLabel:        p.academicYear.label,
      periodName:       p.period.name,
      coordinatorName:  p.review?.coordinator.name ?? defaultCoord?.name ?? null,
      coordinatorEmail: p.review?.coordinator.email ?? defaultCoord?.email ?? null,
      coordinatorId:    p.review?.coordinatorId ?? defaultCoord?.id ?? null,
      reviewId:         p.review?.id ?? null,
      editDeadlineAt:   p.editDeadlineAt?.toISOString() ?? null,
      createdAt:        p.createdAt.toISOString(),
      updatedAt:        p.updatedAt.toISOString(),
    };
  },

  async correctPlanStatus(
    actorId: string,
    actorName: string,
    planId: string,
    input: CorrectPlanStatusInput,
  ): Promise<void> {
    const plan = await prisma.planification.findUnique({
      where: { id: planId },
      select: { status: true },
    });
    if (!plan) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "PUM no encontrado");

    await prisma.planification.update({
      where: { id: planId },
      data:  { status: input.newStatus },
    });

    await auditService.log({
      planificationId: planId,
      actorId,
      actorName,
      actorRole: "SUPERADMIN",
      eventType: "STATE_CORRECTED",
      comment:   `De "${plan.status}" → "${input.newStatus}". Motivo: ${input.reason}`,
    });
  },

  async clearDeadline(
    actorId: string,
    actorName: string,
    planId: string,
  ): Promise<void> {
    const plan = await prisma.planification.findUnique({
      where: { id: planId },
      select: { editDeadlineAt: true },
    });
    if (!plan) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "PUM no encontrado");
    if (!plan.editDeadlineAt) {
      throw new AppError(ErrorCode.VAL_INVALID_INPUT, "Este PUM no tiene una fecha límite asignada");
    }

    await prisma.planification.update({
      where: { id: planId },
      data:  { editDeadlineAt: null },
    });

    await auditService.log({
      planificationId: planId,
      actorId,
      actorName,
      actorRole: "SUPERADMIN",
      eventType: "DEADLINE_CLEARED",
      comment:   `Fecha límite (${plan.editDeadlineAt.toLocaleDateString("es-EC")}) retirada para habilitar edición del docente encargado`,
    });
  },

  async reassignCoordinator(
    actorId: string,
    actorName: string,
    planId: string,
    input: ReassignCoordinatorInput,
  ): Promise<void> {
    const [plan, coordinator] = await Promise.all([
      prisma.planification.findUnique({
        where: { id: planId },
        include: {
          review: {
            select: {
              id: true,
              coordinatorId: true,
              coordinator: { select: { name: true } },
            },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: input.coordinatorId },
        select: { id: true, name: true, role: true },
      }),
    ]);

    if (!plan)        throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "PUM no encontrado");
    if (!coordinator) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "Coordinador no encontrado");
    if (coordinator.role !== "COORDINATOR") {
      throw new AppError(ErrorCode.VAL_INVALID_INPUT, "El usuario seleccionado no es coordinador");
    }

    const prevName = plan.review?.coordinator.name ?? "Sin asignar";

    if (plan.review) {
      await prisma.planReview.update({
        where: { id: plan.review.id },
        data:  { coordinatorId: input.coordinatorId },
      });
    } else {
      await prisma.planReview.create({
        data: {
          planificationId: planId,
          coordinatorId:   input.coordinatorId,
          status:          "IN_REVIEW",
        },
      });
    }

    await auditService.log({
      planificationId: planId,
      actorId,
      actorName,
      actorRole: "SUPERADMIN",
      eventType: "COORDINATOR_REASSIGNED",
      comment:   `De "${prevName}" → "${coordinator.name ?? input.coordinatorId}"`,
    });
  },

  async getAvailableCoordinators(): Promise<
    Array<{ id: string; name: string | null; email: string; area: string | null }>
  > {
    const coordinators = await prisma.user.findMany({
      where:   { role: "COORDINATOR", isActive: true },
      orderBy: { name: "asc" },
      select:  { id: true, name: true, email: true, coordinatorArea: true },
    });
    return coordinators.map((c) => ({
      id:    c.id,
      name:  c.name,
      email: c.email,
      area:  c.coordinatorArea,
    }));
  },

  async getYears(): Promise<Array<{ id: string; label: string }>> {
    return prisma.academicYear.findMany({
      orderBy: { yearStart: "desc" },
      select:  { id: true, label: true },
    });
  },

  async getPeriodsForYear(yearId: string): Promise<Array<{ id: string; name: string; number: number }>> {
    return prisma.period.findMany({
      where:   { academicYearId: yearId },
      orderBy: { number: "asc" },
      select:  { id: true, name: true, number: true },
    });
  },

  /**
   * Todas las personas vinculadas a un PUM, sin filtrar vínculos huérfanos —
   * a diferencia del resto del sistema, esta vista es exactamente para que
   * el SuperAdmin pueda VER y corregir esos vínculos, incluidos los inválidos.
   */
  async getLinkedPeople(planId: string): Promise<LinkedPerson[]> {
    const plan = await prisma.planification.findUnique({
      where:  { id: planId },
      select: {
        subjectId: true, levelId: true, academicYearId: true,
        teachers: {
          select: {
            teacherId: true,
            isEditor:  true,
            teacher:   { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!plan) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "PUM no encontrado");

    const review = await prisma.planReview.findUnique({
      where:  { planificationId: planId },
      select: { coordinatorId: true, coordinator: { select: { id: true, name: true, email: true } } },
    });

    const teacherIds = plan.teachers.map((t) => t.teacherId);
    const activeAssignments = teacherIds.length > 0
      ? await prisma.teacherAssignment.findMany({
          where: {
            teacherId:      { in: teacherIds },
            subjectId:      plan.subjectId,
            levelId:        plan.levelId,
            academicYearId: plan.academicYearId,
            active:         true,
          },
          select: { teacherId: true },
        })
      : [];
    const activeIds = new Set(activeAssignments.map((a) => a.teacherId));

    const people = new Map<string, LinkedPerson>();

    for (const t of plan.teachers) {
      people.set(t.teacherId, {
        userId:              t.teacherId,
        name:                t.teacher.name,
        email:               t.teacher.email,
        roles:               [t.isEditor ? "EDITOR" : "VISUALIZA"],
        hasActiveAssignment: activeIds.has(t.teacherId),
        removable:           true,
      });
    }

    if (review?.coordinator) {
      const existing = people.get(review.coordinatorId);
      if (existing) {
        existing.roles.push("COORDINADOR_ASIGNADO");
      } else {
        people.set(review.coordinatorId, {
          userId:              review.coordinatorId,
          name:                review.coordinator.name,
          email:               review.coordinator.email,
          roles:               ["COORDINADOR_ASIGNADO"],
          hasActiveAssignment: true,
          removable:           false,
        });
      }
    }

    return Array.from(people.values());
  },

  /**
   * Quita manualmente el vínculo de un docente con un PUM (borra la fila
   * PlanificationTeacher). A diferencia de unassignTeacherFromCombo, esta
   * acción SÍ puede aplicarse a PUM ya SIGNED — es la herramienta explícita
   * para corregir errores de datos puntuales en el registro histórico,
   * nunca automática.
   */
  async removeTeacherLink(
    planId: string,
    teacherId: string,
    actor: { actorId: string; actorName: string | null },
  ): Promise<void> {
    const [plan, link] = await Promise.all([
      prisma.planification.findUnique({ where: { id: planId }, select: { status: true } }),
      prisma.planificationTeacher.findUnique({
        where:  { planificationId_teacherId: { planificationId: planId, teacherId } },
        select: { isEditor: true, teacher: { select: { name: true, email: true } } },
      }),
    ]);
    if (!plan) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "PUM no encontrado");
    if (!link) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "Este docente no está vinculado a este PUM");

    await prisma.planificationTeacher.delete({
      where: { planificationId_teacherId: { planificationId: planId, teacherId } },
    });

    const teacherLabel = link.teacher.name ?? link.teacher.email;
    await auditService.log({
      planificationId: planId,
      actorId:   actor.actorId,
      actorName: actor.actorName,
      actorRole: "SUPERADMIN",
      eventType: "TEACHER_LINK_REMOVED_MANUAL",
      comment:   `${teacherLabel} (${link.isEditor ? "editor" : "visualiza"}) desvinculado manualmente del PUM${plan.status === "SIGNED" ? " ya firmado" : ""}`,
    });
  },

  /**
   * Designa manualmente al docente editor de un PUM puntual (y pone a los
   * demás docentes vinculados como "Visualiza"). Pensado para que el
   * SuperAdmin pueda corregir el Rol PUM sin necesidad de entrar a la
   * cuenta del coordinador cuando este no usa bien la herramienta.
   */
  async setEditor(
    planId: string,
    teacherId: string,
    actor: { actorId: string; actorName: string | null },
  ): Promise<void> {
    const [plan, link] = await Promise.all([
      prisma.planification.findUnique({ where: { id: planId }, select: { id: true } }),
      prisma.planificationTeacher.findUnique({
        where:  { planificationId_teacherId: { planificationId: planId, teacherId } },
        select: { isEditor: true, teacher: { select: { name: true, email: true } } },
      }),
    ]);
    if (!plan) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "PUM no encontrado");
    if (!link) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "Este docente no está vinculado a este PUM");
    if (link.isEditor) return; // ya es editor, nada que hacer

    await prisma.$transaction([
      prisma.planificationTeacher.updateMany({
        where: { planificationId: planId, teacherId: { not: teacherId } },
        data:  { isEditor: false },
      }),
      prisma.planificationTeacher.update({
        where: { planificationId_teacherId: { planificationId: planId, teacherId } },
        data:  { isEditor: true },
      }),
    ]);

    const teacherLabel = link.teacher.name ?? link.teacher.email;
    await auditService.log({
      planificationId: planId,
      actorId:   actor.actorId,
      actorName: actor.actorName,
      actorRole: "SUPERADMIN",
      eventType: "EDITOR_REASSIGNED_MANUAL",
      comment:   `${teacherLabel} designado editor manualmente por SuperAdmin`,
    });
  },
};
