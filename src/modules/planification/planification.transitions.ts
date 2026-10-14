import type { PlanStatus, Prisma } from "@prisma/client";
import { auditService, type AuditLogInput } from "@/modules/audit/audit.service";
import { statusesLeadingTo } from "./planification.domain";

export interface TransitionOptions {
  /** Restringe los estados de origen a un subconjunto de los que permite PLAN_TRANSITIONS. */
  from?: readonly PlanStatus[];
  /** Condiciones adicionales que debe cumplir el PUM (editor, plazo…). */
  where?: Prisma.PlanificationWhereInput;
  /** Campos que se actualizan junto con el estado. */
  data?: Omit<Prisma.PlanificationUpdateManyMutationInput, "status">;
  /** Evento de auditoría que se registra en la misma transacción. */
  audit?: Omit<AuditLogInput, "planificationId">;
}

/**
 * Cambia el estado de un PUM dentro de una transacción.
 *
 * El estado de origen se verifica en el WHERE del UPDATE, así que dos
 * peticiones concurrentes no pueden aplicar la misma transición dos veces ni
 * pisar un cambio de estado intermedio. Devuelve false si el PUM no estaba en
 * un estado de origen válido (no se escribe nada, tampoco la auditoría).
 */
export async function transitionPlan(
  tx: Prisma.TransactionClient,
  planId: string,
  to: PlanStatus,
  opts: TransitionOptions = {},
): Promise<boolean> {
  const allowed = statusesLeadingTo(to);
  const from = opts.from ? opts.from.filter((s) => allowed.includes(s)) : allowed;
  if (from.length === 0) return false;

  const { count } = await tx.planification.updateMany({
    where: { ...opts.where, id: planId, status: { in: [...from] } },
    data:  { ...opts.data, status: to },
  });
  if (count !== 1) return false;

  if (opts.audit) {
    await auditService.log({ planificationId: planId, ...opts.audit }, tx);
  }
  return true;
}
