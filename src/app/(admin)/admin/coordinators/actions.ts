"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasMinRole } from "@/constants/levels";
import { adminService } from "@/modules/admin/admin.service";
import { ROUTES } from "@/constants/routes";

export type CoordinatorActionState = { ok: true } | { ok: false; error: string } | null;

export async function createCoordinatorAction(
  _prev: CoordinatorActionState,
  formData: FormData,
): Promise<CoordinatorActionState> {
  const session = await auth();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) redirect(ROUTES.LOGIN);

  const name            = formData.get("name") as string;
  const email           = formData.get("email") as string;
  const cedula          = formData.get("cedula") as string;
  const coordinatorArea = formData.get("coordinatorArea") as string;
  const teacherCount    = parseInt(formData.get("teacherCount") as string, 10) || 0;

  const teacherIds: string[] = [];
  for (let i = 0; i < teacherCount; i++) {
    const tid = formData.get(`teacherId_${i}`) as string;
    if (tid) teacherIds.push(tid);
  }

  try {
    await adminService.createCoordinator({ name, email, cedula, coordinatorArea, teacherIds });
    revalidatePath(ROUTES.ADMIN.COORDINATORS);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al crear el coordinador";
    return { ok: false, error: msg };
  }
}

export async function setCoordinatorSubjectsAction(
  coordinatorId: string,
  subjectIds: string[],
): Promise<CoordinatorActionState> {
  const session = await auth();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) return { ok: false, error: "No autorizado" };

  try {
    await adminService.setCoordinatorSubjects(coordinatorId, subjectIds);
    revalidatePath(ROUTES.ADMIN.COORDINATORS);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al guardar materias";
    return { ok: false, error: msg };
  }
}

export async function promoteTeacherToCoordinatorAction(
  _prev: CoordinatorActionState,
  formData: FormData,
): Promise<CoordinatorActionState> {
  const session = await auth();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) redirect(ROUTES.LOGIN);

  const teacherId       = formData.get("teacherId") as string;
  const coordinatorArea = formData.get("coordinatorArea") as string;
  const teacherCount    = parseInt(formData.get("teacherCount") as string, 10) || 0;

  const teacherIds: string[] = [];
  for (let i = 0; i < teacherCount; i++) {
    const tid = formData.get(`teacherId_${i}`) as string;
    if (tid) teacherIds.push(tid);
  }

  try {
    await adminService.promoteTeacherToCoordinator({ teacherId, coordinatorArea, teacherIds });
    revalidatePath(ROUTES.ADMIN.COORDINATORS);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al promover al docente";
    return { ok: false, error: msg };
  }
}

export async function addCoordinatorTeacherAction(
  coordinatorId: string,
  teacherId: string,
): Promise<CoordinatorActionState> {
  const session = await auth();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) return { ok: false, error: "No autorizado" };

  try {
    await adminService.addCoordinatorTeacher(coordinatorId, teacherId);
    revalidatePath(ROUTES.ADMIN.COORDINATORS);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al agregar docente";
    return { ok: false, error: msg };
  }
}

export async function removeCoordinatorAssignmentAction(
  assignmentId: string,
): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) return { ok: false };

  try {
    await adminService.removeCoordinatorAssignment(assignmentId);
    revalidatePath(ROUTES.ADMIN.COORDINATORS);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function deleteCoordinatorAction(
  coordinatorId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) return { ok: false };

  try {
    await adminService.deleteCoordinator(coordinatorId);
    revalidatePath(ROUTES.ADMIN.COORDINATORS);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al eliminar";
    return { ok: false, error: msg };
  }
}

export async function resetCoordinatorPasswordAction(
  coordinatorId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) return { ok: false, error: "No autorizado" };

  try {
    await adminService.resetCoordinatorPassword(coordinatorId);
    revalidatePath(ROUTES.ADMIN.COORDINATORS);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al restablecer la contraseña";
    return { ok: false, error: msg };
  }
}
