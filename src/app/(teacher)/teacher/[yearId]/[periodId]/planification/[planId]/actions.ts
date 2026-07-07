"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma/client";
import { planificationService } from "@/modules/planification/planification.service";
import { coordinatorService } from "@/modules/coordinator/coordinator.service";
import {
  SavePlanificationRowsSchema,
  FinalizePlanificationSchema,
  SaveMetadataSchema,
} from "@/modules/planification/planification.schema";
import { AppError } from "@/lib/errors/app-error";
import type { ActionResult } from "@/types";
import type {
  SavePlanificationRowsInput,
  SaveMetadataInput,
} from "@/modules/planification/planification.schema";

export async function saveRowsAction(
  data: SavePlanificationRowsInput
): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "TEACHER") return { success: false, error: "No autenticado" };

  const result = SavePlanificationRowsSchema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await planificationService.saveRows(result.data, session.user.id);
    return { success: true, data: undefined };
  } catch (e) {
    const msg = e instanceof AppError ? e.message : "Error al guardar. Intenta de nuevo.";
    return { success: false, error: msg };
  }
}

export async function saveMetadataAction(
  data: SaveMetadataInput
): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "TEACHER") return { success: false, error: "No autenticado" };

  const result = SaveMetadataSchema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await planificationService.saveMetadata(result.data, session.user.id);
    return { success: true, data: undefined };
  } catch (e) {
    const msg = e instanceof AppError ? e.message : "Error al guardar los datos de la unidad.";
    return { success: false, error: msg };
  }
}

export async function clearCoordinatorFeedbackAction(
  planId: string,
  keys: string[]
): Promise<void> {
  const session = await auth();
  if (!session || session.user.role !== "TEACHER") return;
  const link = await prisma.planificationTeacher.findUnique({
    where: { planificationId_teacherId: { planificationId: planId, teacherId: session.user.id } },
    select: { isEditor: true },
  });
  if (!link?.isEditor) return;
  await coordinatorService.clearSectionFeedback(planId, keys);
}

export async function finalizeAction(planificationId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "TEACHER") return { success: false, error: "No autenticado" };

  const result = FinalizePlanificationSchema.safeParse({
    planificationId,
    confirmedByUser: true,
  });
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await planificationService.finalize(result.data, session.user.id);
    return { success: true, data: undefined };
  } catch (e) {
    const msg = e instanceof AppError ? e.message : "Error al finalizar. Intenta de nuevo.";
    return { success: false, error: msg };
  }
}
