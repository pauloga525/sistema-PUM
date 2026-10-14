"use server";

import { revalidatePath } from "next/cache";
import { requireRoleOrRedirect } from "@/lib/auth/session";
import { adminAssignmentsService } from "@/modules/admin/admin-assignments.service";
import { AppError } from "@/lib/errors/app-error";
import { ROUTES } from "@/constants/routes";
import { IdSchema } from "@/lib/validation/ids";

const isId = (v: string) => IdSchema.safeParse(v).success;

export type AssignmentActionState = { ok?: boolean; error?: string } | null;

export async function createAssignmentAction(
  _prev: AssignmentActionState,
  formData: FormData
): Promise<AssignmentActionState> {
  await requireRoleOrRedirect("ADMIN");
  const teacherId      = (formData.get("teacherId")      ?? "").toString().trim();
  const subjectId      = (formData.get("subjectId")      ?? "").toString().trim();
  const levelId        = (formData.get("levelId")        ?? "").toString().trim();
  const academicYearId = (formData.get("academicYearId") ?? "").toString().trim();

  if (![teacherId, subjectId, levelId, academicYearId].every(isId)) {
    return { error: "Todos los campos obligatorios deben estar completos." };
  }

  try {
    await adminAssignmentsService.createAssignment({ teacherId, subjectId, levelId, academicYearId, periodId: null });
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
  await requireRoleOrRedirect("ADMIN");
  const id        = (formData.get("id")        ?? "").toString().trim();
  const subjectId = (formData.get("subjectId") ?? "").toString().trim();
  const levelId   = (formData.get("levelId")   ?? "").toString().trim();
  const periodId  = (formData.get("periodId")  ?? "").toString().trim() || null;

  if (![id, subjectId, levelId].every(isId) || (periodId !== null && !isId(periodId))) {
    return { error: "Datos incompletos para actualizar la asignación." };
  }

  try {
    await adminAssignmentsService.updateAssignment(id, { subjectId, levelId, periodId });
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
  const session = await requireRoleOrRedirect("ADMIN");
  const id = (formData.get("id") ?? "").toString().trim();
  if (!isId(id)) return { error: "ID de asignación requerido." };
  try {
    const result = await adminAssignmentsService.removeAssignment(id, {
      actorId:   session.user.id,
      actorName: session.user.name ?? session.user.email ?? "Admin",
      actorRole: "ADMIN",
    });
    if (!result.ok) return { error: result.error };
    revalidatePath(ROUTES.ADMIN.ASSIGNMENTS);
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    return { error: "No se pudo eliminar la asignación." };
  }
}
