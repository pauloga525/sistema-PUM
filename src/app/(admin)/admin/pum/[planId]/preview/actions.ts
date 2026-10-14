"use server";

import { requireRoleOrRedirect } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { adminSignatureService } from "@/modules/admin/admin-signature.service";
import { ROUTES } from "@/constants/routes";
import { IdSchema } from "@/lib/validation/ids";

const MAX_REJECT_COMMENT = 2000;

export async function signPlanPreviewAction(planId: string): Promise<{ success: boolean }> {
  const session = await requireRoleOrRedirect("ADMIN");
  if (!IdSchema.safeParse(planId).success) return { success: false };
  try {
    await adminSignatureService.signPlan(planId, session.user.id, session.user.name ?? undefined);
    revalidatePath(ROUTES.ADMIN.DASHBOARD);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function rejectPlanPreviewAction(planId: string, comment: string): Promise<{ success: boolean }> {
  const session = await requireRoleOrRedirect("ADMIN");
  if (!IdSchema.safeParse(planId).success) return { success: false };
  if (typeof comment !== "string" || !comment.trim() || comment.trim().length > MAX_REJECT_COMMENT) {
    return { success: false };
  }
  try {
    await adminSignatureService.rejectPlan(planId, comment.trim(), session.user.id, session.user.name ?? undefined);
    revalidatePath(ROUTES.ADMIN.DASHBOARD);
    return { success: true };
  } catch {
    return { success: false };
  }
}
