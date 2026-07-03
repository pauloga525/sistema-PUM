import { prisma } from "@/lib/prisma/client";

export interface PumNotification {
  id: string;
  type: "feedback_received" | "coordinator_approved" | "admin_signed" | "pending_review" | "admin_rejected";
  subjectName: string;
  levelCode: string;
  periodName: string;
  yearLabel: string;
  teacherName?: string | null;
}

export const notificationsService = {
  async getTeacherNotifications(teacherId: string): Promise<PumNotification[]> {
    const links = await prisma.planificationTeacher.findMany({
      where: { teacherId },
      select: { planificationId: true },
    });
    if (links.length === 0) return [];

    const plans = await prisma.planification.findMany({
      where: {
        id: { in: links.map((l) => l.planificationId) },
        status: { in: ["FEEDBACK_RECEIVED", "APPROVED", "PENDING_SIGNATURE", "SIGNED"] },
      },
      select: {
        id: true,
        status: true,
        subject: { select: { name: true } },
        level: { select: { code: true } },
        period: { select: { name: true } },
        academicYear: { select: { label: true } },
      },
    });

    const result: PumNotification[] = [];
    for (const p of plans) {
      if (p.status === "FEEDBACK_RECEIVED") {
        result.push({
          id: `${p.id}:feedback_received`,
          type: "feedback_received",
          subjectName: p.subject.name,
          levelCode: p.level.code,
          periodName: p.period.name,
          yearLabel: p.academicYear.label,
        });
      }
      if (p.status === "APPROVED" || p.status === "PENDING_SIGNATURE") {
        result.push({
          id: `${p.id}:coordinator_approved`,
          type: "coordinator_approved",
          subjectName: p.subject.name,
          levelCode: p.level.code,
          periodName: p.period.name,
          yearLabel: p.academicYear.label,
        });
      }
      if (p.status === "SIGNED") {
        // Also emit coordinator_approved if not yet seen separately
        result.push({
          id: `${p.id}:coordinator_approved`,
          type: "coordinator_approved",
          subjectName: p.subject.name,
          levelCode: p.level.code,
          periodName: p.period.name,
          yearLabel: p.academicYear.label,
        });
        result.push({
          id: `${p.id}:admin_signed`,
          type: "admin_signed",
          subjectName: p.subject.name,
          levelCode: p.level.code,
          periodName: p.period.name,
          yearLabel: p.academicYear.label,
        });
      }
    }
    return result;
  },

  async getCoordinatorNotifications(coordinatorId: string): Promise<PumNotification[]> {
    const cas = await prisma.coordinatorAssignment.findMany({
      where: { coordinatorId },
      select: { teacherId: true },
    });
    const teacherIds = cas.map((c) => c.teacherId);
    if (teacherIds.length === 0) return [];

    const planLinks = await prisma.planificationTeacher.findMany({
      where: {
        teacherId: { in: teacherIds },
        planification: {
          status: { in: ["FINALIZED", "FEEDBACK_RECEIVED", "ADMIN_REJECTED"] },
        },
      },
      select: {
        planification: {
          select: {
            id: true,
            status: true,
            subject: { select: { name: true } },
            level: { select: { code: true } },
            period: { select: { name: true } },
            academicYear: { select: { label: true } },
          },
        },
        teacher: { select: { name: true } },
        isEditor: true,
      },
    });

    return planLinks.map(({ planification: p, teacher }) => {
      const type: PumNotification["type"] =
        p.status === "ADMIN_REJECTED" ? "admin_rejected" : "pending_review";
      return {
        id: `${p.id}:${type}`,
        type,
        subjectName: p.subject.name,
        levelCode: p.level.code,
        periodName: p.period.name,
        yearLabel: p.academicYear.label,
        teacherName: teacher.name,
      };
    });
  },
};
