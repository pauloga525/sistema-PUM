import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma/client";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";
import { normalizePumRowData, normalizePlanMetadata } from "@/modules/planification/planification.service";

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

export interface TeacherProgress {
  id: string;
  name: string;
  email: string;
  totalAssignments: number;
  plansCreated: number;
  finalized: number;
  pending: number;
  pct: number;
}

export class AdminService {

  // ── Años lectivos ────────────────────────────────────────────────────────────

  async getActiveYear() {
    return prisma.academicYear.findFirst({
      where: { active: true },
      include: { periods: { orderBy: { number: "asc" } } },
    });
  }

  async getAllYears() {
    return prisma.academicYear.findMany({
      orderBy: { yearStart: "desc" },
      include: { periods: { orderBy: { number: "asc" } } },
    });
  }

  async createAcademicYear(data: {
    label: string;
    yearStart: number;
    startDate?: Date | null;
    endDate?: Date | null;
    active?: boolean;
  }) {
    return prisma.academicYear.create({ data });
  }

  async setActiveYear(id: string) {
    return prisma.$transaction([
      prisma.academicYear.updateMany({ data: { active: false } }),
      prisma.academicYear.update({ where: { id }, data: { active: true } }),
    ]);
  }

  // ── Periodos ─────────────────────────────────────────────────────────────────

  async createPeriod(data: {
    academicYearId: string;
    name: string;
    number: number;
    startDate?: Date | null;
    endDate?: Date | null;
  }) {
    return prisma.period.create({ data });
  }

  async deletePeriod(id: string) {
    const hasPlans = await prisma.planification.count({ where: { periodId: id } });
    if (hasPlans > 0) {
      throw new AppError(ErrorCode.ADMIN_CATALOG_ITEM_IN_USE, "No se puede eliminar un periodo que ya tiene planificaciones");
    }
    return prisma.period.delete({ where: { id } });
  }

  // ── Materias ─────────────────────────────────────────────────────────────────

  async createSubject(data: { name: string; code: string; areaEstudio?: string }) {
    return prisma.subject.create({
      data: {
        name:        data.name.trim(),
        code:        data.code.toUpperCase().trim(),
        areaEstudio: data.areaEstudio?.trim() || null,
      },
    });
  }

  async deleteSubject(id: string) {
    const hasAssignments = await prisma.teacherAssignment.count({ where: { subjectId: id, active: true } });
    if (hasAssignments > 0) {
      throw new AppError(ErrorCode.ADMIN_CATALOG_ITEM_IN_USE, "No se puede eliminar una materia que tiene docentes asignados");
    }
    // Cascade: subjectLevels se eliminan automáticamente
    return prisma.subject.delete({ where: { id } });
  }

  async addSubjectToLevel(subjectId: string, levelId: string) {
    return prisma.subjectLevel.upsert({
      where: { subjectId_levelId: { subjectId, levelId } },
      create: { subjectId, levelId },
      update: {},
    });
  }

  async removeSubjectFromLevel(id: string) {
    return prisma.subjectLevel.delete({ where: { id } });
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────

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
    const inProgress = totalPlans - pendingSignature - signed;
    return { totalTeachers, totalPlans, pendingSignature, signed, adminRejected, inProgress, overdue };
  }

