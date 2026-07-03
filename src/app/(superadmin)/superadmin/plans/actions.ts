"use server";

import { auth } from "@/auth";
import { superAdminPlanService } from "@/modules/superadmin/superadmin-plan.service";
import { CorrectPlanStatusSchema, ReassignCoordinatorSchema } from "@/modules/superadmin/superadmin.schema";
import { hasMinRole } from "@/constants/levels";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";
import type { ActionResult } from "@/types";
import type { UserRole } from "@/constants/levels";
import type { CorrectPlanStatusInput, ReassignCoordinatorInput } from "@/modules/superadmin/superadmin.schema";

async function getSuperAdminSession() {
  const session = await auth();
  if (!session?.user?.id) throw new AppError(ErrorCode.AUTH_UNAUTHENTICATED, "No autenticado");
  if (!hasMinRole(session.user.role as UserRole, "SUPERADMIN")) {
    throw new AppError(ErrorCode.AUTH_UNAUTHORIZED, "Acceso exclusivo de SuperAdmin");
  }
  return session;
}

export async function correctPlanStatusAction(
  planId: string,
  data: CorrectPlanStatusInput,
): Promise<ActionResult> {
  try {
    const session = await getSuperAdminSession();
    const parsed  = CorrectPlanStatusSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    await superAdminPlanService.correctPlanStatus(
      session.user.id,
      session.user.name ?? session.user.email ?? "SuperAdmin",
      planId,
      parsed.data,
    );
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof AppError ? e.message : "Error al corregir el estado" };
  }
}

export async function reassignCoordinatorAction(
  planId: string,
  data: ReassignCoordinatorInput,
): Promise<ActionResult> {
  try {
    const session = await getSuperAdminSession();
    const parsed  = ReassignCoordinatorSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    await superAdminPlanService.reassignCoordinator(
      session.user.id,
      session.user.name ?? session.user.email ?? "SuperAdmin",
      planId,
      parsed.data,
    );
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof AppError ? e.message : "Error al reasignar coordinador" };
  }
}
