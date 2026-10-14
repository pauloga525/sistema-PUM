import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";
import { userAuditService } from "@/modules/audit/user-audit.service";
import { assertIdentityAvailable, issueTempPassword, normalizeEmail, resetToTempPassword } from "@/modules/users/user-accounts";
import { planificationService } from "@/modules/planification/planification.service";
import { APPROVED_OR_LATER_STATUSES, IN_REVIEW_CYCLE_STATUSES } from "@/modules/planification/planification.domain";

export type TeacherSortOption = "name_asc" | "name_desc" | "created_asc" | "created_desc" | "assign_asc" | "assign_desc";

export interface TeacherFilters {
  search?:  string;
  status?:  "all" | "active" | "pending";
  sort?:    TeacherSortOption;
  page?:    number;
}

const TEACHER_PAGE_SIZE = 30;

/** Cuentas de docentes y coordinadores gestionadas por el Admin. */
export class AdminUsersService {
  async getTeachers(filters: TeacherFilters = {}) {
    const { search, status, sort = "name_asc", page = 1 } = filters;

    const where: Prisma.UserWhereInput = {
      role: "TEACHER",
      isActive: true,
      ...(status === "active"  ? { forcePasswordChange: false } : {}),
      ...(status === "pending" ? { forcePasswordChange: true  } : {}),
      ...(search ? {
        OR: [
          { name:   { contains: search, mode: "insensitive" } },
          { email:  { contains: search, mode: "insensitive" } },
          { cedula: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    };

    let orderBy: Prisma.UserOrderByWithRelationInput = { name: "asc" };
    if      (sort === "name_desc")    orderBy = { name: "desc" };
    else if (sort === "created_asc")  orderBy = { createdAt: "asc" };
    else if (sort === "created_desc") orderBy = { createdAt: "desc" };
    else if (sort === "assign_asc")   orderBy = { assignments: { _count: "asc" } };
    else if (sort === "assign_desc")  orderBy = { assignments: { _count: "desc" } };

    const skip = (page - 1) * TEACHER_PAGE_SIZE;

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id:                  true,
          name:                true,
          email:               true,
          cedula:              true,
          forcePasswordChange: true,
          createdAt:           true,
          _count: { select: { assignments: { where: { active: true } } } },
        },
        orderBy,
        skip,
        take: TEACHER_PAGE_SIZE,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total, totalPages: Math.ceil(total / TEACHER_PAGE_SIZE) };
  }

  async createTeacher(data: {
    name: string;
    email: string;
    cedula: string;
    academicYearId: string;
    assignments: Array<{ subjectId: string; levelId: string; periodId?: string; areaEstudio?: string }>;
  }) {
    if (!data.email.toLowerCase().endsWith("@uets.edu.ec")) {
      throw new AppError(ErrorCode.VAL_INVALID_INPUT, "El correo debe ser institucional (@uets.edu.ec)");
    }
    if (!/^\d{10}$/.test(data.cedula)) {
      throw new AppError(ErrorCode.VAL_INVALID_INPUT, "La cédula debe tener exactamente 10 dígitos");
    }
    if (!data.name.trim()) {
      throw new AppError(ErrorCode.VAL_MISSING_FIELD, "El nombre completo es obligatorio");
    }

    await assertIdentityAvailable(data.email, data.cedula);
    const { tempPassword, data: credentials } = await issueTempPassword();

    const user = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name:   data.name.trim(),
          email:  normalizeEmail(data.email),
          cedula: data.cedula,
          role:   "TEACHER",
          ...credentials,
        },
      });

      if (data.assignments.length > 0 && data.academicYearId) {
        await tx.teacherAssignment.createMany({
          data: data.assignments.map((a) => ({
            teacherId:      user.id,
            subjectId:      a.subjectId,
            levelId:        a.levelId,
            academicYearId: data.academicYearId!,
            periodId:       a.periodId || null,
            active:         true,
          })),
        });

        // Update areaEstudio for subjects that have it (typically few rows)
        const updates = data.assignments.filter((a) => a.areaEstudio?.trim());
        for (const a of updates) {
          await tx.subject.update({
            where: { id: a.subjectId },
            data:  { areaEstudio: a.areaEstudio!.trim() },
          });
        }
      }

