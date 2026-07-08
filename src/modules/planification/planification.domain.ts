import type { Planification } from "./planification.types";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";

export function assertCanEdit(plan: Planification): void {
  if (!plan.isEditor) {
    throw new AppError(
      ErrorCode.PLAN_NOT_OWNED_BY_TEACHER,
      "No tienes permiso para editar esta planificación"
    );
  }

  if (plan.status === "FINALIZED" || plan.status === "APPROVED") {
    throw new AppError(
      ErrorCode.PLAN_ALREADY_FINALIZED,
      "Esta planificación ya fue finalizada y no puede modificarse"
    );
  }

  if (plan.editDeadlineAt && plan.editDeadlineAt < new Date()) {
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

export function computeDisplayStatus(plan: Planification): "DRAFT" | "PREVIEW" | "FINALIZED" | "OVERDUE" | "FEEDBACK_RECEIVED" | "APPROVED" {
  if (plan.status === "APPROVED" || plan.status === "PENDING_SIGNATURE" || plan.status === "SIGNED" || plan.status === "ADMIN_REJECTED") return "APPROVED";
  if (plan.status === "FEEDBACK_RECEIVED") return "FEEDBACK_RECEIVED";
  if (plan.status === "FINALIZED") return "FINALIZED";
  if (plan.editDeadlineAt && plan.editDeadlineAt < new Date()) return "OVERDUE";
  return plan.status as "DRAFT" | "PREVIEW";
}
