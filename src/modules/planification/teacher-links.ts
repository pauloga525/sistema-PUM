import { prisma } from "@/lib/prisma/client";

/**
 * Vínculos huérfanos docente ↔ PUM.
 *
 * Antes de que existiera unassignTeacherFromCombo, remover una asignación no
 * limpiaba PlanificationTeacher, y quedaron vínculos huérfanos en producción
 * (docente removido que seguía apareciendo como co-docente y podía seguir
 * abriendo el PUM). Estos helpers ocultan esos vínculos en las lecturas, sin
 * limpieza manual en la base de datos.
 *
 * Excepción: los PUM "SIGNED" nunca se filtran — son el registro
 * institucional permanente y muestran a quienes participaron, sin importar
 * cambios de asignación posteriores.
 */

interface PlanKey {
  subjectId:      string;
  levelId:        string;
  academicYearId: string;
}

export type ActiveLinkChecker = (plan: PlanKey, teacherId: string) => boolean;

const linkKey = (plan: PlanKey, teacherId: string) =>
  `${plan.subjectId}|${plan.levelId}|${plan.academicYearId}|${teacherId}`;

/**
 * Carga en una sola consulta las asignaciones activas de todos los docentes
 * vinculados a un lote de PUM y devuelve un predicado "¿sigue asignado?".
 */
export async function loadActiveLinkChecker(
  plans: Array<PlanKey & { teachers: Array<{ teacherId: string }> }>,
): Promise<ActiveLinkChecker> {
  const teacherIds = [...new Set(plans.flatMap((p) => p.teachers.map((t) => t.teacherId)))];
  const active = teacherIds.length > 0
    ? await prisma.teacherAssignment.findMany({
        where:  { teacherId: { in: teacherIds }, active: true },
        select: { teacherId: true, subjectId: true, levelId: true, academicYearId: true },
      })
    : [];
  const activeKeys = new Set(active.map((a) => linkKey(a, a.teacherId)));
  return (plan, teacherId) => activeKeys.has(linkKey(plan, teacherId));
}

/** Vínculos que se muestran: todos en un PUM firmado, solo los activos en el resto. */
export function visibleTeacherLinks<T extends { teacherId: string }>(
  plan: PlanKey & { status: string },
  links: T[],
  isActive: ActiveLinkChecker,
): T[] {
  if (plan.status === "SIGNED") return links;
  return links.filter((l) => isActive(plan, l.teacherId));
}

/** Versión para un solo PUM. */
export async function filterActiveTeacherLinks<T extends { teacherId: string }>(
  plan: PlanKey & { status?: string },
  links: T[],
): Promise<T[]> {
  if (links.length === 0 || plan.status === "SIGNED") return links;
  const isActive = await loadActiveLinkChecker([{ ...plan, teachers: links }]);
  return links.filter((l) => isActive(plan, l.teacherId));
}
