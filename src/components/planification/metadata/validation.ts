import { z } from "zod";
import type { PlanMetadata } from "@/modules/planification/planification.types";
import { SaveMetadataSchema, type SaveMetadataInput } from "@/modules/planification/planification.schema";

/** Campos del formulario que muestran su propio error. */
export type MetadataErrorField =
  | "nivelSubnivelOverride"
  | "nivelGradoOverride"
  | "areaEstudio"
  | "numUnidad"
  | "titulo"
  | "objetivos"
  | "criterios"
  | "nPeriodos"
  | "fechInicio"
  | "fechFin"
  | "ejesTransversales"
  | "aportes";

const ERROR_FIELDS = new Set<string>([
  "nivelSubnivelOverride", "nivelGradoOverride", "areaEstudio", "numUnidad", "titulo",
  "objetivos", "criterios", "nPeriodos", "fechInicio", "fechFin", "ejesTransversales", "aportes",
]);

/** Errores por campo; `form` agrupa los que no corresponden a un campo visible. */
export type MetadataErrors = Partial<Record<MetadataErrorField | "form", string>>;

export interface MetadataValidation {
  errors: MetadataErrors;
  /** true si el servidor rechazaría el guardado (mismo esquema que la server action). */
  blocksSave: boolean;
}

// ── Esquemas ──────────────────────────────────────────────────────────────────

const requerido = z.string().trim().min(1, "Campo requerido");
const alMenosUno = (message: string) =>
  z.array(z.string()).refine((items) => items.some((x) => x.trim()), message);

/**
 * Datos mínimos para continuar a la tabla del PUM (mismo criterio que
 * `isMetadataComplete` en tabla/page.tsx). No se exige para "Solo guardar".
 */
const MetadataCompletaSchema = z.object({
  areaEstudio:       requerido,
  numUnidad:         requerido,
  titulo:            requerido,
  objetivos:         alMenosUno("Ingresa al menos un objetivo"),
  criterios:         alMenosUno("Ingresa al menos un criterio"),
  nPeriodos:         requerido,
  fechInicio:        requerido,
  fechFin:           requerido,
  ejesTransversales: requerido,
});

// ── Mensajes ──────────────────────────────────────────────────────────────────

function issueMessage(issue: z.core.$ZodIssue): string {
  if (issue.code === "too_big") {
    const max = String(issue.maximum);
    if (issue.origin === "string") return `Máximo ${max} caracteres`;
    if (issue.origin === "array")  return `Máximo ${max} elementos`;
  }
  return issue.message || "Valor inválido";
}

function collect(
  errors: MetadataErrors,
  issues: z.core.$ZodIssue[],
  fieldOf: (issue: z.core.$ZodIssue) => PropertyKey | undefined,
) {
  for (const issue of issues) {
    const field = fieldOf(issue);
    const key = typeof field === "string" && ERROR_FIELDS.has(field)
      ? (field as MetadataErrorField)
      : "form";
    errors[key] ??= key === "form" ? `Datos inválidos: ${issueMessage(issue)}` : issueMessage(issue);
  }
}

/**
 * Valida en el cliente antes de guardar.
 * - Siempre: el mismo `SaveMetadataSchema` que usa el servidor (no es más estricto).
 * - Con `requireComplete`: además, los campos obligatorios para continuar.
 */
export function validateMetadata(
  payload: SaveMetadataInput,
  form: PlanMetadata,
  requireComplete: boolean,
): MetadataValidation {
  const errors: MetadataErrors = {};

  if (requireComplete) {
    const complete = MetadataCompletaSchema.safeParse(form);
    if (!complete.success) collect(errors, complete.error.issues, (i) => i.path[0]);
  }

  const server = SaveMetadataSchema.safeParse(payload);
  if (!server.success) {
    // Rutas: ["metadata", campo, ...] o ["planificationId"]
    collect(errors, server.error.issues, (i) => (i.path[0] === "metadata" ? i.path[1] : undefined));
  }

  return { errors, blocksSave: !server.success };
}
