import { z } from "zod";

export const CreateUserSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  email: z.string().email("Email inválido"),
  cedula: z
    .string()
    .length(10, "La cédula debe tener exactamente 10 dígitos")
    .regex(/^\d+$/, "La cédula solo debe contener números"),
  role: z.enum(["TEACHER", "COORDINATOR", "ADMIN", "SUPERADMIN"], {
    error: "Rol inválido",
  }),
  coordinatorArea: z.string().max(100).optional(),
});

export const UpdateUserSchema = z.object({
  name:  z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100).optional(),
  email: z.string().email("Email inválido").optional(),
  cedula: z
    .string()
    .length(10, "La cédula debe tener exactamente 10 dígitos")
    .regex(/^\d+$/, "La cédula solo debe contener números")
    .optional()
    .nullable(),
  coordinatorArea: z.string().max(100).nullable().optional(),
});

export const ChangeRoleSchema = z.object({
  newRole: z.enum(["TEACHER", "COORDINATOR", "ADMIN", "SUPERADMIN"]),
});

export const PLAN_STATUSES = [
  "DRAFT",
  "FINALIZED",
  "FEEDBACK_RECEIVED",
  "APPROVED",
  "PENDING_SIGNATURE",
  "SIGNED",
  "ADMIN_REJECTED",
] as const;

export const CorrectPlanStatusSchema = z.object({
  newStatus: z.enum(PLAN_STATUSES, { error: "Estado inválido" }),
  reason: z.string().min(10, "El motivo debe tener al menos 10 caracteres").max(500),
});

export const ReassignCoordinatorSchema = z.object({
  coordinatorId: z.string().min(1, "Debe seleccionar un coordinador"),
});

export type CreateUserInput    = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput    = z.infer<typeof UpdateUserSchema>;
export type ChangeRoleInput    = z.infer<typeof ChangeRoleSchema>;
export type CorrectPlanStatusInput = z.infer<typeof CorrectPlanStatusSchema>;
export type ReassignCoordinatorInput = z.infer<typeof ReassignCoordinatorSchema>;
