import type { PlanStatus } from "@prisma/client";
import type { DisplayStatus, Planification } from "./planification.types";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";

// ── Máquina de estados ───────────────────────────────────────────────────────

/**
 * Transiciones válidas del ciclo de vida del PUM.
 *
 *   DRAFT             → FINALIZED          (docente finaliza)
 *   FINALIZED         → FEEDBACK_RECEIVED  (coordinador envía observaciones)
 *                     → APPROVED           (coordinador aprueba)
 *   FEEDBACK_RECEIVED → FINALIZED          (docente reenvía corregido)
 *   APPROVED          → PENDING_SIGNATURE  (coordinador envía a firma)
 *   PENDING_SIGNATURE → SIGNED             (admin firma)
 *                     → ADMIN_REJECTED     (admin rechaza)
 *   ADMIN_REJECTED    → FEEDBACK_RECEIVED  (coordinador devuelve al docente)
 *                     → PENDING_SIGNATURE  (coordinador reenvía a firma)
 *
 * SuperAdmin puede corregir el estado fuera de este mapa (correctPlanStatus).
 */
export const PLAN_TRANSITIONS: Readonly<Record<PlanStatus, readonly PlanStatus[]>> = {
  DRAFT:             ["FINALIZED"],
  FINALIZED:         ["FEEDBACK_RECEIVED", "APPROVED"],
  FEEDBACK_RECEIVED: ["FINALIZED"],
  APPROVED:          ["PENDING_SIGNATURE"],
  PENDING_SIGNATURE: ["SIGNED", "ADMIN_REJECTED"],
  ADMIN_REJECTED:    ["FEEDBACK_RECEIVED", "PENDING_SIGNATURE"],
  SIGNED:            [],
};

export function canTransition(from: PlanStatus, to: PlanStatus): boolean {
  return PLAN_TRANSITIONS[from].includes(to);
}

/** Estados desde los que se puede llegar a `to`. */
export function statusesLeadingTo(to: PlanStatus): PlanStatus[] {
  return (Object.keys(PLAN_TRANSITIONS) as PlanStatus[]).filter((from) => canTransition(from, to));
}

/** Estados en los que el docente editor puede modificar el PUM. */
export const EDITABLE_STATUSES: readonly PlanStatus[] = ["DRAFT", "FEEDBACK_RECEIVED"];

/** Estados que el coordinador ve en su bandeja (el PUM ya salió del borrador). */
export const IN_REVIEW_CYCLE_STATUSES: readonly PlanStatus[] = [
  "FINALIZED", "FEEDBACK_RECEIVED", "APPROVED", "PENDING_SIGNATURE", "ADMIN_REJECTED", "SIGNED",
];

/** Estados posteriores a la aprobación del coordinador. */
export const APPROVED_OR_LATER_STATUSES: readonly PlanStatus[] = [
  "APPROVED", "PENDING_SIGNATURE", "SIGNED", "ADMIN_REJECTED",
];

export function assertCanEdit(plan: Planification): void {
  if (!plan.isEditor) {
    throw new AppError(
      ErrorCode.PLAN_NOT_OWNED_BY_TEACHER,
      "No tienes permiso para editar esta planificación"
    );
  }

  // Lista blanca: cualquier otro estado (en revisión, firmado, rechazado por admin…) es de solo lectura
  if (!(EDITABLE_STATUSES as readonly string[]).includes(plan.status)) {
    throw new AppError(
      ErrorCode.PLAN_ALREADY_FINALIZED,
      "Esta planificación ya fue finalizada y no puede modificarse"
    );
  }

  // El plazo solo rige la entrega inicial (Borrador). Una vez que el docente
  // finalizó a tiempo y el PUM entra al ciclo de revisión/corrección
  // (FEEDBACK_RECEIVED), el plazo original ya cumplió su propósito: el
  // reenvío para corrección lo dispara el coordinador/vicerrector, no el
  // docente, así que no depende de él seguir respetando esa fecha.
  if (plan.status === "DRAFT" && plan.editDeadlineAt && plan.editDeadlineAt < new Date()) {
    throw new AppError(
      ErrorCode.PLAN_DEADLINE_PASSED,
      `El plazo de edición venció el ${plan.editDeadlineAt.toLocaleDateString("es-EC")}`
    );
  }
}

export function assertCanFinalize(plan: Planification): void {
  assertCanEdit(plan);

  const hasCompleteRows = plan.rows.some((row) => {
    const { dcdItems, indicators, resources, evaluations } = row.data;
    return (
      dcdItems.some((d) => d.text) &&
      indicators.some(Boolean) &&
      resources.some((r) => r.text) &&
      evaluations.some(Boolean)
    );
  });

  if (!hasCompleteRows) {
    throw new AppError(
      ErrorCode.VAL_MISSING_FIELD,
      "La planificación debe tener al menos una fila completamente llena antes de finalizar"
    );
  }
}

/**
 * Estado que ve el docente en sus listados. Agrupa los estados posteriores a
 * la aprobación y marca como vencido un borrador fuera de plazo.
 */
export function computeDisplayStatus(
  plan: { status: string; editDeadlineAt: Date | null } | null,
  now: Date = new Date(),
): DisplayStatus {
  if (!plan) return "NOT_STARTED";
  if ((APPROVED_OR_LATER_STATUSES as readonly string[]).includes(plan.status)) return "APPROVED";
  if (plan.status === "FEEDBACK_RECEIVED") return "FEEDBACK_RECEIVED";
  if (plan.status === "FINALIZED") return "FINALIZED";
  if (plan.editDeadlineAt && plan.editDeadlineAt < now) return "OVERDUE";
  return "DRAFT";
}
