"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { hasMinRole } from "@/constants/levels";
import { adminService } from "@/modules/admin/admin.service";
import { AppError } from "@/lib/errors/app-error";
import { ROUTES } from "@/constants/routes";

async function requireAdmin() {
  const session = await auth();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) redirect(ROUTES.LOGIN);
  return session;
}

export type AssignmentActionState = { ok?: boolean; error?: string } | null;

export async function createAssignmentAction(
  _prev: AssignmentActionState,
  formData: FormData
): Promise<AssignmentActionState> {
  await requireAdmin();
  const teacherId      = (formData.get("teacherId")      ?? "").toString().trim();
  const subjectId      = (formData.get("subjectId")      ?? "").toString().trim();
  const levelId        = (formData.get("levelId")        ?? "").toString().trim();
  const academicYearId = (formData.get("academicYearId") ?? "").toString().trim();

  if (!teacherId || !subjectId || !levelId || !academicYearId) {
    return { error: "Todos los campos obligatorios deben estar completos." };
  }

  try {
    await adminService.createAssignment({ teacherId, subjectId, levelId, academicYearId, periodId: null });
    revalidatePath(ROUTES.ADMIN.ASSIGNMENTS);
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    return { error: "No se pudo guardar la asignación. Intenta de nuevo." };
  }
}

export async function updateAssignmentAction(
  _prev: AssignmentActionState,
  formData: FormData
): Promise<AssignmentActionState> {
  await requireAdmin();
  const id        = (formData.get("id")        ?? "").toString().trim();
  const subjectId = (formData.get("subjectId") ?? "").toString().trim();
  const levelId   = (formData.get("levelId")   ?? "").toString().trim();
  const periodId  = (formData.get("periodId")  ?? "").toString().trim() || null;

  if (!id || !subjectId || !levelId) {
    return { error: "Datos incompletos para actualizar la asignación." };
  }

  try {
    await adminService.updateAssignment(id, { subjectId, levelId, periodId });
    revalidatePath(ROUTES.ADMIN.ASSIGNMENTS);
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    return { error: "No se pudo actualizar la asignación." };
  }
}

export async function removeAssignmentAction(
  _prev: AssignmentActionState,
  formData: FormData
): Promise<AssignmentActionState> {
  await requireAdmin();
  const id = (formData.get("id") ?? "").toString().trim();
  if (!id) return { error: "ID de asignación requerido." };
  try {
    await adminService.removeAssignment(id);
    revalidatePath(ROUTES.ADMIN.ASSIGNMENTS);
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    return { error: "No se pudo eliminar la asignación." };
  }
}
