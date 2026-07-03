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
