"use server";

import { auth } from "@/auth";
import { superAdminService } from "@/modules/superadmin/superadmin.service";
import { CreateUserSchema, UpdateUserSchema, ChangeRoleSchema } from "@/modules/superadmin/superadmin.schema";
import { hasMinRole } from "@/constants/levels";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";
import type { ActionResult } from "@/types";
import type { UserRole } from "@/constants/levels";
import type { CreateUserInput, UpdateUserInput } from "@/modules/superadmin/superadmin.schema";
import { rateLimitService, RATE_LIMITS } from "@/modules/security/rate-limit.service";

async function getSuperAdminSession() {
  const session = await auth();
  if (!session?.user?.id) throw new AppError(ErrorCode.AUTH_UNAUTHENTICATED, "No autenticado");
  if (!hasMinRole(session.user.role as UserRole, "SUPERADMIN")) {
    throw new AppError(ErrorCode.AUTH_UNAUTHORIZED, "Acceso exclusivo de SuperAdmin");
  }
  return session;
}

export async function createUserAction(data: CreateUserInput): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getSuperAdminSession();
    const rl = await rateLimitService.check(
      `sa:create:${session.user.id}`,
      RATE_LIMITS.SA_CREATE_USER.limit,
      RATE_LIMITS.SA_CREATE_USER.windowMs,
    );
    if (!rl.allowed) return { success: false, error: "Demasiadas creaciones en poco tiempo. Intenta más tarde." };
    const parsed = CreateUserSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    const user = await superAdminService.createUser(session.user.id, parsed.data);
    return { success: true, data: { id: user.id } };
  } catch (e) {
    return { success: false, error: e instanceof AppError ? e.message : "Error al crear el usuario" };
  }
}

export async function updateUserAction(userId: string, data: UpdateUserInput): Promise<ActionResult> {
  try {
    const session = await getSuperAdminSession();
    const parsed = UpdateUserSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    await superAdminService.updateUser(session.user.id, userId, parsed.data);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof AppError ? e.message : "Error al actualizar el usuario" };
  }
}

export async function changeRoleAction(userId: string, newRole: string): Promise<ActionResult> {
  try {
    const session = await getSuperAdminSession();
    const parsed = ChangeRoleSchema.safeParse({ newRole });
    if (!parsed.success) return { success: false, error: "Rol inválido" };
    await superAdminService.changeRole(session.user.id, userId, parsed.data.newRole);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof AppError ? e.message : "Error al cambiar el rol" };
  }
}

export async function deactivateUserAction(userId: string): Promise<ActionResult> {
  try {
    const session = await getSuperAdminSession();
    await superAdminService.deactivateUser(session.user.id, userId);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof AppError ? e.message : "Error al desactivar el usuario" };
  }
}

export async function reactivateUserAction(userId: string): Promise<ActionResult> {
  try {
    const session = await getSuperAdminSession();
    await superAdminService.reactivateUser(session.user.id, userId);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof AppError ? e.message : "Error al reactivar el usuario" };
  }
}

export async function resetPasswordAction(userId: string): Promise<ActionResult<{ tempPassword: string }>> {
  try {
    const session = await getSuperAdminSession();
    const rl = await rateLimitService.check(
      `sa:reset:${session.user.id}`,
      RATE_LIMITS.SA_RESET_PASS.limit,
      RATE_LIMITS.SA_RESET_PASS.windowMs,
    );
    if (!rl.allowed) return { success: false, error: "Demasiados resets en poco tiempo. Intenta en una hora." };
    const result = await superAdminService.resetPassword(session.user.id, userId);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e instanceof AppError ? e.message : "Error al restablecer la contraseña" };
  }
}
