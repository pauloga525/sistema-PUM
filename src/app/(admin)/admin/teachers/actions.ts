"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActiveSession } from "@/lib/auth/session";
import { hasMinRole } from "@/constants/levels";
import { adminService } from "@/modules/admin/admin.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger/logger";
import { IdSchema } from "@/lib/validation/ids";
import { ROUTES } from "@/constants/routes";

const log = logger.child("AdminTeachersActions");

async function requireAdmin() {
  const session = await requireActiveSession();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) redirect(ROUTES.LOGIN);
  return session;
}

// ── Validación de entrada ─────────────────────────────────────────────────────

const CreateTeacherSchema = z.object({
  name:   z.string().trim().min(1, "El nombre completo es obligatorio").max(100, "El nombre es demasiado largo"),
  email:  z.string().trim().max(254, "El correo es demasiado largo").pipe(z.email("Correo inválido")),
  cedula: z.string().trim().regex(/^\d{10}$/, "La cédula debe tener exactamente 10 dígitos"),
});

const TeacherIdSchema = z.object({ teacherId: IdSchema });

/** Lee un campo de texto del FormData (los File u otros valores se ignoran). */
function field(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export type TeacherActionState = { ok?: boolean; error?: string; tempPassword?: string } | null;
export type ResetPasswordState = { ok?: boolean; error?: string; tempPassword?: string } | null;

export async function createTeacherAction(
  _prev: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  await requireAdmin();
  const parsed = CreateTeacherSchema.safeParse({
    name:   field(formData, "name"),
    email:  field(formData, "email"),
    cedula: field(formData, "cedula"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  try {
    const { tempPassword } = await adminService.createTeacher({ ...parsed.data, academicYearId: "", assignments: [] });
    revalidatePath(ROUTES.ADMIN.TEACHERS);
    return { ok: true, tempPassword };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    const code = (e as { code?: string }).code;
    if (code === "P2002") return { error: "Ya existe un docente con ese correo o cédula" };
    log.error("createTeacher unexpected error", { error: e });
    return { error: "Error al crear el docente. Inténtalo de nuevo." };
  }
}

export type DeleteTeacherState = { ok?: boolean; error?: string } | null;

export async function deleteTeacherAction(
  _prev: DeleteTeacherState,
  formData: FormData
): Promise<DeleteTeacherState> {
  await requireAdmin();
  const parsed = TeacherIdSchema.safeParse({ teacherId: field(formData, "teacherId") });
  if (!parsed.success) return { error: "ID de docente no válido" };

  try {
    await adminService.deleteTeacher(parsed.data.teacherId);
    revalidatePath(ROUTES.ADMIN.TEACHERS);
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    log.error("deleteTeacher unexpected error", { error: e });
    return { error: "Error al eliminar el docente." };
  }
}

export async function resetTeacherPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const session = await requireAdmin();
  const parsed  = TeacherIdSchema.safeParse({ teacherId: field(formData, "teacherId") });
  if (!parsed.success) return { error: "ID de docente no válido" };

  try {
    const { tempPassword } = await adminService.resetTeacherPassword(parsed.data.teacherId, session.user.id);
    revalidatePath(ROUTES.ADMIN.TEACHERS);
    return { ok: true, tempPassword };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    log.error("resetTeacherPassword unexpected error", { error: e });
    return { error: "Error al resetear la contraseña" };
  }
}
