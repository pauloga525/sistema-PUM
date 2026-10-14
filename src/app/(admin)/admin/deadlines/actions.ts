"use server";

import { revalidatePath } from "next/cache";
import { requireRoleOrRedirect } from "@/lib/auth/session";
import { adminAssignmentsService } from "@/modules/admin/admin-assignments.service";
import { ROUTES } from "@/constants/routes";
import { IdSchema } from "@/lib/validation/ids";

function parseDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  // Input type="date" gives YYYY-MM-DD — treat as end of that day (local midnight avoids off-by-one)
  const d = new Date(`${s}T23:59:59`);
  return isNaN(d.getTime()) ? null : d;
}

export async function setDeadlineAction(formData: FormData) {
  await requireRoleOrRedirect("ADMIN");
  const planId   = (formData.get("planId")   ?? "").toString().trim();
  const deadline = (formData.get("deadline") ?? "").toString();
  if (!IdSchema.safeParse(planId).success) return;
  await adminAssignmentsService.setDeadline(planId, parseDate(deadline));
  revalidatePath(ROUTES.ADMIN.DEADLINES);
}

export async function setBulkDeadlineAction(formData: FormData) {
  await requireRoleOrRedirect("ADMIN");
  const yearId   = (formData.get("yearId")   ?? "").toString().trim();
  const periodId = (formData.get("periodId") ?? "").toString().trim();
  const deadline = (formData.get("deadline") ?? "").toString();
  if (!IdSchema.safeParse(yearId).success || !IdSchema.safeParse(periodId).success) return;
  await adminAssignmentsService.setBulkDeadline(yearId, periodId, parseDate(deadline));
  revalidatePath(ROUTES.ADMIN.DEADLINES);
}
