import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import { AUDIT_EVENT_LABELS, AUDIT_ACTOR_LABELS } from "./audit.service";
import type { AuditEventType } from "./audit.service";

// ── Plan audit ────────────────────────────────────────────────────────────────

export interface PlanAuditRow {
  id:          string;
  createdAt:   string;
  eventType:   string;
  eventLabel:  string;
  actorName:   string | null;
  actorRole:   string | null;
  actorRoleLabel: string | null;
  sectionLabel: string | null;
  comment:     string | null;
  planId:      string;
  subjectName: string;
  teacherName: string | null;
  yearLabel:   string;
}

export interface PlanAuditFilters {
  search?:    string;  // actor name
  eventType?: string;
  from?:      string;  // ISO date YYYY-MM-DD
  to?:        string;
  page?:      number;
}

const PAGE_SIZE = 25;

// ── User audit ────────────────────────────────────────────────────────────────

export interface UserAuditRow {
  id:          string;
  createdAt:   string;
  eventType:   string;
  eventLabel:  string;
  actorEmail:  string | null;
  actorRole:   string | null;
  actorIp:     string | null;
  targetEmail: string | null;
  targetRole:  string | null;
  result:      string;
}

export interface UserAuditFilters {
  search?:    string;  // actor email
  eventType?: string;
  result?:    string;  // SUCCESS | FAILURE
  from?:      string;
  to?:        string;
  page?:      number;
}

// ── Labels de eventos de usuario ──────────────────────────────────────────────

export const USER_AUDIT_LABELS: Record<string, string> = {
  LOGIN_SUCCESS:          "Inicio de sesión",
  LOGIN_FAILED:           "Intento de login fallido",
  LOGOUT:                 "Cierre de sesión",
  USER_CREATED:           "Usuario creado",
  USER_UPDATED:           "Usuario actualizado",
  USER_DEACTIVATED:       "Usuario desactivado",
  USER_REACTIVATED:       "Usuario reactivado",
  USER_PASSWORD_RESET:    "Contraseña restablecida",
  USER_ROLE_CHANGED:      "Rol cambiado",
  PLAN_STATE_CORRECTED:   "Estado de PUM corregido",
  COORDINATOR_REASSIGNED: "Coordinador reasignado",
};

// ── Plan summary (agrupado por PUM) ──────────────────────────────────────────

export interface PlanSummary {
  planId:         string;
  status:         string;
  subjectName:    string;
  levelName:      string;
  teacherName:    string | null;
  yearLabel:      string;
  periodName:     string;
  eventCount:     number;
  lastEventLabel: string | null;
  lastEventAt:    string | null;
  lastActorName:  string | null;
}

