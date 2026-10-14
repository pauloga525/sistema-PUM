"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActiveSession } from "@/lib/auth/session";
import { hasMinRole } from "@/constants/levels";
import { adminService } from "@/modules/admin/admin.service";
import { ROUTES } from "@/constants/routes";
import { AppError } from "@/lib/errors/app-error";
import { IdSchema } from "@/lib/validation/ids";
import { z } from "zod";

async function requireAdmin() {
  const session = await requireActiveSession();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) redirect(ROUTES.LOGIN);
  return session;
}

export type CatalogActionState = { ok?: boolean; error?: string } | null;

// ── Validación de FormData ───────────────────────────────────────────────────

/** Campo de texto opcional: null/"" → undefined. */
const optionalText = (max: number) =>
  z.preprocess((v) => (v === null || v === "" ? undefined : v), z.string().trim().max(max).optional());

/** Fecha opcional en formato YYYY-MM-DD: vacía → null. */
const optionalDate = z.preprocess(
  (v) => (v === null || v === "" ? null : v),
  z.iso.date().nullable(),
);

const field = (formData: FormData, key: string) => formData.get(key) ?? undefined;

/** Primer mensaje de error de zod, o el mensaje por defecto. */
function firstIssue(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}

// ── Años lectivos ─────────────────────────────────────────────────────────────

export async function createAcademicYearAction(
  _prev: CatalogActionState,
  formData: FormData
): Promise<CatalogActionState> {
  await requireAdmin();
  try {
    const parsed = z.object({
      label:     z.string("La etiqueta del año lectivo es obligatoria.").trim()
                  .min(1, "La etiqueta del año lectivo es obligatoria.").max(50),
      yearStart: z.coerce.number("El año de inicio debe ser un número válido.")
                  .int("El año de inicio debe ser un número válido.").min(2000).max(2100),
      startDate: optionalDate,
      endDate:   optionalDate,
    }).safeParse({
      label:     field(formData, "label"),
      yearStart: field(formData, "yearStart"),
      startDate: formData.get("startDate"),
      endDate:   formData.get("endDate"),
    });
    if (!parsed.success) return { error: firstIssue(parsed.error, "Datos del año lectivo inválidos.") };
    const { label, yearStart, startDate, endDate } = parsed.data;

    await adminService.createAcademicYear({
      label,
      yearStart,
      startDate: startDate ? new Date(startDate) : null,
      endDate:   endDate   ? new Date(endDate)   : null,
      active:    false,
    });

    revalidatePath(ROUTES.ADMIN.CATALOG);
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    return { error: "Error al crear el año lectivo." };
  }
}

export async function setActiveYearAction(
  _prev: CatalogActionState,
  formData: FormData
): Promise<CatalogActionState> {
  await requireAdmin();
  try {
    const id = IdSchema.safeParse(formData.get("id"));
    if (!id.success) return { error: "ID de año lectivo requerido." };
    await adminService.setActiveYear(id.data);
    revalidatePath(ROUTES.ADMIN.CATALOG);
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    return { error: "Error al activar el año lectivo." };
  }
}

// ── Periodos ─────────────────────────────────────────────────────────────────

export async function createPeriodAction(
  _prev: CatalogActionState,
  formData: FormData
): Promise<CatalogActionState> {
  await requireAdmin();
  try {
    const input = z.object({
      academicYearId: z.string("Selecciona un año lectivo.").pipe(IdSchema),
      name:           z.string("El nombre del periodo es obligatorio.").trim()
                       .min(1, "El nombre del periodo es obligatorio.").max(100),
      number:         z.coerce.number("El número de periodo debe ser mayor a 0.")
                       .int().min(1, "El número de periodo debe ser mayor a 0.").max(20),
      startDate:      optionalDate,
      endDate:        optionalDate,
    }).safeParse({
      academicYearId: field(formData, "academicYearId"),
      name:           field(formData, "name"),
      number:         field(formData, "number"),
      startDate:      formData.get("startDate"),
      endDate:        formData.get("endDate"),
    });
    if (!input.success) return { error: firstIssue(input.error, "Datos del periodo inválidos.") };
    const { academicYearId, name, number, startDate, endDate } = input.data;

    await adminService.createPeriod({
      academicYearId,
      name,
      number,
      startDate: startDate ? new Date(startDate) : null,
      endDate:   endDate   ? new Date(endDate)   : null,
    });

    revalidatePath(ROUTES.ADMIN.CATALOG);
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    if ((e as { code?: string }).code === "P2002") return { error: "Ya existe un periodo con ese número en este año lectivo." };
    return { error: "Error al crear el periodo." };
  }
}

