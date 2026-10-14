import { prisma } from "@/lib/prisma/client";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";

/** Catálogo académico: años lectivos, periodos y materias. */
export class AdminCatalogService {
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
    // Las asignaciones inactivas y los PUM también referencian la materia (FK Restrict)
    const [hasActive, hasAny, hasPlans] = await Promise.all([
      prisma.teacherAssignment.count({ where: { subjectId: id, active: true } }),
      prisma.teacherAssignment.count({ where: { subjectId: id } }),
      prisma.planification.count({ where: { subjectId: id } }),
    ]);
    if (hasActive > 0) {
      throw new AppError(ErrorCode.ADMIN_CATALOG_ITEM_IN_USE, "No se puede eliminar una materia que tiene docentes asignados");
    }
    if (hasAny > 0 || hasPlans > 0) {
      throw new AppError(ErrorCode.ADMIN_CATALOG_ITEM_IN_USE, "No se puede eliminar una materia con historial de asignaciones o planificaciones");
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
}

export const adminCatalogService = new AdminCatalogService();
