import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma/client";
import { normalizePlanMetadata, normalizePumRowData } from "./planification.service";
import { filterActiveTeacherLinks } from "./teacher-links";

/**
 * Carga de solo lectura para la vista previa del PUM del docente: plan, filas,
 * docentes, asignatura, nivel, año y periodo en una sola consulta.
 *
 * Memoizada por request con React.cache(): generateMetadata y la página
 * comparten el mismo resultado sin volver a consultar.
 */
export const loadPlanPreview = cache(async (planId: string) => {
  const plan = await prisma.planification.findUnique({
    where: { id: planId },
    include: {
      teachers:     { include: { teacher: { select: { name: true } } } },
      rows:         { orderBy: { rowIndex: "asc" } },
      subject:      true,
      level:        true,
      academicYear: true,
      period:       true,
    },
  });
  if (!plan) return null;

  // Oculta vínculos huérfanos de docentes removidos (ver teacher-links.ts)
  const teachers = await filterActiveTeacherLinks(plan, plan.teachers);

  return {
    id:          plan.id,
    status:      plan.status,
    finalizedAt: plan.finalizedAt,
    metadata:    normalizePlanMetadata(plan.metadata),
    rows:        plan.rows.map((r) => ({ id: r.id, rowIndex: r.rowIndex, data: normalizePumRowData(r.data) })),
    teachers:    teachers.map((t) => ({ id: t.teacherId, name: t.teacher.name })),
    subject:     plan.subject,
    level:       plan.level,
    year:        plan.academicYear,
    period:      plan.period,
  };
});

/** El docente solo puede ver PUM a los que está vinculado (vínculo activo). */
export function canTeacherView(plan: { teachers: Array<{ id: string }> }, teacherId: string): boolean {
  return plan.teachers.some((t) => t.id === teacherId);
}
