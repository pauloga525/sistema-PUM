"use server";

import { revalidatePath } from "next/cache";
import { adminService } from "@/modules/admin/admin.service";
import { ROUTES } from "@/constants/routes";
import { AppError } from "@/lib/errors/app-error";

export type CatalogActionState = { ok?: boolean; error?: string } | null;

// ── Años lectivos ─────────────────────────────────────────────────────────────

export async function createAcademicYearAction(
  _prev: CatalogActionState,
  formData: FormData
): Promise<CatalogActionState> {
  try {
    const label     = (formData.get("label") as string)?.trim();
    const yearStart = parseInt(formData.get("yearStart") as string, 10);
    const startRaw  = formData.get("startDate") as string;
    const endRaw    = formData.get("endDate") as string;

    if (!label) return { error: "La etiqueta del año lectivo es obligatoria." };
    if (isNaN(yearStart)) return { error: "El año de inicio debe ser un número válido." };

    await adminService.createAcademicYear({
      label,
      yearStart,
      startDate: startRaw ? new Date(startRaw) : null,
      endDate:   endRaw   ? new Date(endRaw)   : null,
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
  try {
    const id = formData.get("id") as string;
    if (!id) return { error: "ID de año lectivo requerido." };
    await adminService.setActiveYear(id);
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
  try {
    const academicYearId = formData.get("academicYearId") as string;
    const name           = (formData.get("name") as string)?.trim();
    const number         = parseInt(formData.get("number") as string, 10);
    const startRaw       = formData.get("startDate") as string;
    const endRaw         = formData.get("endDate") as string;

    if (!academicYearId) return { error: "Selecciona un año lectivo." };
    if (!name) return { error: "El nombre del periodo es obligatorio." };
    if (isNaN(number) || number < 1) return { error: "El número de periodo debe ser mayor a 0." };

    await adminService.createPeriod({
      academicYearId,
      name,
      number,
      startDate: startRaw ? new Date(startRaw) : null,
      endDate:   endRaw   ? new Date(endRaw)   : null,
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
  try {
    const id = formData.get("id") as string;
    if (!id) return { error: "ID de periodo requerido." };
    await adminService.deletePeriod(id);
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
  try {
    const name        = (formData.get("name") as string)?.trim();
    const code        = (formData.get("code") as string)?.trim().toUpperCase();
    const areaEstudio = (formData.get("areaEstudio") as string)?.trim() || undefined;

    if (!name) return { error: "El nombre de la materia es obligatorio." };
    if (!code) return { error: "El código de la materia es obligatorio." };

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
  try {
    const id = formData.get("id") as string;
    if (!id) return { error: "ID de materia requerido." };
    await adminService.deleteSubject(id);
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
  try {
    const subjectId = formData.get("subjectId") as string;
    const levelId   = formData.get("levelId") as string;
    if (!subjectId || !levelId) return { error: "Materia y nivel son requeridos." };
    await adminService.addSubjectToLevel(subjectId, levelId);
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
  try {
    const id = formData.get("id") as string;
    if (!id) return { error: "ID de vínculo requerido." };
    await adminService.removeSubjectFromLevel(id);
    revalidatePath(ROUTES.ADMIN.CATALOG);
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    return { error: "Error al desvincular la materia del nivel." };
  }
}