  async getTeacherProgress(yearId: string): Promise<TeacherProgress[]> {
    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER", assignments: { some: { academicYearId: yearId, active: true } } },
      select: {
        id: true, name: true, email: true,
        assignments:       { where: { academicYearId: yearId, active: true }, select: { id: true } },
        planificationLinks: {
          where: { planification: { academicYearId: yearId } },
          select: { planification: { select: { status: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    return teachers.map((t) => {
      const total        = t.assignments.length;
      const plansCreated = t.planificationLinks.length;
      const finalized    = t.planificationLinks.filter((l) => l.planification.status === "FINALIZED").length;
      const pending      = total - finalized;
      const pct          = total > 0 ? Math.round((finalized / total) * 100) : 0;
      return { id: t.id, name: t.name ?? t.email, email: t.email, totalAssignments: total, plansCreated, finalized, pending, pct };
    });
  }

  // ── Asignaciones ─────────────────────────────────────────────────────────────

  async getAssignments(yearId: string) {
    return prisma.teacherAssignment.findMany({
      where: { academicYearId: yearId, active: true },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        subject: { select: { id: true, name: true, code: true } },
        level:   { select: { id: true, name: true, code: true, orderIndex: true, track: true } },
        period:  { select: { id: true, name: true, number: true } },
      },
      orderBy: [
        { teacher: { name: "asc" } },
        { level: { orderIndex: "asc" } },
        { subject: { name: "asc" } },
      ],
    });
  }

  async getAssignmentFormData() {
    const [teachers, subjects, levels] = await Promise.all([
      prisma.user.findMany({
        where: { role: "TEACHER" },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
      prisma.subject.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      }),
      prisma.level.findMany({
        orderBy: { orderIndex: "asc" },
        select: { id: true, name: true, code: true, track: true },
      }),
    ]);
    return { teachers, subjects, levels };
  }

  async getAssignmentFormDataFull(academicYearId: string) {
    const [teachers, subjects, levels, periods] = await Promise.all([
      prisma.user.findMany({
        where: { role: "TEACHER" },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
      prisma.subject.findMany({
        orderBy: { name: "asc" },
        include: { subjectLevels: { select: { levelId: true } } },
      }),
      prisma.level.findMany({
        orderBy: { orderIndex: "asc" },
        select: { id: true, name: true, code: true, track: true },
      }),
      prisma.period.findMany({
        where: { academicYearId },
        orderBy: { number: "asc" },
        select: { id: true, name: true, number: true },
      }),
    ]);
    return { teachers, subjects, levels, periods };
  }

  async createAssignment(data: {
    teacherId: string;
    subjectId: string;
    levelId: string;
    academicYearId: string;
    periodId?: string | null;
  }) {
    return prisma.teacherAssignment.upsert({
      where: {
        teacherId_subjectId_levelId_academicYearId: {
          teacherId:      data.teacherId,
          subjectId:      data.subjectId,
          levelId:        data.levelId,
          academicYearId: data.academicYearId,
        },
      },
      create: { ...data, active: true },
      update: { active: true, periodId: data.periodId ?? null },
    });
  }

  async updateAssignment(id: string, data: {
    subjectId?: string;
    levelId?: string;
    periodId?: string | null;
  }) {
    return prisma.teacherAssignment.update({ where: { id }, data });
  }

  async removeAssignment(id: string) {
    return prisma.teacherAssignment.update({ where: { id }, data: { active: false } });
  }

  // ── Plazos ───────────────────────────────────────────────────────────────────

  async getPlanificationsForPeriod(yearId: string, periodId: string) {
    return prisma.planification.findMany({
      where: { academicYearId: yearId, periodId },
      include: {
        teachers: {
          where:   { isEditor: true },
          include: { teacher: { select: { id: true, name: true, email: true } } },
        },
        subject: { select: { id: true, name: true, code: true } },
        level:   { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ level: { orderIndex: "asc" } }, { subject: { name: "asc" } }],
    });
  }

  async setDeadline(planId: string, deadline: Date | null) {
    return prisma.planification.update({ where: { id: planId }, data: { editDeadlineAt: deadline } });
  }

  async setBulkDeadline(yearId: string, periodId: string, deadline: Date | null) {
    return prisma.planification.updateMany({
      where: { academicYearId: yearId, periodId, status: "DRAFT" },
      data:  { editDeadlineAt: deadline },
    });
  }

  // ── Catálogo — datos completos ───────────────────────────────────────────────

  async getCatalogData() {
    const [years, levels, subjects] = await Promise.all([
      prisma.academicYear.findMany({
        orderBy: { yearStart: "desc" },
        include: {
          periods:  { orderBy: { number: "asc" }, select: { id: true, name: true, number: true, startDate: true, endDate: true } },
          _count:   { select: { assignments: true } },
        },
      }),
      prisma.level.findMany({
        orderBy: { orderIndex: "asc" },
        include: { _count: { select: { assignments: true } } },
      }),
      prisma.subject.findMany({
        orderBy: { name: "asc" },
        include: {
          _count:       { select: { assignments: true } },
          subjectLevels: { include: { level: { select: { id: true, name: true, code: true } } } },
        },
      }),
    ]);
    return { years, levels, subjects };
  }

  async getFullCatalogData(yearId?: string) {
    const [years, levels, subjects] = await Promise.all([
      prisma.academicYear.findMany({
        orderBy: { yearStart: "desc" },
        include: {
          periods:  { orderBy: { number: "asc" } },
          _count:   { select: { assignments: true } },
        },
      }),
      prisma.level.findMany({
        orderBy: { orderIndex: "asc" },
      }),
      prisma.subject.findMany({
        orderBy: { name: "asc" },
        include: { subjectLevels: { include: { level: { select: { id: true, name: true, code: true } } } } },
      }),
    ]);

    const selectedYearId = yearId ?? years.find((y) => y.active)?.id ?? years[0]?.id;
    return { years, levels, subjects, selectedYearId };
  }

  // ── Docentes ─────────────────────────────────────────────────────────────────

  async getTeachers() {
    return prisma.user.findMany({
      where: { role: "TEACHER" },
      select: {
        id:                  true,
        name:                true,
        email:               true,
        cedula:              true,
        forcePasswordChange: true,
        createdAt:           true,
        _count: { select: { assignments: { where: { active: true } } } },
      },
      orderBy: { name: "asc" },
    });
  }

  async getTeacherFormData() {
    const [subjects, levels, years] = await Promise.all([
      prisma.subject.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true, areaEstudio: true },
      }),
      prisma.level.findMany({
        orderBy: { orderIndex: "asc" },
        select: { id: true, name: true, code: true, track: true },
      }),
      prisma.academicYear.findMany({
        orderBy: { yearStart: "desc" },
        select: { id: true, label: true, yearStart: true, active: true },
      }),
    ]);
    const activeYear = years.find((y) => y.active) ?? years[0] ?? null;
    return { subjects, levels, years, activeYear };
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

    const passwordHash = await bcrypt.hash(data.cedula, 10);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name:                data.name.trim(),
          email:               data.email.toLowerCase().trim(),
          cedula:              data.cedula,
          passwordHash,
          role:                "TEACHER",
          forcePasswordChange: true,
        },
      });

      if (data.assignments.length > 0 && data.academicYearId) {
        for (const a of data.assignments) {
          await tx.teacherAssignment.create({
            data: {
              teacherId:      user.id,
              subjectId:      a.subjectId,
              levelId:        a.levelId,
              academicYearId: data.academicYearId,
              periodId:       a.periodId || null,
              active:         true,
            },
          });
        }

        // Actualiza areaEstudio en cada materia que lo tenga
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
  }

  async resetTeacherPassword(teacherId: string) {
    const user = await prisma.user.findUnique({ where: { id: teacherId }, select: { cedula: true, name: true } });
    if (!user) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "Docente no encontrado");
    if (!user.cedula) throw new AppError(ErrorCode.VAL_INVALID_INPUT, "El docente no tiene cédula registrada");
    const passwordHash = await bcrypt.hash(user.cedula, 10);
    await prisma.user.update({ where: { id: teacherId }, data: { passwordHash, forcePasswordChange: true } });
  }