export async function deletePeriodAction(
  _prev: CatalogActionState,
  formData: FormData
): Promise<CatalogActionState> {
  await requireAdmin();
  try {
    const id = IdSchema.safeParse(formData.get("id"));
    if (!id.success) return { error: "ID de periodo requerido." };
    await adminService.deletePeriod(id.data);
    revalidatePath(ROUTES.ADMIN.CATALOG);
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    return { error: "Error al eliminar el periodo." };
  }
}

// ── Materias ─────────────────────────────────────────────────────────────────

export async function createSubjectAction(
  _prev: CatalogActionState,
  formData: FormData
): Promise<CatalogActionState> {
  await requireAdmin();
  try {
    const parsed = z.object({
      name:        z.string("El nombre de la materia es obligatorio.").trim()
                    .min(1, "El nombre de la materia es obligatorio.").max(150),
      code:        z.string("El código de la materia es obligatorio.").trim()
                    .min(1, "El código de la materia es obligatorio.").max(30).toUpperCase(),
      areaEstudio: optionalText(150),
    }).safeParse({
      name:        field(formData, "name"),
      code:        field(formData, "code"),
      areaEstudio: formData.get("areaEstudio"),
    });
    if (!parsed.success) return { error: firstIssue(parsed.error, "Datos de la materia inválidos.") };
    const { name, code } = parsed.data;
    const areaEstudio = parsed.data.areaEstudio || undefined;

    await adminService.createSubject({ name, code, areaEstudio });
    revalidatePath(ROUTES.ADMIN.CATALOG);
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    if ((e as { code?: string }).code === "P2002") return { error: "Ya existe una materia con ese código." };
    return { error: "Error al crear la materia." };
  }
}

export async function deleteSubjectAction(
  _prev: CatalogActionState,
  formData: FormData
): Promise<CatalogActionState> {
  await requireAdmin();
  try {
    const id = IdSchema.safeParse(formData.get("id"));
    if (!id.success) return { error: "ID de materia requerido." };
    await adminService.deleteSubject(id.data);
    revalidatePath(ROUTES.ADMIN.CATALOG);
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    return { error: "Error al eliminar la materia." };
  }
}

export async function addSubjectToLevelAction(
  _prev: CatalogActionState,
  formData: FormData
): Promise<CatalogActionState> {
  await requireAdmin();
  try {
    const subjectId = IdSchema.safeParse(formData.get("subjectId"));
    const levelId   = IdSchema.safeParse(formData.get("levelId"));
    if (!subjectId.success || !levelId.success) return { error: "Materia y nivel son requeridos." };
    await adminService.addSubjectToLevel(subjectId.data, levelId.data);
    revalidatePath(ROUTES.ADMIN.CATALOG);
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    return { error: "Error al vincular la materia al nivel." };
  }
}

export async function removeSubjectFromLevelAction(
  _prev: CatalogActionState,
  formData: FormData
): Promise<CatalogActionState> {
  await requireAdmin();
  try {
    const id = IdSchema.safeParse(formData.get("id"));
    if (!id.success) return { error: "ID de vínculo requerido." };
    await adminService.removeSubjectFromLevel(id.data);
    revalidatePath(ROUTES.ADMIN.CATALOG);
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    return { error: "Error al desvincular la materia del nivel." };
  }
}
