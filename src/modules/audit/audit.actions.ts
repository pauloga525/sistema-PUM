"use server";

import { redirect } from "next/navigation";
import { requireActiveSession } from "@/lib/auth/session";
import { ROUTES } from "@/constants/routes";
import { IdSchema } from "@/lib/validation/ids";
import { coordinatorService } from "@/modules/coordinator/coordinator.service";
import { auditService, type AuditHistoryItem } from "./audit.service";

/** Historial de auditoría de un PUM. Coordinador (con acceso al PUM) o admin. */
export async function getAuditHistoryAction(
  planId: string,
): Promise<{ success: boolean; data?: AuditHistoryItem[] }> {
  const session = await requireActiveSession();
  if (!session) redirect(ROUTES.LOGIN);
  // Accessible by coordinator and admin
  if (session.user.role !== "COORDINATOR" && session.user.role !== "ADMIN") {
    return { success: false };
  }
  if (!IdSchema.safeParse(planId).success) return { success: false };

  if (
    session.user.role === "COORDINATOR" &&
    !(await coordinatorService._coordinatorCanAccessPlan(session.user.id, planId))
  ) {
    return { success: false };
  }

  try {
    const data = await auditService.getHistory(planId);
    return { success: true, data };
  } catch {
    return { success: false };
  }
}