      return user;
    });

    return { user, tempPassword };
  }

  async resetTeacherPassword(teacherId: string, actorId: string) {
    const user = await prisma.user.findUnique({
      where:  { id: teacherId },
      select: { name: true, email: true, role: true },
    });
    if (!user) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "Docente no encontrado");
    // Solo docentes: sin esto un ADMIN podría resetear (y tomar) la cuenta de un SUPERADMIN
    if (user.role !== "TEACHER") {
      await userAuditService.log({
        eventType:   "PRIVILEGE_ESCALATION_BLOCKED",
        result:      "FAILURE",
        actorId,
        actorRole:   "ADMIN",
        targetId:    teacherId,
        targetEmail: user.email,
        targetRole:  user.role,
        metadata:    { action: "resetTeacherPassword" },
      });
      throw new AppError(ErrorCode.AUTH_UNAUTHORIZED, "Solo se puede restablecer la contraseña de docentes");
    }
    const { tempPassword } = await resetToTempPassword(teacherId);
    await userAuditService.log({
      eventType:   "USER_PASSWORD_RESET",
      actorId,
      actorRole:   "ADMIN",
      targetId:    teacherId,
      targetEmail: user.email,
      targetRole:  user.role,
    });
    return { tempPassword };
  }

  /**
   * "Eliminar" un docente lo desactiva: borrarlo arrastraba en cascada sus
   * vínculos con PUMs ya firmados (registro institucional). Se le quitan las
   * asignaciones activas con el mismo flujo que una remoción manual (promueve
   * a otro editor o bloquea si es el único editor de un PUM en curso).
   * Un SuperAdmin puede reactivar la cuenta.
   */
  async deleteTeacher(teacherId: string, actor: { actorId: string; actorName: string | null }) {
    const user = await prisma.user.findUnique({ where: { id: teacherId }, select: { id: true, role: true, email: true } });
    if (!user) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "Docente no encontrado");
    if (user.role !== "TEACHER") throw new AppError(ErrorCode.AUTH_UNAUTHORIZED, "Solo se pueden eliminar cuentas de docentes");

    const assignments = await prisma.teacherAssignment.findMany({
      where:  { teacherId, active: true },
      select: { id: true },
    });
    for (const a of assignments) {
      const result = await planificationService.unassignTeacherFromCombo({
        assignmentId: a.id,
        actorId:      actor.actorId,
        actorName:    actor.actorName,
        actorRole:    "ADMIN",
      });
      if (!result.ok) throw new AppError(ErrorCode.VAL_INVALID_INPUT, result.error);
    }

    await prisma.user.update({ where: { id: teacherId }, data: { isActive: false } });
    await userAuditService.log({
      eventType:   "USER_DEACTIVATED",
      actorId:     actor.actorId,
      actorRole:   "ADMIN",
      targetId:    teacherId,
      targetEmail: user.email,
      targetRole:  user.role,
    });
  }

  async getSubjectsForAdminPanel() {
    return prisma.subject.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    });
  }

  async getCoordinators(yearId?: string) {
    const coordinators = await prisma.user.findMany({
      where: { role: "COORDINATOR", isActive: true },
      include: {
        coordinatorAssignmentsAsCoordinator: {
          include: {
            teacher: {
              select: {
                id: true, name: true, email: true,
                assignments: {
                  where: { active: true },
                  select: { subjectId: true, levelId: true },
                },
              },
            },
          },
          orderBy: { teacher: { name: "asc" } },
        },
        coordinatorSubjectLinks: { select: { subjectId: true } },
      },
      orderBy: { name: "asc" },
    });

    const allTeacherIds = coordinators.flatMap((c) =>
      c.coordinatorAssignmentsAsCoordinator.map((ca) => ca.teacherId)
    );
    const yearFilter = yearId ? { academicYearId: yearId } : {};

    const [planLinks, allPlansWithReview] = allTeacherIds.length > 0
      ? await Promise.all([
          prisma.planificationTeacher.findMany({
            where: {
              teacherId: { in: allTeacherIds },
              planification: { ...yearFilter, status: { in: [...IN_REVIEW_CYCLE_STATUSES] } },
            },
            select: { planificationId: true, teacherId: true },
          }),
          prisma.planification.findMany({
            where: {
              ...yearFilter,
              status: { in: [...IN_REVIEW_CYCLE_STATUSES] },
              teachers: { some: { teacherId: { in: allTeacherIds } } },
            },
            select: { id: true, status: true },
          }),
        ])
      : [[], []];

    // Antes solo se miraban PUM en FINALIZED y luego se exigía review APPROVED,
    // así que "aprobados" era casi siempre 0
    const planIdToStatus = new Map(allPlansWithReview.map((p) => [p.id, p.status]));
    const planTeacherIndex = new Map<string, Set<string>>();
    for (const link of planLinks) {
      if (!planTeacherIndex.has(link.teacherId)) planTeacherIndex.set(link.teacherId, new Set());
      planTeacherIndex.get(link.teacherId)!.add(link.planificationId);
    }

    return coordinators.map((c) => {
      const teacherIds = c.coordinatorAssignmentsAsCoordinator.map((ca) => ca.teacherId);
      const planIds = new Set<string>();
      for (const tid of teacherIds) {
        planTeacherIndex.get(tid)?.forEach((pid) => planIds.add(pid));
      }
      const totalPlans    = planIds.size;
      const approvedPlans = [...planIds].filter((pid) =>
        (APPROVED_OR_LATER_STATUSES as readonly string[]).includes(planIdToStatus.get(pid) ?? "")
      ).length;

      const teachers = c.coordinatorAssignmentsAsCoordinator.map((ca) => ({
        assignmentId:  ca.id,
        teacherId:     ca.teacher.id,
        teacherName:   ca.teacher.name,
        teacherEmail:  ca.teacher.email,
        subjectCount:  new Set(ca.teacher.assignments.map((a) => `${a.subjectId}-${a.levelId}`)).size,
      }));

      return {
        id:              c.id,
        name:            c.name,
        email:           c.email,
        cedula:          c.cedula,
        coordinatorArea: c.coordinatorArea,
        createdAt:       c.createdAt,
        teachers,
        progress:        { total: totalPlans, approved: approvedPlans },
        assignedSubjectIds: c.coordinatorSubjectLinks.map((s) => s.subjectId),
      };
    });
  }

  async getTeachersForCoordinatorPanel() {
    return prisma.user.findMany({
      where: { role: "TEACHER", isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  }

  async createCoordinator(data: {
    name:            string;
    email:           string;
    cedula:          string;
    coordinatorArea: string;
    teacherIds:      string[];
  }) {
    if (!data.email.toLowerCase().endsWith("@uets.edu.ec")) {
      throw new AppError(ErrorCode.VAL_INVALID_INPUT, "El correo debe ser institucional (@uets.edu.ec)");
    }
    if (!/^\d{10}$/.test(data.cedula)) {
      throw new AppError(ErrorCode.VAL_INVALID_INPUT, "La cédula debe tener exactamente 10 dígitos");
    }
    if (!data.name.trim()) {
      throw new AppError(ErrorCode.VAL_MISSING_FIELD, "El nombre completo es obligatorio");
    }

    await assertIdentityAvailable(data.email, data.cedula);
    const { tempPassword, data: credentials } = await issueTempPassword();

    const user = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name:            data.name.trim(),
          email:           normalizeEmail(data.email),
          cedula:          data.cedula,
          role:            "COORDINATOR",
          coordinatorArea: data.coordinatorArea.trim() || null,
          ...credentials,
        },
      });

      if (data.teacherIds.length > 0) {
        await tx.coordinatorAssignment.createMany({
          data: data.teacherIds.map((teacherId) => ({
            coordinatorId: user.id,
            teacherId,
          })),
        });
      }

      return user;
    });

    return { user, tempPassword };
  }

  async promoteTeacherToCoordinator(data: {
    teacherId:       string;
    coordinatorArea: string;
    teacherIds:      string[];
    actorId:         string;
  }) {
    if (!data.teacherId) {
      throw new AppError(ErrorCode.VAL_MISSING_FIELD, "Debes seleccionar un docente");
    }
    // Solo docentes: sin esto se podía degradar a un ADMIN/SUPERADMIN a coordinador
    const target = await prisma.user.findUnique({
      where:  { id: data.teacherId },
      select: { email: true, role: true },
    });
    if (!target) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "Docente no encontrado");
    if (target.role !== "TEACHER") {
      await userAuditService.log({
        eventType:   "PRIVILEGE_ESCALATION_BLOCKED",
        result:      "FAILURE",
        actorId:     data.actorId,
        actorRole:   "ADMIN",
        targetId:    data.teacherId,
        targetEmail: target.email,
        targetRole:  target.role,
        metadata:    { action: "promoteTeacherToCoordinator" },
      });
      throw new AppError(ErrorCode.AUTH_UNAUTHORIZED, "Solo se puede promover a docentes");
    }

    const promoted = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: data.teacherId },
        data: {
          role:            "COORDINATOR",
          coordinatorArea: data.coordinatorArea.trim() || null,
        },
      });
      const teacherIdsToLink = data.teacherIds.filter((tid) => tid !== data.teacherId);
      if (teacherIdsToLink.length > 0) {
        await tx.coordinatorAssignment.createMany({
          data: teacherIdsToLink.map((teacherId) => ({
            coordinatorId: user.id,
            teacherId,
          })),
          skipDuplicates: true,
        });
      }
      return user;
    });

    await userAuditService.log({
      eventType:   "USER_ROLE_CHANGED",
      actorId:     data.actorId,
      actorRole:   "ADMIN",
      targetId:    promoted.id,
      targetEmail: promoted.email,
      targetRole:  promoted.role,
      metadata:    { from: target.role, to: "COORDINATOR" },
    });
    return promoted;
  }

  async addCoordinatorTeacher(coordinatorId: string, teacherId: string) {
    const user = await prisma.user.findUnique({ where: { id: coordinatorId }, select: { role: true } });
    if (!user || user.role !== "COORDINATOR") {
      throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "Coordinador no encontrado");
    }
    await prisma.coordinatorAssignment.upsert({
      where:  { coordinatorId_teacherId: { coordinatorId, teacherId } },
      create: { coordinatorId, teacherId },
      update: {},
    });
  }

  async removeCoordinatorAssignment(assignmentId: string) {
    await prisma.coordinatorAssignment.delete({ where: { id: assignmentId } });
  }

  /**
   * "Eliminar" un coordinador lo desactiva: sus revisiones (PlanReview) y la
   * auditoría de los PUM que revisó se conservan. Otro coordinador puede
   * retomar las revisiones abiertas.
   */
  async deleteCoordinator(coordinatorId: string, actorId: string) {
    const user = await prisma.user.findUnique({ where: { id: coordinatorId }, select: { role: true, email: true } });
    if (!user) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "Coordinador no encontrado");
    if (user.role !== "COORDINATOR") throw new AppError(ErrorCode.AUTH_UNAUTHORIZED, "Solo se pueden eliminar coordinadores");
    await prisma.user.update({ where: { id: coordinatorId }, data: { isActive: false } });
    await userAuditService.log({
      eventType:   "USER_DEACTIVATED",
      actorId,
      actorRole:   "ADMIN",
      targetId:    coordinatorId,
      targetEmail: user.email,
      targetRole:  user.role,
    });
  }

  async resetCoordinatorPassword(coordinatorId: string) {
    const user = await prisma.user.findUnique({
      where:  { id: coordinatorId },
      select: { role: true },
    });
    if (!user) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "Coordinador no encontrado");
    if (user.role !== "COORDINATOR") throw new AppError(ErrorCode.AUTH_UNAUTHORIZED, "Solo se puede restablecer la contraseña de coordinadores");
    return resetToTempPassword(coordinatorId);
  }

  async setCoordinatorSubjects(coordinatorId: string, subjectIds: string[]) {
    await prisma.$transaction(async (tx) => {
      await tx.coordinatorSubjectAssignment.deleteMany({ where: { coordinatorId } });
      if (subjectIds.length > 0) {
        await tx.coordinatorSubjectAssignment.createMany({
          data: subjectIds.map((subjectId) => ({ coordinatorId, subjectId })),
          skipDuplicates: true,
        });
      }
    });
  }
}

export const adminUsersService = new AdminUsersService();
