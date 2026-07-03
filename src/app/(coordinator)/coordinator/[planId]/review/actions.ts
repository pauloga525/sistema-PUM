"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { coordinatorService } from "@/modules/coordinator/coordinator.service";
import { auditService, type AuditHistoryItem } from "@/modules/audit/audit.service";
import { ROUTES } from "@/constants/routes";

export async function updateSectionAction(
  reviewId: string,
  sectionKey: string,
  approved: boolean,
  comment: string | null,
): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session || session.user.role !== "COORDINATOR") return { success: false };

  await coordinatorService.updateSectionState(reviewId, session.user.id, sectionKey, approved, comment);
  revalidatePath(ROUTES.COORDINATOR.RETROALIMENTACION);
  return { success: true };
}

export async function sendFeedbackAction(
  reviewId: string,
  planId: string,
): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session || session.user.role !== "COORDINATOR") return { success: false };

  try {
    const ok = await coordinatorService.sendFeedback(reviewId, session.user.id);
    if (!ok) return { success: false };
    revalidatePath(ROUTES.COORDINATOR.RETROALIMENTACION);
    revalidatePath(ROUTES.COORDINATOR.review(planId));
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function approvePlanAction(
  reviewId: string,
  planId: string,
): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session || session.user.role !== "COORDINATOR") return { success: false };

  try {
    const ok = await coordinatorService.approvePlan(reviewId, session.user.id);
    if (!ok) return { success: false };
    revalidatePath(ROUTES.COORDINATOR.RETROALIMENTACION);
    revalidatePath(ROUTES.COORDINATOR.review(planId));
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function getAuditHistoryAction(
  planId: string,
): Promise<{ success: boolean; data?: AuditHistoryItem[] }> {
  const session = await auth();
  if (!session) redirect(ROUTES.LOGIN);
  // Accessible by coordinator and admin
  if (session.user.role !== "COORDINATOR" && session.user.role !== "ADMIN") {
    return { success: false };
  }

  try {
    const data = await auditService.getHistory(planId);
    return { success: true, data };
  } catch {
    return { success: false };
  }
}