  async deleteTeacher(teacherId: string) {
    const user = await prisma.user.findUnique({ where: { id: teacherId }, select: { id: true, role: true } });
    if (!user) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "Docente no encontrado");
    if (user.role !== "TEACHER") throw new AppError(ErrorCode.AUTH_UNAUTHORIZED, "Solo se pueden eliminar cuentas de docentes");
    await prisma.user.delete({ where: { id: teacherId } });
  }

  // ── Coordinadores ────────────────────────────────────────────────────────────

  async getSubjectsForAdminPanel() {
    return prisma.subject.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    });
  }

  async getCoordinators() {
    const coordinators = await prisma.user.findMany({
      where: { role: "COORDINATOR" },
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

    const [planLinks, allPlansWithReview] = allTeacherIds.length > 0
      ? await Promise.all([
          prisma.planificationTeacher.findMany({
            where: {
              teacherId: { in: allTeacherIds },
              planification: { status: "FINALIZED" },
            },
            select: { planificationId: true, teacherId: true },
          }),
          prisma.planification.findMany({
            where: {
              status: "FINALIZED",
              teachers: { some: { teacherId: { in: allTeacherIds } } },
            },
            include: { review: { select: { status: true } }, teachers: { select: { teacherId: true } } },
          }),
        ])
      : [[], []];

    const planIdToReviewStatus = new Map(
      allPlansWithReview.map((p) => [p.id, p.review?.status ?? null])
    );
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
      const approvedPlans = [...planIds].filter(
        (pid) => planIdToReviewStatus.get(pid) === "APPROVED"
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
      where: { role: "TEACHER" },
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

    const passwordHash = await bcrypt.hash(data.cedula, 10);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name:                data.name.trim(),
          email:               data.email.toLowerCase().trim(),
          cedula:              data.cedula,
          passwordHash,
          role:                "COORDINATOR",
          coordinatorArea:     data.coordinatorArea.trim() || null,
          forcePasswordChange: true,
        },
      });

      for (const teacherId of data.teacherIds) {
        await tx.coordinatorAssignment.create({
          data: { coordinatorId: user.id, teacherId },
        });
      }

      return user;
    });
  }

  async promoteTeacherToCoordinator(data: {
    teacherId:       string;
    coordinatorArea: string;
    teacherIds:      string[];
  }) {
    if (!data.teacherId) {
      throw new AppError(ErrorCode.VAL_MISSING_FIELD, "Debes seleccionar un docente");
    }
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: data.teacherId },
        data: {
          role:            "COORDINATOR",
          coordinatorArea: data.coordinatorArea.trim() || null,
        },
      });
      for (const tid of data.teacherIds) {
        if (tid !== data.teacherId) {
          await tx.coordinatorAssignment.upsert({
            where:  { coordinatorId_teacherId: { coordinatorId: user.id, teacherId: tid } },
            create: { coordinatorId: user.id, teacherId: tid },
            update: {},
          });
        }
      }
      return user;
    });
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

  async deleteCoordinator(coordinatorId: string) {
    const user = await prisma.user.findUnique({ where: { id: coordinatorId }, select: { role: true } });
    if (!user) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "Coordinador no encontrado");
    if (user.role !== "COORDINATOR") throw new AppError(ErrorCode.AUTH_UNAUTHORIZED, "Solo se pueden eliminar coordinadores");
    await prisma.user.delete({ where: { id: coordinatorId } });
  }

  async resetCoordinatorPassword(coordinatorId: string) {
    const user = await prisma.user.findUnique({
      where:  { id: coordinatorId },
      select: { role: true, cedula: true },
    });
    if (!user) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "Coordinador no encontrado");
    if (user.role !== "COORDINATOR") throw new AppError(ErrorCode.AUTH_UNAUTHORIZED, "Solo se puede restablecer la contraseña de coordinadores");
    if (!user.cedula) throw new AppError(ErrorCode.VAL_INVALID_INPUT, "El coordinador no tiene cédula registrada. No es posible restablecer la contraseña");
    const passwordHash = await bcrypt.hash(user.cedula, 10);
    await prisma.user.update({
      where: { id: coordinatorId },
      data:  { passwordHash, forcePasswordChange: true },
    });
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

  async getCoordinatorSubjectIds(coordinatorId: string): Promise<string[]> {
    const rows = await prisma.coordinatorSubjectAssignment.findMany({
      where:  { coordinatorId },
      select: { subjectId: true },
    });
    return rows.map((r) => r.subjectId);
  }

  // ── Resumen coordinadores ────────────────────────────────────────────────────

  async getCoordinatorOverview(): Promise<CoordinatorOverview[]> {
    const coordinators = await prisma.user.findMany({
      where: { role: "COORDINATOR" },
      select: { id: true, name: true, email: true,
        coordinatorAssignmentsAsCoordinator: { select: { teacherId: true } },
      },
      orderBy: { name: "asc" },
    });

    const allTeacherIds = coordinators.flatMap((c) =>
      c.coordinatorAssignmentsAsCoordinator.map((a) => a.teacherId)
    );

    const [overviewLinks, overviewPlans] = allTeacherIds.length > 0
      ? await Promise.all([
          prisma.planificationTeacher.findMany({
            where: { teacherId: { in: allTeacherIds } },
            select: { planificationId: true, teacherId: true },
          }),
          prisma.planification.findMany({
            where: { teachers: { some: { teacherId: { in: allTeacherIds } } } },
            select: { id: true, status: true, teachers: { select: { teacherId: true } } },
          }),
        ])
      : [[], []];

    const overviewLinkByTeacher = new Map<string, Set<string>>();
    for (const link of overviewLinks) {
      if (!overviewLinkByTeacher.has(link.teacherId))
        overviewLinkByTeacher.set(link.teacherId, new Set());
      overviewLinkByTeacher.get(link.teacherId)!.add(link.planificationId);
    }
    const overviewPlanMap = new Map(overviewPlans.map((p) => [p.id, p.status]));

    return coordinators.map((c) => {
      const teacherIds = c.coordinatorAssignmentsAsCoordinator.map((a) => a.teacherId);
      const planIds = new Set<string>();
      for (const tid of teacherIds) {
        overviewLinkByTeacher.get(tid)?.forEach((pid) => planIds.add(pid));
      }
      const statuses = [...planIds].map((pid) => overviewPlanMap.get(pid) ?? "");

      return {
        coordinatorId:    c.id,
        coordinatorName:  c.name,
        coordinatorEmail: c.email,
        teacherCount:     teacherIds.length,
        pendingReview:    statuses.filter((s) => ["FINALIZED", "FEEDBACK_RECEIVED"].includes(s)).length,
        pendingSignature: statuses.filter((s) => s === "PENDING_SIGNATURE").length,
        adminRejected:    statuses.filter((s) => s === "ADMIN_REJECTED").length,
        signed:           statuses.filter((s) => s === "SIGNED").length,
      };
    });
  }

  // ── Firma de PUMs ────────────────────────────────────────────────────────────

  async getPendingSignaturePlans(): Promise<CoordinatorSignatureGroup[]> {
    // Group plans by coordinator using both assignment models
    const plans = await prisma.planification.findMany({
      where: { status: { in: ["PENDING_SIGNATURE", "SIGNED"] } },
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
        period:       { select: { name: true } },
        academicYear: { select: { label: true } },
      },
    });

    const groups = new Map<string, CoordinatorSignatureGroup>();

    for (const plan of plans) {
      const allTeacherNames = plan.teachers.map((t) => t.teacher.name ?? t.teacher.email);
      const teacherDisplay  = allTeacherNames.length <= 2
        ? allTeacherNames.join(", ")
        : `${allTeacherNames[0]} + ${allTeacherNames.length - 1} más`;

      const editorLink = plan.teachers.find((t) => t.isEditor) ?? plan.teachers[0];
      const editorEmail = editorLink?.teacher.email ?? "";

      // Determine coordinator(s) for this plan
      const coordinatorSet = new Map<string, { id: string; name: string | null; email: string }>();
      for (const link of plan.teachers) {
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
            yearLabel:    plan.academicYear.label,
            finalizedAt:  plan.finalizedAt,
          });
        }
      }
    }
    return [...groups.values()];
  }

  async signPlan(planId: string, actorId?: string, actorName?: string): Promise<void> {
    await prisma.planification.update({
      where: { id: planId, status: "PENDING_SIGNATURE" },
      data:  { status: "SIGNED" },
    });

    const { auditService } = await import("@/modules/audit/audit.service");
    await auditService.log({
      planificationId: planId,
      actorId:   actorId   ?? null,
      actorName: actorName ?? null,
      actorRole: "ADMIN",
      eventType: "SIGNED",
    });
  }

  async rejectPlan(planId: string, comment: string, actorId?: string, actorName?: string): Promise<void> {
    const plan = await prisma.planification.findUnique({
      where: { id: planId },
      select: { status: true, metadata: true },
    });
    if (!plan || plan.status !== "PENDING_SIGNATURE") return;

    const metadata = (plan.metadata && typeof plan.metadata === "object" && !Array.isArray(plan.metadata))
      ? (plan.metadata as Record<string, unknown>)
      : {};

    await prisma.$transaction(async (tx) => {
      await tx.planification.update({
        where: { id: planId },
        data: {
          status: "ADMIN_REJECTED",
          metadata: {
            ...metadata,
            adminRejectionComment: comment,
            adminRejectedAt: new Date().toISOString(),
          },
        },
      });
      await tx.planReview.updateMany({
        where: { planificationId: planId },
        data:  { status: "IN_REVIEW", approvedAt: null },
      });
    });

    const { auditService } = await import("@/modules/audit/audit.service");
    await auditService.log({
      planificationId: planId,
      actorId:   actorId   ?? null,
      actorName: actorName ?? null,
      actorRole: "ADMIN",
      eventType: "ADMIN_REJECTED",
      comment,
    });
  }

  async getPlanForAdmin(planId: string) {
    const plan = await prisma.planification.findUnique({
      where: { id: planId },
      include: {
        rows:         { orderBy: { rowIndex: "asc" } },
        teachers:     { where: { isEditor: true }, include: { teacher: true } },
        subject:      true,
        level:        true,
        period:       true,
        academicYear: true,
      },
    });
    if (!plan) return null;
    return {
      status:      plan.status,
      teacherName: plan.teachers[0]?.teacher.name ?? null,
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

export const adminService = new AdminService();
