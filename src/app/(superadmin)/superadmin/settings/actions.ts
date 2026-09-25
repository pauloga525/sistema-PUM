"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { hasMinRole } from "@/constants/levels";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";
import { ROUTES } from "@/constants/routes";
import { setMaintenanceMode } from "@/modules/system/system-settings.service";
import { userAuditService, USER_AUDIT_EVENT } from "@/modules/audit/user-audit.service";
import type { ActionResult } from "@/types";

async function getSuperAdminSession() {
  const session = await auth();
  if (!session?.user?.id) throw new AppError(ErrorCode.AUTH_UNAUTHENTICATED, "No autenticado");
  if (!hasMinRole(session.user.role, "SUPERADMIN")) {
    throw new AppError(ErrorCode.AUTH_UNAUTHORIZED, "Acceso exclusivo de SuperAdmin");
  }
  return session;
}

export async function toggleMaintenanceModeAction(
  enabled: boolean,
  message: string | null,
): Promise<ActionResult> {
  try {
    const session = await getSuperAdminSession();

    await setMaintenanceMode(enabled, message, session.user.id);

    await userAuditService.log({
      eventType:  enabled ? USER_AUDIT_EVENT.MAINTENANCE_MODE_ENABLED : USER_AUDIT_EVENT.MAINTENANCE_MODE_DISABLED,
      actorId:    session.user.id,
      actorEmail: session.user.email ?? null,
      actorRole:  session.user.role,
      metadata:   message ? { message } : undefined,
    });

    revalidatePath(ROUTES.SUPERADMIN.SETTINGS);
    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof AppError ? e.message : "Error al actualizar el modo mantenimiento",
    };
  }
}
