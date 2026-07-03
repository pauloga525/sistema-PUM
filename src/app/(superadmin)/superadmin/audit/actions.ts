"use server";

import { auth } from "@/auth";
import { auditService } from "@/modules/audit/audit.service";
import { hasMinRole } from "@/constants/levels";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";
import type { ActionResult } from "@/types";
import type { AuditHistoryItem } from "@/modules/audit/audit.service";
import type { UserRole } from "@/constants/levels";

export async function getPlanHistoryAction(
  planId: string,
): Promise<ActionResult<AuditHistoryItem[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new AppError(ErrorCode.AUTH_UNAUTHENTICATED, "No autenticado");
    if (!hasMinRole(session.user.role as UserRole, "SUPERADMIN")) {
      throw new AppError(ErrorCode.AUTH_UNAUTHORIZED, "Acceso exclusivo de SuperAdmin");
    }
    const history = await auditService.getHistory(planId);
    return { success: true, data: history };
  } catch (e) {
    return { success: false, error: e instanceof AppError ? e.message : "Error al cargar el historial" };
  }
}
