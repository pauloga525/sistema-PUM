"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { hasMinRole } from "@/constants/levels";
import { adminService } from "@/modules/admin/admin.service";
import { ROUTES } from "@/constants/routes";

async function requireAdmin() {
  const session = await auth();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) redirect(ROUTES.LOGIN);
  return session;
}

function parseDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  // Input type="date" gives YYYY-MM-DD — treat as end of that day (local midnight avoids off-by-one)
  const d = new Date(`${s}T23:59:59`);
  return isNaN(d.getTime()) ? null : d;
}

export async function setDeadlineAction(formData: FormData) {
  await requireAdmin();
  const planId   = (formData.get("planId")   ?? "").toString().trim();
  const deadline = (formData.get("deadline") ?? "").toString();
  if (!planId) return;
  await adminService.setDeadline(planId, parseDate(deadline));
  revalidatePath(ROUTES.ADMIN.DEADLINES);
}

export async function setBulkDeadlineAction(formData: FormData) {
  await requireAdmin();
  const yearId   = (formData.get("yearId")   ?? "").toString().trim();
  const periodId = (formData.get("periodId") ?? "").toString().trim();
  const deadline = (formData.get("deadline") ?? "").toString();
  if (!yearId || !periodId) return;
  await adminService.setBulkDeadline(yearId, periodId, parseDate(deadline));
  revalidatePath(ROUTES.ADMIN.DEADLINES);
}
