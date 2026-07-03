import { z } from "zod";
import { MAX_PUM_ROWS } from "@/constants/planification";

// ── Metadata schemas ──────────────────────────────────────────────────────────

const AporteMultimodalSchema = z.object({
  dim:    z.string().max(500),
  aporte: z.string().max(1000),
  como:   z.string().max(1000),
});

export const PlanMetadataSchema = z.object({
  areaEstudio:       z.string().max(200),
  numUnidad:         z.string().max(10),
  titulo:            z.string().max(500),
  objetivos:         z.array(z.string().max(1000)).max(10),
  criterios:         z.array(z.string().max(1000)).max(10),
  nPeriodos:         z.string().max(20),
  fechInicio:        z.string().max(50),
  fechFin:           z.string().max(50),
  ejesTransversales: z.string().max(500),
  aportes:           z.array(AporteMultimodalSchema).max(6),
  p1Pautas:          z.array(z.string().max(500)).max(10),
  p2Pautas:          z.array(z.string().max(500)).max(10),
  p3Pautas:          z.array(z.string().max(500)).max(10),
});

export const SaveMetadataSchema = z.object({
  planificationId: z.string().uuid("ID de planificación inválido"),
  metadata:        PlanMetadataSchema,
});

export type SaveMetadataInput = z.infer<typeof SaveMetadataSchema>;

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const EjeTransversalSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4),  z.literal(5),
  z.literal(6), z.literal(7), z.literal(8), z.literal(9), z.literal(10),
]);

const PrincipioIconSchema = z.preprocess(
  // Backward compat: old records stored { numero: n }, new records store { numeros: [n, ...] }
  (raw) => {
    if (!raw || typeof raw !== "object") return raw;
    const r = raw as Record<string, unknown>;
    if (!Array.isArray(r.numeros) && typeof r.numero === "number") {
      return { ...r, numeros: [r.numero] };
    }
    return raw;
  },
  z.object({
    principio: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    numeros:   z.array(z.number().int().min(1).max(10)).min(1).max(10),
  }).nullable()
);

const MethodologyItemSchema = z.object({
  text: z.string().max(2000),
  principle: PrincipioIconSchema,
});

const PumRowDataSchema = z.object({
  dcd:              z.string().max(2000),
  ejeTransversales: z.array(EjeTransversalSchema).max(10),
  indicators:       z.array(z.string().max(1000)).max(20),
  methodologyItems: z.array(MethodologyItemSchema).max(20),
  resources:        z.array(z.string().max(1000)).max(20),
  evaluations:      z.array(z.string().max(1000)).max(20),
});

// ── Schemas principales ───────────────────────────────────────────────────────

export const PlanificationRowSchema = z.object({
  id:       z.string().uuid().optional(),
  rowIndex: z.number().int().min(0),
  data:     PumRowDataSchema,
});

export const SavePlanificationRowsSchema = z.object({
  planificationId: z.string().uuid("ID de planificación inválido"),
  rows: z
    .array(PlanificationRowSchema)
    .max(MAX_PUM_ROWS, `No se pueden guardar más de ${MAX_PUM_ROWS} filas`),
});

export const FinalizePlanificationSchema = z.object({
  planificationId: z.string().uuid("ID de planificación inválido"),
  confirmedByUser: z.literal(true, "Debes confirmar la finalización"),
});

// Tipos inferidos (fuente única de verdad)
export type SavePlanificationRowsInput  = z.infer<typeof SavePlanificationRowsSchema>;
export type FinalizePlanificationInput  = z.infer<typeof FinalizePlanificationSchema>;
