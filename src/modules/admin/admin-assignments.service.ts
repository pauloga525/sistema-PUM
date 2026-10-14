import { prisma } from "@/lib/prisma/client";
import { planificationService } from "@/modules/planification/planification.service";

/** Asignaciones docente ↔ materia/nivel y plazos de edición de los PUM. */
export class AdminAssignmentsService {
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

  async createAssignment(data: {
    teacherId: string;
    subjectId: string;
    levelId: string;
    academicYearId: string;
    periodId?: string | null;
  }) {
    const assignment = await prisma.teacherAssignment.upsert({
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

    // Igual que en la asignación desde el panel de Coordinador: si ya existen
    // PUMs para esta materia+nivel+año, vincular al docente como espectador
    // (upsert con update:{} — nunca sobrescribe un vínculo/editor existente).
    const existingPlans = await prisma.planification.findMany({
      where: { academicYearId: data.academicYearId, subjectId: data.subjectId, levelId: data.levelId },
      select: { id: true },
    });
    if (existingPlans.length > 0) {
      await prisma.planificationTeacher.createMany({
        data: existingPlans.map((p) => ({ planificationId: p.id, teacherId: data.teacherId, isEditor: false })),
        skipDuplicates: true,
      });
    }

    return assignment;
  }

  async updateAssignment(id: string, data: {
    subjectId?: string;
    levelId?: string;
    periodId?: string | null;
  }) {
    return prisma.teacherAssignment.update({ where: { id }, data });
  }

  async removeAssignment(
    id: string,
    actor: { actorId: string; actorName: string | null; actorRole: string },
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    return planificationService.unassignTeacherFromCombo({ assignmentId: id, ...actor });
  }

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
}

export const adminAssignmentsService = new AdminAssignmentsService();
