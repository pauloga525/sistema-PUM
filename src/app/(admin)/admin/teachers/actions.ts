"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleOrRedirect } from "@/lib/auth/session";
import { adminUsersService } from "@/modules/admin/admin-users.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger/logger";
import { IdSchema } from "@/lib/validation/ids";
import { ROUTES } from "@/constants/routes";

const log = logger.child("AdminTeachersActions");

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
  await requireRoleOrRedirect("ADMIN");
  const parsed = CreateTeacherSchema.safeParse({
    name:   field(formData, "name"),
    email:  field(formData, "email"),
    cedula: field(formData, "cedula"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  try {
    const { tempPassword } = await adminUsersService.createTeacher({ ...parsed.data, academicYearId: "", assignments: [] });
    revalidatePath(ROUTES.ADMIN.TEACHERS);
    return { ok: true, tempPassword };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    const code = (e as { code?: string }).code;
    if (code === "P2002") return { error: "Ya existe un usuario con ese correo o cédula (si está desactivado, un SuperAdmin puede reactivarlo)" };
    log.error("createTeacher unexpected error", { error: e });
    return { error: "Error al crear el docente. Inténtalo de nuevo." };
  }
}

export type DeleteTeacherState = { ok?: boolean; error?: string } | null;

export async function deleteTeacherAction(
  _prev: DeleteTeacherState,
  formData: FormData
): Promise<DeleteTeacherState> {
  const session = await requireRoleOrRedirect("ADMIN");
  const parsed = TeacherIdSchema.safeParse({ teacherId: field(formData, "teacherId") });
  if (!parsed.success) return { error: "ID de docente no válido" };

  try {
    await adminUsersService.deleteTeacher(parsed.data.teacherId, {
      actorId:   session.user.id,
      actorName: session.user.name ?? null,
    });
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
  const session = await requireRoleOrRedirect("ADMIN");
  const parsed  = TeacherIdSchema.safeParse({ teacherId: field(formData, "teacherId") });
  if (!parsed.success) return { error: "ID de docente no válido" };

  try {
    const { tempPassword } = await adminUsersService.resetTeacherPassword(parsed.data.teacherId, session.user.id);
    revalidatePath(ROUTES.ADMIN.TEACHERS);
    return { ok: true, tempPassword };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    log.error("resetTeacherPassword unexpected error", { error: e });
    return { error: "Error al resetear la contraseña" };
  }
}
