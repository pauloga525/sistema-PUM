"use server";

import { requireActiveSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasMinRole } from "@/constants/levels";
import { adminService } from "@/modules/admin/admin.service";
import { ROUTES } from "@/constants/routes";
import { IdSchema } from "@/lib/validation/ids";

const MAX_REJECT_COMMENT = 2000;

async function requireAdmin() {
  const session = await requireActiveSession();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) redirect(ROUTES.LOGIN);
  return session;
}

export async function signPlanAction(planId: string): Promise<{ success: boolean }> {
  const session = await requireAdmin();
  if (!IdSchema.safeParse(planId).success) return { success: false };
  try {
    await adminService.signPlan(planId, session.user.id, session.user.name ?? undefined);
    revalidatePath(ROUTES.ADMIN.DASHBOARD);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function rejectPlanAction(planId: string, comment: string): Promise<{ success: boolean }> {
  const session = await requireAdmin();
  if (!IdSchema.safeParse(planId).success) return { success: false };
  if (typeof comment !== "string" || !comment.trim() || comment.trim().length > MAX_REJECT_COMMENT) {
    return { success: false };
  }
  try {
    await adminService.rejectPlan(planId, comment.trim(), session.user.id, session.user.name ?? undefined);
    revalidatePath(ROUTES.ADMIN.DASHBOARD);
    return { success: true };
  } catch {
    return { success: false };
  }
}
