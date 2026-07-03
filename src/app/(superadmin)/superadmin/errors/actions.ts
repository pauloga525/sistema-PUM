"use server";

import { auth } from "@/auth";
import { errorMonitorService } from "@/modules/monitoring/error-monitor.service";
import { hasMinRole } from "@/constants/levels";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";
import type { ActionResult } from "@/types";
import type { UserRole } from "@/constants/levels";

async function getSuperAdminSession() {
  const session = await auth();
  if (!session?.user?.id) throw new AppError(ErrorCode.AUTH_UNAUTHENTICATED, "No autenticado");
  if (!hasMinRole(session.user.role as UserRole, "SUPERADMIN")) {
    throw new AppError(ErrorCode.AUTH_UNAUTHORIZED, "Acceso exclusivo de SuperAdmin");
  }
  return session;
}

export async function resolveErrorAction(
  errorId: string,
  note: string,
): Promise<ActionResult> {
  try {
    const session = await getSuperAdminSession();
    await errorMonitorService.resolveError(session.user.id, errorId, note);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof AppError ? e.message : "Error al resolver" };
  }
}

export async function reopenErrorAction(errorId: string): Promise<ActionResult> {
  try {
    await getSuperAdminSession();
    await errorMonitorService.reopenError(errorId);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof AppError ? e.message : "Error al reabrir" };
  }
}
