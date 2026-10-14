import { prisma } from "@/lib/prisma/client";
import type { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger/logger";
import { REVIEW_SECTION_LABELS, type ReviewSectionKey } from "@/constants/review";

// ── Tipos de evento de auditoría ──────────────────────────────────────────────

export type AuditEventType =
  | "PLAN_CREATED"
  | "FINALIZED"
  | "TEACHER_RESUBMITTED"
  | "REVIEW_STARTED"
  | "SECTION_COMMENTED"
  | "SECTION_APPROVED"
  | "SECTION_APPROVAL_REMOVED"
  | "FEEDBACK_SENT"
  | "PLAN_APPROVED"
  | "SENT_FOR_SIGNATURE"
  | "SIGNED"
  | "ADMIN_REJECTED"
  | "STATE_CORRECTED"
  | "COORDINATOR_REASSIGNED"
  | "DEADLINE_CLEARED"
  | "TEACHER_UNASSIGNED"
  | "TEACHER_LINK_REMOVED_MANUAL"
  | "EDITOR_REASSIGNED_MANUAL";

export const AUDIT_EVENT_LABELS: Record<AuditEventType, string> = {
  PLAN_CREATED:             "PUM creado (primer acceso del docente)",
  FINALIZED:                "Enviado a revisión por el docente",
  TEACHER_RESUBMITTED:      "Reenviado a revisión tras correcciones del docente",
  REVIEW_STARTED:           "Revisión iniciada por el coordinador",
  SECTION_COMMENTED:        "Observación del coordinador",
  SECTION_APPROVED:         "Sección aprobada por el coordinador",
  SECTION_APPROVAL_REMOVED: "Aprobación de sección retirada",
  FEEDBACK_SENT:            "Retroalimentación enviada al docente",
  PLAN_APPROVED:            "PUM aprobado por el coordinador",
  SENT_FOR_SIGNATURE:       "Enviado a firma del administrador",
  SIGNED:                   "Firmado y aprobado por el administrador",
  ADMIN_REJECTED:           "Rechazado por el administrador",
  STATE_CORRECTED:          "Estado corregido por SuperAdmin",
  COORDINATOR_REASSIGNED:   "Coordinador reasignado por SuperAdmin",
  DEADLINE_CLEARED:         "Restricción de fecha límite retirada por SuperAdmin",
  TEACHER_UNASSIGNED:       "Docente removido de la materia/nivel",
  TEACHER_LINK_REMOVED_MANUAL: "Vínculo de docente corregido manualmente por SuperAdmin",
  EDITOR_REASSIGNED_MANUAL:    "Editor del PUM reasignado manualmente por SuperAdmin",
};

export const AUDIT_ACTOR_LABELS: Record<string, string> = {
  TEACHER:     "Docente",
  COORDINATOR: "Coordinador",
  ADMIN:       "Administrador",
  SUPERADMIN:  "Super Administrador",
  SYSTEM:      "Sistema",
};

export interface AuditHistoryItem {
  id: string;
  eventType: string;
  eventLabel: string;
  actorName:    string | null;
  actorRole:    string | null;
  actorRoleLabel: string | null;
  sectionKey:   string | null;
  sectionLabel: string | null;
  comment:      string | null;
  createdAt:    string; // ISO string — serializable through server actions
}

// ── Datos del bloque de firmas ────────────────────────────────────────────────

export interface SignatureBlockData {
  teacherNames: string[];
  finalizedAt: string | null;
  coordinatorName: string | null;
  coordinatorCedula: string | null;
  sentForSignatureAt: string | null;
  adminName: string | null;
  adminCedula: string | null;
  signedAt: string | null;
}

const log = logger.child("AuditService");

// ── Servicio ──────────────────────────────────────────────────────────────────

export const auditService = {
  /**
   * Registra un evento de auditoría del PUM.
   *
   * Con `tx`, el evento se escribe en la misma transacción que el cambio de
   * estado: si la auditoría falla, el cambio se revierte (no quedan cambios de
   * estado sin rastro). Sin `tx` (eventos informativos), un fallo se registra
   * en el log y no interrumpe el flujo.
   */
  async log(data: {
    planificationId: string;
    actorId?:    string | null;
    actorName?:  string | null;
    actorRole?:  string | null;
    eventType:   AuditEventType;
    sectionKey?: string | null;
    comment?:    string | null;
  }, tx?: Prisma.TransactionClient): Promise<void> {
    const sectionLabel = data.sectionKey
      ? (REVIEW_SECTION_LABELS[data.sectionKey as ReviewSectionKey] ?? data.sectionKey)
      : null;
    const event = {
      data: {
        planificationId: data.planificationId,
        actorId:         data.actorId   ?? null,
        actorName:       data.actorName ?? null,
        actorRole:       data.actorRole ?? null,
        eventType:       data.eventType,
        sectionKey:      data.sectionKey   ?? null,
        sectionLabel,
        comment:         data.comment ?? null,
      },
    };

    if (tx) {
      await tx.planAuditEvent.create(event);
      return;
    }

    try {
      await prisma.planAuditEvent.create(event);
    } catch (e) {
      log.error("No se pudo registrar el evento de auditoría", {
        planificationId: data.planificationId,
        eventType:       data.eventType,
        error:           String(e),
      });
    }
  },

  async getHistory(planificationId: string): Promise<AuditHistoryItem[]> {
    // Also fetch plan createdAt to include as the first synthetic event
    const [plan, events] = await Promise.all([
      prisma.planification.findUnique({
        where: { id: planificationId },
        select: {
          createdAt: true,
          teachers: { where: { isEditor: true }, select: { teacher: { select: { name: true } } } },
        },
      }),
      prisma.planAuditEvent.findMany({
        where: { planificationId },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const result: AuditHistoryItem[] = [];

    // Synthetic first event: plan creation (oldest, anchored to plan.createdAt)
    if (plan) {
      result.push({
        id:             "plan_created",
        eventType:      "PLAN_CREATED",
        eventLabel:     AUDIT_EVENT_LABELS.PLAN_CREATED,
        actorName:      plan.teachers[0]?.teacher.name ?? null,
        actorRole:      "TEACHER",
        actorRoleLabel: "Docente",
        sectionKey:     null,
        sectionLabel:   null,
        comment:        null,
        createdAt:      plan.createdAt.toISOString(),
      });
    }

    for (const e of events) {
      const eventType = e.eventType as AuditEventType;
      result.push({
        id:             e.id,
        eventType:      e.eventType,
        eventLabel:     AUDIT_EVENT_LABELS[eventType] ?? e.eventType,
        actorName:      e.actorName,
        actorRole:      e.actorRole,
        actorRoleLabel: e.actorRole ? (AUDIT_ACTOR_LABELS[e.actorRole] ?? e.actorRole) : null,
        sectionKey:     e.sectionKey,
        sectionLabel:   e.sectionLabel,
        comment:        e.comment,
        createdAt:      e.createdAt.toISOString(),
      });
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return result;
  },

  async getSignatureBlock(planificationId: string): Promise<SignatureBlockData | null> {
    const [plan, sentEvent, signedEvent] = await Promise.all([
      prisma.planification.findUnique({
        where: { id: planificationId },
        select: {
          finalizedAt: true,
          teachers: { include: { teacher: { select: { name: true } } } },
          review:   { include: { coordinator: { select: { name: true, cedula: true } } } },
        },
      }),
      prisma.planAuditEvent.findFirst({
        where: { planificationId, eventType: "SENT_FOR_SIGNATURE" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.planAuditEvent.findFirst({
        where: { planificationId, eventType: "SIGNED" },
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { cedula: true } } },
      }),
    ]);

    if (!plan) return null;

    return {
      teacherNames:       plan.teachers.map((t) => t.teacher.name ?? "—"),
      finalizedAt:        plan.finalizedAt?.toISOString() ?? null,
      coordinatorName:    plan.review?.coordinator.name    ?? null,
      coordinatorCedula:  plan.review?.coordinator.cedula  ?? null,
      sentForSignatureAt: sentEvent?.createdAt.toISOString()  ?? null,
      adminName:          signedEvent?.actorName              ?? null,
      adminCedula:        signedEvent?.actor?.cedula          ?? null,
      signedAt:           signedEvent?.createdAt.toISOString() ?? null,
    };
  },
};
