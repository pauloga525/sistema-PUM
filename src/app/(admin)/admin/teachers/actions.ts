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

export type TeacherActionState = { ok?: boolean; error?: string } | null;
export type ResetPasswordState = { ok?: boolean; error?: string } | null;

export async function createTeacherAction(
  _prev: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  await requireAdmin();
  try {
    const name   = (formData.get("name")   as string ?? "").trim();
    const email  = (formData.get("email")  as string ?? "").trim();
    const cedula = (formData.get("cedula") as string ?? "").trim();

    await adminService.createTeacher({ name, email, cedula, academicYearId: "", assignments: [] });
    revalidatePath(ROUTES.ADMIN.TEACHERS);
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    const code = (e as { code?: string }).code;
    if (code === "P2002") return { error: "Ya existe un docente con ese correo o cédula" };
    return { error: "Error al crear el docente. Inténtalo de nuevo." };
  }
}

export type DeleteTeacherState = { ok?: boolean; error?: string } | null;

export async function deleteTeacherAction(
  _prev: DeleteTeacherState,
  formData: FormData
): Promise<DeleteTeacherState> {
  await requireAdmin();
  try {
    const teacherId = (formData.get("teacherId") as string ?? "").trim();
    if (!teacherId) return { error: "ID de docente no válido" };
    await adminService.deleteTeacher(teacherId);
    revalidatePath(ROUTES.ADMIN.TEACHERS);
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    return { error: "Error al eliminar el docente." };
  }
}

export async function resetTeacherPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  await requireAdmin();
  try {
    const teacherId = (formData.get("teacherId") as string ?? "").trim();
    if (!teacherId) return { error: "ID de docente no válido" };
    await adminService.resetTeacherPassword(teacherId);
    revalidatePath(ROUTES.ADMIN.TEACHERS);
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    return { error: "Error al resetear la contraseña" };
  }
}
