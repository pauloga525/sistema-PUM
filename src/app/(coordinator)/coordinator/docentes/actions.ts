"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { ROUTES } from "@/constants/routes";

export type TeacherAssignmentActionState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

export async function createTeacherAssignmentAction(
  _prev: TeacherAssignmentActionState,
  formData: FormData,
): Promise<TeacherAssignmentActionState> {
  const session = await auth();
  if (!session || session.user.role !== "COORDINATOR") redirect(ROUTES.LOGIN);

  const teacherId      = formData.get("teacherId")      as string;
  const subjectId      = formData.get("subjectId")      as string;
  const levelId        = formData.get("levelId")        as string;
  const academicYearId = formData.get("academicYearId") as string;

  if (!teacherId || !subjectId || !levelId || !academicYearId) {
    return { ok: false, error: "Faltan campos requeridos" };
  }

  // Verificar acceso: el coordinador puede asignarse a sí mismo sin restricción
  if (teacherId !== session.user.id) {
    const ca = await prisma.coordinatorAssignment.findUnique({
      where: { coordinatorId_teacherId: { coordinatorId: session.user.id, teacherId } },
    });
    if (!ca) return { ok: false, error: "No tienes acceso a este docente" };
  }

  try {
    await prisma.teacherAssignment.upsert({
      where: {
        teacherId_subjectId_levelId_academicYearId: { teacherId, subjectId, levelId, academicYearId },
      },
      create: { teacherId, subjectId, levelId, academicYearId, active: true },
      update: { active: true },
    });

    revalidatePath(ROUTES.COORDINATOR.DOCENTES);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al crear la asignación";
    return { ok: false, error: msg };
  }
}

export async function removeTeacherAssignmentAction(
  assignmentId: string,
  teacherId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session || session.user.role !== "COORDINATOR") return { ok: false };

  // Verificar acceso: el coordinador puede gestionar sus propias asignaciones
  if (teacherId !== session.user.id) {
    const ca = await prisma.coordinatorAssignment.findUnique({
      where: { coordinatorId_teacherId: { coordinatorId: session.user.id, teacherId } },
    });
    if (!ca) return { ok: false, error: "No tienes acceso a este docente" };
  }

  try {
    await prisma.teacherAssignment.update({
      where: { id: assignmentId },
      data:  { active: false },
    });
    revalidatePath(ROUTES.COORDINATOR.DOCENTES);
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al eliminar la asignación" };
  }
}

/**
 * Designa o quita al docente como editor principal de un PUM.
 *
 * - Si setAsEditor=true: pone isPrimaryEditor=true en assignmentId y false en los demás
 *   del mismo combo (subjectId + levelId + academicYearId). Si el PUM ya existe,
 *   actualiza PlanificationTeacher para reflejar el cambio.
 * - Si setAsEditor=false: solo pone isPrimaryEditor=false en assignmentId.
 */
export async function setPrimaryEditorAction(
  assignmentId: string,
  teacherId: string,
  setAsEditor: boolean = true,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session || session.user.role !== "COORDINATOR") return { ok: false };

  // teacherId se mantiene como parámetro para compatibilidad con el componente,
  // pero la verificación de acceso real se hace contra el dueño de la asignación (ver dentro del try).
  void teacherId;

  try {
    const targetAssignment = await prisma.teacherAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!targetAssignment) {
      return { ok: false, error: "Asignación no encontrada" };
    }

    // Verificar que el coordinador tiene acceso al docente dueño de la asignación
    const ownerTeacherId = targetAssignment.teacherId;
    if (ownerTeacherId !== session.user.id) {
      const ca = await prisma.coordinatorAssignment.findUnique({
        where: { coordinatorId_teacherId: { coordinatorId: session.user.id, teacherId: ownerTeacherId } },
      });
      if (!ca) return { ok: false, error: "No tienes acceso a este docente" };
    }

    const { subjectId, levelId, academicYearId } = targetAssignment;

    await prisma.$transaction(async (tx) => {
      if (setAsEditor) {
        // 1. Quitar isPrimaryEditor de todas las asignaciones del mismo combo
        await tx.teacherAssignment.updateMany({
          where: { subjectId, levelId, academicYearId, active: true },
          data:  { isPrimaryEditor: false },
        });

        // 2. Marcar la asignación elegida como editor principal
        await tx.teacherAssignment.update({
          where: { id: assignmentId },
          data:  { isPrimaryEditor: true },
        });

        // 3. Si ya existen PUMs para este combo, reasignar isEditor en PlanificationTeacher.
        // Obtener todos los docentes co-asignados para este combo (tengan PUM o no).
        const coAssigned = await tx.teacherAssignment.findMany({
          where: { subjectId, levelId, academicYearId, active: true },
          select: { teacherId: true },
        });
        const allTeacherIds = [...new Set(coAssigned.map((a) => a.teacherId))];

        const plans = await tx.planification.findMany({
          where: { academicYearId, subjectId, levelId },
          select: { id: true },
        });

        for (const p of plans) {
          // Upsert: crea el vínculo si no existe, o actualiza isEditor si ya existe
          await Promise.all(
            allTeacherIds.map((tid) =>
              tx.planificationTeacher.upsert({
                where: { planificationId_teacherId: { planificationId: p.id, teacherId: tid } },
                create: { planificationId: p.id, teacherId: tid, isEditor: tid === targetAssignment.teacherId },
                update: { isEditor: tid === targetAssignment.teacherId },
              })
            )
          );
        }
      } else {
        // Quitar rol de editor: poner isEditor=false en PlanificationTeacher
        // y limpiar isPrimaryEditor en TeacherAssignment.
        await tx.teacherAssignment.update({
          where: { id: assignmentId },
          data:  { isPrimaryEditor: false },
        });

        // Actualizar PlanificationTeacher para todos los PUMs del combo
        const plans = await tx.planification.findMany({
          where: { academicYearId, subjectId, levelId },
          select: { id: true },
        });

        for (const p of plans) {
          await tx.planificationTeacher.updateMany({
            where: { planificationId: p.id, teacherId: targetAssignment.teacherId },
            data:  { isEditor: false },
          });
        }
      }
    });

    revalidatePath(ROUTES.COORDINATOR.DOCENTES);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al actualizar el editor principal";
    return { ok: false, error: msg };
  }
}
