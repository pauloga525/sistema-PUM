"use server";

import { revalidatePath } from "next/cache";
import { adminService } from "@/modules/admin/admin.service";
import { ROUTES } from "@/constants/routes";

function parseDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  // Input type="date" gives YYYY-MM-DD — treat as end of that day (local midnight avoids off-by-one)
  const d = new Date(`${s}T23:59:59`);
  return isNaN(d.getTime()) ? null : d;
}

export async function setDeadlineAction(formData: FormData) {
  const planId   = (formData.get("planId")   ?? "").toString().trim();
  const deadline = (formData.get("deadline") ?? "").toString();
  if (!planId) return;
  await adminService.setDeadline(planId, parseDate(deadline));
  revalidatePath(ROUTES.ADMIN.DEADLINES);
}

export async function setBulkDeadlineAction(formData: FormData) {
  const yearId   = (formData.get("yearId")   ?? "").toString().trim();
  const periodId = (formData.get("periodId") ?? "").toString().trim();
  const deadline = (formData.get("deadline") ?? "").toString();
  if (!yearId || !periodId) return;
  await adminService.setBulkDeadline(yearId, periodId, parseDate(deadline));
  revalidatePath(ROUTES.ADMIN.DEADLINES);
}