export interface PlanSummaryFilters {
  search?:  string;
  yearId?:  string;
  status?:  string;
  page?:    number;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const globalAuditService = {
  async getPlanSummaries(
    filters: PlanSummaryFilters = {},
  ): Promise<{ plans: PlanSummary[]; total: number; pages: number }> {
    const page = Math.max(1, filters.page ?? 1);
    const skip = (page - 1) * PAGE_SIZE;

    const where: Prisma.PlanificationWhereInput = {};
    if (filters.status) where.status        = filters.status;
    if (filters.yearId) where.academicYearId = filters.yearId;
    if (filters.search) {
      const s = filters.search.trim();
      where.OR = [
        { teachers: { some: { teacher: { name:  { contains: s, mode: "insensitive" } } } } },
        { teachers: { some: { teacher: { email: { contains: s, mode: "insensitive" } } } } },
        { subject: { name: { contains: s, mode: "insensitive" } } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.planification.count({ where }),
      prisma.planification.findMany({
        where,
        skip,
        take:    PAGE_SIZE,
        orderBy: { updatedAt: "desc" },
        include: {
          subject:      { select: { name: true } },
          level:        { select: { name: true } },
          teachers:     { where: { isEditor: true }, select: { teacher: { select: { name: true } } } },
          academicYear: { select: { label: true } },
          period:       { select: { name: true } },
          _count:       { select: { auditEvents: true } },
          auditEvents: {
            take:    1,
            orderBy: { createdAt: "desc" },
            select:  { eventType: true, createdAt: true, actorName: true },
          },
        },
      }),
    ]);

    return {
      total,
      pages: Math.ceil(total / PAGE_SIZE),
      plans: rows.map((p) => {
        const last = p.auditEvents[0];
        return {
          planId:         p.id,
          status:         p.status,
          subjectName:    p.subject.name,
          levelName:      p.level.name,
          teacherName:    p.teachers[0]?.teacher.name ?? null,
          yearLabel:      p.academicYear.label,
          periodName:     p.period.name,
          eventCount:     p._count.auditEvents,
          lastEventLabel: last ? (AUDIT_EVENT_LABELS[last.eventType as AuditEventType] ?? last.eventType) : null,
          lastEventAt:    last?.createdAt.toISOString() ?? null,
          lastActorName:  last?.actorName ?? null,
        };
      }),
    };
  },

  async getYears(): Promise<Array<{ id: string; label: string }>> {
    return prisma.academicYear.findMany({
      orderBy: { yearStart: "desc" },
      select:  { id: true, label: true },
    });
  },


  async getPlanEvents(
    filters: PlanAuditFilters = {},
  ): Promise<{ rows: PlanAuditRow[]; total: number; pages: number }> {
    const page = Math.max(1, filters.page ?? 1);
    const skip = (page - 1) * PAGE_SIZE;

    const where: Record<string, unknown> = {};
    if (filters.eventType) where.eventType = filters.eventType;
    if (filters.search)    where.actorName = { contains: filters.search.trim(), mode: "insensitive" };

    if (filters.from || filters.to) {
      const range: Record<string, Date> = {};
      if (filters.from) range.gte = new Date(filters.from);
      if (filters.to) {
        const d = new Date(filters.to);
        d.setHours(23, 59, 59, 999);
        range.lte = d;
      }
      where.createdAt = range;
    }

    const [total, events] = await Promise.all([
      prisma.planAuditEvent.count({ where }),
      prisma.planAuditEvent.findMany({
        where,
        skip,
        take:    PAGE_SIZE,
        orderBy: { createdAt: "desc" },
        include: {
          planification: {
            select: {
              id:           true,
              subject:      { select: { name: true } },
              teachers:     { where: { isEditor: true }, select: { teacher: { select: { name: true } } } },
              academicYear: { select: { label: true } },
            },
          },
        },
      }),
    ]);

    return {
      total,
      pages: Math.ceil(total / PAGE_SIZE),
      rows: events.map((e) => {
        const et = e.eventType as AuditEventType;
        return {
          id:          e.id,
          createdAt:   e.createdAt.toISOString(),
          eventType:   e.eventType,
          eventLabel:  AUDIT_EVENT_LABELS[et] ?? e.eventType,
          actorName:   e.actorName,
          actorRole:   e.actorRole,
          actorRoleLabel: e.actorRole ? (AUDIT_ACTOR_LABELS[e.actorRole] ?? e.actorRole) : null,
          sectionLabel: e.sectionLabel,
          comment:     e.comment,
          planId:      e.planificationId,
          subjectName: e.planification.subject.name,
          teacherName: e.planification.teachers[0]?.teacher.name ?? null,
          yearLabel:   e.planification.academicYear.label,
        };
      }),
    };
  },

  async getUserEvents(
    filters: UserAuditFilters = {},
  ): Promise<{ rows: UserAuditRow[]; total: number; pages: number }> {
    const page = Math.max(1, filters.page ?? 1);
    const skip = (page - 1) * PAGE_SIZE;

    const where: Record<string, unknown> = {};
    if (filters.eventType) where.eventType = filters.eventType;
    if (filters.result)    where.result    = filters.result;
    if (filters.search)    where.actorEmail = { contains: filters.search.trim(), mode: "insensitive" };

    if (filters.from || filters.to) {
      const range: Record<string, Date> = {};
      if (filters.from) range.gte = new Date(filters.from);
      if (filters.to) {
        const d = new Date(filters.to);
        d.setHours(23, 59, 59, 999);
        range.lte = d;
      }
      where.createdAt = range;
    }

    const [total, events] = await Promise.all([
      prisma.userAuditLog.count({ where }),
      prisma.userAuditLog.findMany({
        where,
        skip,
        take:    PAGE_SIZE,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, createdAt: true, eventType: true, result: true,
          actorEmail: true, actorRole: true, actorIp: true,
          targetEmail: true, targetRole: true,
        },
      }),
    ]);

    return {
      total,
      pages: Math.ceil(total / PAGE_SIZE),
      rows: events.map((e) => ({
        id:          e.id,
        createdAt:   e.createdAt.toISOString(),
        eventType:   e.eventType,
        eventLabel:  USER_AUDIT_LABELS[e.eventType] ?? e.eventType,
        actorEmail:  e.actorEmail,
        actorRole:   e.actorRole,
        actorIp:     e.actorIp,
        targetEmail: e.targetEmail,
        targetRole:  e.targetRole,
        result:      e.result,
      })),
    };
  },

  async getPlanEventTypeOptions(): Promise<string[]> {
    const raw = await prisma.planAuditEvent.findMany({
      distinct: ["eventType"],
      select:   { eventType: true },
      orderBy:  { eventType: "asc" },
    });
    return raw.map((r) => r.eventType);
  },

  async getUserEventTypeOptions(): Promise<string[]> {
    const raw = await prisma.userAuditLog.findMany({
      distinct: ["eventType"],
      select:   { eventType: true },
      orderBy:  { eventType: "asc" },
    });
    return raw.map((r) => r.eventType);
  },
};
