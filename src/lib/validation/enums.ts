import { PlanStatus, Role } from "@prisma/client";

/** Valida valores que llegan como texto (searchParams, formularios) antes de usarlos en un filtro de Prisma. */
export function isPlanStatus(value: unknown): value is PlanStatus {
  return typeof value === "string" && (Object.values(PlanStatus) as string[]).includes(value);
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (Object.values(Role) as string[]).includes(value);
}
