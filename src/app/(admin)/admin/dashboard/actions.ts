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

export async function signPlanAction(planId: string): Promise<{ success: boolean }> {
  await requireAdmin();
  try {
    await adminService.signPlan(planId);
    revalidatePath(ROUTES.ADMIN.DASHBOARD);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function rejectPlanAction(planId: string, comment: string): Promise<{ success: boolean }> {
  await requireAdmin();
  if (!comment.trim()) return { success: false };
  try {
    await adminService.rejectPlan(planId, comment.trim());
    revalidatePath(ROUTES.ADMIN.DASHBOARD);
    return { success: true };
  } catch {
    return { success: false };
  }
}
