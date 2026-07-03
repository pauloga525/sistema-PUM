import { prisma } from "@/lib/prisma/client";
import { AUDIT_EVENT_LABELS, AUDIT_ACTOR_LABELS } from "@/modules/audit/audit.service";
import { USER_AUDIT_LABELS } from "@/modules/audit/global-audit.service";
import type { AuditEventType } from "@/modules/audit/audit.service";

export interface UserStats {
  total:    number;
  active:   number;
  inactive: number;
  byRole:   Record<string, number>;
}

export interface PlanStats {
  total:           number;
  draft:           number;
  finalized:       number;
  feedbackReceived:number;
  approved:        number;
  pendingSignature:number;
  signed:          number;
  adminRejected:   number;
}

export interface ErrorStats {
  total:      number;
  unresolved: number;
  errors:     number;
  warnings:   number;
}

export interface RecentPlanEvent {
  id:         string;
  createdAt:  string;
  eventLabel: string;
  actorName:  string | null;
  actorRoleLabel: string | null;
  subjectName: string;
  planId:     string;
}

export interface RecentUserEvent {
  id:         string;
  createdAt:  string;
  eventLabel: string;
  actorEmail: string | null;
  actorRole:  string | null;
  result:     string;
}

export interface DashboardData {
  users:           UserStats;
  plans:           PlanStats;
  errors:          ErrorStats;
  recentPlanEvents: RecentPlanEvent[];
  recentUserEvents: RecentUserEvent[];
  activeYear:      string | null;
}

export const dashboardService = {
  async getData(): Promise<DashboardData> {
    const [
      userTotal,
      userActive,
      usersByRole,
      plansByStatus,
      errorTotal,
      errorUnresolved,
      errorErrors,
      errorWarnings,
      planEvents,
      userEvents,
      activeYear,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
      prisma.planification.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.systemErrorLog.count(),
      prisma.systemErrorLog.count({ where: { resolved: false } }),
      prisma.systemErrorLog.count({ where: { level: "ERROR", resolved: false } }),
      prisma.systemErrorLog.count({ where: { level: "WARN",  resolved: false } }),
      prisma.planAuditEvent.findMany({
        take:    10,
        orderBy: { createdAt: "desc" },
        include: {
          planification: {
            select: { id: true, subject: { select: { name: true } } },
          },
        },
      }),
      prisma.userAuditLog.findMany({
        take:    10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, createdAt: true, eventType: true,
          actorEmail: true, actorRole: true, result: true,
        },
      }),
      prisma.academicYear.findFirst({
        where:   { active: true },
        select:  { label: true },
        orderBy: { yearStart: "desc" },
      }),
    ]);

    const byRole: Record<string, number> = {};
    for (const g of usersByRole) byRole[g.role] = g._count._all;

    const statusCount = (status: string) =>
      plansByStatus.find((g) => g.status === status)?._count._all ?? 0;

    return {
      users: {
        total:    userTotal,
        active:   userActive,
        inactive: userTotal - userActive,
        byRole,
      },
      plans: {
        total:            plansByStatus.reduce((s, g) => s + g._count._all, 0),
        draft:            statusCount("DRAFT"),
        finalized:        statusCount("FINALIZED"),
        feedbackReceived: statusCount("FEEDBACK_RECEIVED"),
        approved:         statusCount("APPROVED"),
        pendingSignature: statusCount("PENDING_SIGNATURE"),
        signed:           statusCount("SIGNED"),
        adminRejected:    statusCount("ADMIN_REJECTED"),
      },
      errors: {
        total:      errorTotal,
        unresolved: errorUnresolved,
        errors:     errorErrors,
        warnings:   errorWarnings,
      },
      recentPlanEvents: planEvents.map((e) => ({
        id:             e.id,
        createdAt:      e.createdAt.toISOString(),
        eventLabel:     AUDIT_EVENT_LABELS[e.eventType as AuditEventType] ?? e.eventType,
        actorName:      e.actorName,
        actorRoleLabel: e.actorRole ? (AUDIT_ACTOR_LABELS[e.actorRole] ?? e.actorRole) : null,
        subjectName:    e.planification.subject.name,
        planId:         e.planificationId,
      })),
      recentUserEvents: userEvents.map((e) => ({
        id:         e.id,
        createdAt:  e.createdAt.toISOString(),
        eventLabel: USER_AUDIT_LABELS[e.eventType] ?? e.eventType,
        actorEmail: e.actorEmail,
        actorRole:  e.actorRole,
        result:     e.result,
      })),
      activeYear: activeYear?.label ?? null,
    };
  },
};
