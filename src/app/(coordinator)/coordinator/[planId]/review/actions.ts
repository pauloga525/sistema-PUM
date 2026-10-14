"use server";

import { requireActiveSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { coordinatorService } from "@/modules/coordinator/coordinator.service";
import { auditService, type AuditHistoryItem } from "@/modules/audit/audit.service";
import { ROUTES } from "@/constants/routes";
import { UpdateSectionSchema } from "@/modules/coordinator/coordinator.schema";
import { IdSchema } from "@/lib/validation/ids";

export async function updateSectionAction(
  reviewId: string,
  sectionKey: string,
  approved: boolean,
  comment: string | null,
): Promise<{ success: boolean }> {
  const session = await requireActiveSession();
  if (!session || session.user.role !== "COORDINATOR") return { success: false };

  const parsed = UpdateSectionSchema.safeParse({ reviewId, sectionKey, approved, comment });
  if (!parsed.success) return { success: false };
  const input = parsed.data;

  const ok = await coordinatorService.updateSectionState(
    input.reviewId, session.user.id, input.sectionKey, input.approved, input.comment || null,
  );
  if (!ok) return { success: false };
  revalidatePath(ROUTES.COORDINATOR.RETROALIMENTACION);
  return { success: true };
}

export async function sendFeedbackAction(
  reviewId: string,
  planId: string,
): Promise<{ success: boolean }> {
  const session = await requireActiveSession();
  if (!session || session.user.role !== "COORDINATOR") return { success: false };
  if (!IdSchema.safeParse(reviewId).success || !IdSchema.safeParse(planId).success) return { success: false };

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
  const session = await requireActiveSession();
  if (!session || session.user.role !== "COORDINATOR") return { success: false };
  if (!IdSchema.safeParse(reviewId).success || !IdSchema.safeParse(planId).success) return { success: false };

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
