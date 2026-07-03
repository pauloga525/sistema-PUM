import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";

export const USER_AUDIT_EVENT = {
  // Sesiones
  LOGIN_SUCCESS:   "LOGIN_SUCCESS",
  LOGIN_FAILED:    "LOGIN_FAILED",
  LOGOUT:          "LOGOUT",
  // Usuarios
  USER_CREATED:    "USER_CREATED",
  USER_UPDATED:    "USER_UPDATED",
  USER_DEACTIVATED:"USER_DEACTIVATED",
  USER_REACTIVATED:"USER_REACTIVATED",
  USER_DELETED:    "USER_DELETED",
  USER_PASSWORD_RESET: "USER_PASSWORD_RESET",
  // Roles
  USER_ROLE_CHANGED: "USER_ROLE_CHANGED",
  PRIVILEGE_ESCALATION_BLOCKED: "PRIVILEGE_ESCALATION_BLOCKED",
  // Acciones admin sobre PUM
  PLAN_STATE_CORRECTED:  "PLAN_STATE_CORRECTED",
  COORDINATOR_REASSIGNED:"COORDINATOR_REASSIGNED",
} as const;

export type UserAuditEventType = typeof USER_AUDIT_EVENT[keyof typeof USER_AUDIT_EVENT];

export interface LogUserEventInput {
  eventType: UserAuditEventType;
  result?: "SUCCESS" | "FAILURE";
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  actorIp?: string | null;
  targetId?: string | null;
  targetEmail?: string | null;
  targetRole?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}

async function log(data: LogUserEventInput): Promise<void> {
  try {
    await prisma.userAuditLog.create({
      data: {
        eventType:   data.eventType,
        result:      data.result ?? "SUCCESS",
        actorId:     data.actorId ?? null,
        actorEmail:  data.actorEmail ?? null,
        actorRole:   data.actorRole ?? null,
        actorIp:     data.actorIp ?? null,
        targetId:    data.targetId ?? null,
        targetEmail: data.targetEmail ?? null,
        targetRole:  data.targetRole ?? null,
        metadata:    data.metadata ?? Prisma.JsonNull,
      },
    });
  } catch {
    // Nunca romper el flujo principal por un fallo de auditoría
  }
}

export const userAuditService = { log };
