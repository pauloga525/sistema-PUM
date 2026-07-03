"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminService } from "@/modules/admin/admin.service";
import { ROUTES } from "@/constants/routes";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect(ROUTES.LOGIN);
  return session;
}

export async function signPlanPreviewAction(planId: string): Promise<{ success: boolean }> {
  const session = await requireAdmin();
  try {
    await adminService.signPlan(planId, session.user.id, session.user.name ?? undefined);
    revalidatePath(ROUTES.ADMIN.DASHBOARD);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function rejectPlanPreviewAction(planId: string, comment: string): Promise<{ success: boolean }> {
  const session = await requireAdmin();
  if (!comment.trim()) return { success: false };
  try {
    await adminService.rejectPlan(planId, comment.trim(), session.user.id, session.user.name ?? undefined);
    revalidatePath(ROUTES.ADMIN.DASHBOARD);
    return { success: true };
  } catch {
    return { success: false };
  }
}
