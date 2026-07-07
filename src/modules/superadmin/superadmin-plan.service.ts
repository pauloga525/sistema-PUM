import { prisma } from "@/lib/prisma/client";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";
import { auditService } from "@/modules/audit/audit.service";
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
  createdAt:        string;
  updatedAt:        string;
}

export interface PlanFilters {
  search?:   string;
  status?:   string;
  yearId?:   string;
  page?:     number;
  pageSize?: number;
}

const PAGE_SIZE = 20;

export const superAdminPlanService = {
  async getAllPlans(
    filters: PlanFilters = {},
  ): Promise<{ plans: PlanListItem[]; total: number; pages: number }> {
    const page     = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? PAGE_SIZE;
    const skip     = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (filters.status) where.status        = filters.status;
    if (filters.yearId) where.academicYearId = filters.yearId;
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
        orderBy: { updatedAt: "desc" },
        include: {
          teachers:     { where: { isEditor: true }, include: { teacher: { select: { name: true, email: true } } } },
          subject:      { select: { name: true } },
          level:        { select: { name: true } },
          academicYear: { select: { label: true } },
          period:       { select: { name: true } },
          review:       { select: { coordinatorId: true, coordinator: { select: { name: true } } } },
        },
      }),
    ]);

    return {
      total,
      pages: Math.ceil(total / pageSize),
      plans: rows.map((r) => {
        const editor = r.teachers[0]?.teacher;
        return {
          id:              r.id,
          status:          r.status,
          teacherName:     editor?.name ?? null,
          teacherEmail:    editor?.email ?? "",
          subjectName:     r.subject.name,
          levelName:       r.level.name,
          yearLabel:       r.academicYear.label,
          periodName:      r.period.name,
          coordinatorName: r.review?.coordinator.name ?? null,
          coordinatorId:   r.review?.coordinatorId ?? null,
          updatedAt:       r.updatedAt.toISOString(),
        };
      }),
    };
  },

  async getPlanDetail(planId: string): Promise<PlanDetail> {
    const p = await prisma.planification.findUnique({
      where: { id: planId },
      include: {
        teachers:     { where: { isEditor: true }, include: { teacher: { select: { name: true, email: true } } } },
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
    const editor = p.teachers[0]?.teacher;
    return {
      id:               p.id,
      status:           p.status,
      teacherName:      editor?.name ?? null,
      teacherEmail:     editor?.email ?? "",
      subjectName:      p.subject.name,
      levelName:        p.level.name,
      yearLabel:        p.academicYear.label,
      periodName:       p.period.name,
      coordinatorName:  p.review?.coordinator.name ?? null,
      coordinatorEmail: p.review?.coordinator.email ?? null,
      coordinatorId:    p.review?.coordinatorId ?? null,
      reviewId:         p.review?.id ?? null,
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
};
