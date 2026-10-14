"use server";

import { z } from "zod";
import { requireActiveSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasMinRole } from "@/constants/levels";
import { adminService } from "@/modules/admin/admin.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger/logger";
import { IdSchema } from "@/lib/validation/ids";
import { ROUTES } from "@/constants/routes";

const log = logger.child("AdminCoordinatorsActions");

export type CoordinatorActionState = { ok: true; tempPassword?: string } | { ok: false; error: string } | null;

// ── Validación de entrada ─────────────────────────────────────────────────────

// Tope de docentes/materias por envío: evita bucles y createMany gigantes con datos manipulados
const MAX_LINKED_ITEMS = 500;

const AreaSchema = z.string().trim().max(100, "El área es demasiado larga");

const IdListSchema = z.array(IdSchema).max(MAX_LINKED_ITEMS, "Demasiados elementos seleccionados");

const CreateCoordinatorSchema = z.object({
  name:            z.string().trim().min(1, "El nombre completo es obligatorio").max(100, "El nombre es demasiado largo"),
  email:           z.string().trim().max(254, "El correo es demasiado largo").pipe(z.email("Correo inválido")),
  cedula:          z.string().trim().regex(/^\d{10}$/, "La cédula debe tener exactamente 10 dígitos"),
  coordinatorArea: AreaSchema,
  teacherIds:      IdListSchema,
});

const PromoteTeacherSchema = z.object({
  teacherId:       IdSchema,
  coordinatorArea: AreaSchema,
  teacherIds:      IdListSchema,
});

/** Lee un campo de texto del FormData (los File u otros valores se ignoran). */
function field(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

/** Lee la lista teacherId_0..teacherId_{n-1}; n viene del cliente, así que se acota. */
function teacherIdsFrom(formData: FormData): string[] {
  const count = z.coerce.number().int().min(0).max(MAX_LINKED_ITEMS).catch(0).parse(field(formData, "teacherCount"));
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const tid = field(formData, `teacherId_${i}`);
    if (tid) ids.push(tid);
  }
  return ids;
}

/** Solo los AppError llevan mensajes pensados para el usuario; el resto se registra. */
function toErrorMessage(e: unknown, context: string, fallback: string): string {
  if (e instanceof AppError) return e.message;
  log.error(`${context} unexpected error`, { error: e });
  return fallback;
}

export async function createCoordinatorAction(
  _prev: CoordinatorActionState,
  formData: FormData,
): Promise<CoordinatorActionState> {
  const session = await requireActiveSession();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) redirect(ROUTES.LOGIN);

  const parsed = CreateCoordinatorSchema.safeParse({
    name:            field(formData, "name"),
    email:           field(formData, "email"),
    cedula:          field(formData, "cedula"),
    coordinatorArea: field(formData, "coordinatorArea"),
    teacherIds:      teacherIdsFrom(formData),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  try {
    const { tempPassword } = await adminService.createCoordinator(parsed.data);
    revalidatePath(ROUTES.ADMIN.COORDINATORS);
    return { ok: true, tempPassword };
  } catch (e: unknown) {
    const code = (e as { code?: string }).code;
    if (!(e instanceof AppError) && code === "P2002") return { ok: false, error: "Ya existe un usuario con ese correo o cédula" };
    return { ok: false, error: toErrorMessage(e, "createCoordinator", "Error al crear el coordinador") };
  }
}

export async function setCoordinatorSubjectsAction(
  coordinatorId: string,
  subjectIds: string[],
): Promise<CoordinatorActionState> {
  const session = await requireActiveSession();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) return { ok: false, error: "No autorizado" };

  const parsed = z.object({ coordinatorId: IdSchema, subjectIds: IdListSchema }).safeParse({ coordinatorId, subjectIds });
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  try {
    await adminService.setCoordinatorSubjects(parsed.data.coordinatorId, parsed.data.subjectIds);
    revalidatePath(ROUTES.ADMIN.COORDINATORS);
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: toErrorMessage(e, "setCoordinatorSubjects", "Error al guardar materias") };
  }
}

export async function promoteTeacherToCoordinatorAction(
  _prev: CoordinatorActionState,
  formData: FormData,
): Promise<CoordinatorActionState> {
  const session = await requireActiveSession();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) redirect(ROUTES.LOGIN);

  const teacherId = field(formData, "teacherId").trim();
  if (!teacherId) return { ok: false, error: "Debes seleccionar un docente" };

  const parsed = PromoteTeacherSchema.safeParse({
    teacherId,
    coordinatorArea: field(formData, "coordinatorArea"),
    teacherIds:      teacherIdsFrom(formData),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  try {
    await adminService.promoteTeacherToCoordinator({ ...parsed.data, actorId: session.user.id });
    revalidatePath(ROUTES.ADMIN.COORDINATORS);
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: toErrorMessage(e, "promoteTeacherToCoordinator", "Error al promover al docente") };
  }
}

export async function addCoordinatorTeacherAction(
  coordinatorId: string,
  teacherId: string,
): Promise<CoordinatorActionState> {
  const session = await requireActiveSession();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) return { ok: false, error: "No autorizado" };

  const parsed = z.object({ coordinatorId: IdSchema, teacherId: IdSchema }).safeParse({ coordinatorId, teacherId });
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  try {
    await adminService.addCoordinatorTeacher(parsed.data.coordinatorId, parsed.data.teacherId);
    revalidatePath(ROUTES.ADMIN.COORDINATORS);
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: toErrorMessage(e, "addCoordinatorTeacher", "Error al agregar docente") };
  }
}

export async function removeCoordinatorAssignmentAction(
  assignmentId: string,
): Promise<{ ok: boolean }> {
  const session = await requireActiveSession();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) return { ok: false };

  const parsed = IdSchema.safeParse(assignmentId);
  if (!parsed.success) return { ok: false };

  try {
    await adminService.removeCoordinatorAssignment(parsed.data);
    revalidatePath(ROUTES.ADMIN.COORDINATORS);
    return { ok: true };
  } catch (e: unknown) {
    log.error("removeCoordinatorAssignment unexpected error", { error: e });
    return { ok: false };
  }
}

export async function deleteCoordinatorAction(
  coordinatorId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireActiveSession();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) return { ok: false };

  const parsed = IdSchema.safeParse(coordinatorId);
  if (!parsed.success) return { ok: false, error: "Coordinador no válido" };

  try {
    await adminService.deleteCoordinator(parsed.data);
    revalidatePath(ROUTES.ADMIN.COORDINATORS);
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: toErrorMessage(e, "deleteCoordinator", "Error al eliminar") };
  }
}

export async function resetCoordinatorPasswordAction(
  coordinatorId: string,
): Promise<{ ok: boolean; error?: string; tempPassword?: string }> {
  const session = await requireActiveSession();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) return { ok: false, error: "No autorizado" };

  const parsed = IdSchema.safeParse(coordinatorId);
  if (!parsed.success) return { ok: false, error: "Coordinador no válido" };

  try {
    const { tempPassword } = await adminService.resetCoordinatorPassword(parsed.data);
    revalidatePath(ROUTES.ADMIN.COORDINATORS);
    return { ok: true, tempPassword };
  } catch (e: unknown) {
    return { ok: false, error: toErrorMessage(e, "resetCoordinatorPassword", "Error al restablecer la contraseña") };
  }
}
