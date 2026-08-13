import { z } from "zod";
import { MAX_PUM_ROWS } from "@/constants/planification";

// ── Metadata schemas ──────────────────────────────────────────────────────────

const AporteMultimodalSchema = z.object({
  dim:    z.string().max(5000),
  aporte: z.string().max(5000),
  como:   z.string().max(5000),
});

const DuaPautaEntrySchema = z.object({
  pauta:     z.number().int().min(1).max(3),
  subPautas: z.array(z.number().int().min(1)).max(15),
});

const DuaSelectionSchema = z.array(DuaPautaEntrySchema);

// Backward compat: old format was a single { pauta, subPautas } object → wrap in array.
// Also handles legacy string[] (p1Pautas) by returning null.
function normalizeDua(val: unknown): unknown {
  if (val === null || val === undefined) return null;
  if (Array.isArray(val)) return val;
  if (typeof val === "object") {
    const o = val as Record<string, unknown>;
    if (typeof o.pauta === "number") return [val];
  }
  return null;
}

export const PlanMetadataSchema = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
    const r = raw as Record<string, unknown>;
    return {
      ...r,
      p1: normalizeDua("p1" in r ? r.p1 : null),
      p2: normalizeDua("p2" in r ? r.p2 : null),
      p3: normalizeDua("p3" in r ? r.p3 : null),
    };
  },
  z.object({
    areaEstudio:       z.string().max(5000),
    numUnidad:         z.string().max(10),
    titulo:            z.string().max(5000),
    objetivos:         z.array(z.string().max(5000)).max(30),
    criterios:         z.array(z.string().max(5000)).max(30),
    nPeriodos:         z.string().max(20),
    fechInicio:        z.string().max(50),
    fechFin:           z.string().max(50),
    ejesTransversales: z.string().max(5000),
    aportes:           z.array(AporteMultimodalSchema).max(6),
    p1:                DuaSelectionSchema.nullable(),
    p2:                DuaSelectionSchema.nullable(),
    p3:                DuaSelectionSchema.nullable(),
    nivelSubnivelOverride: z.string().max(5000).optional(),
    nivelGradoOverride:    z.string().max(5000).optional(),
  })
);

export const SaveMetadataSchema = z.object({
  planificationId: z.string().uuid("ID de planificación inválido"),
  metadata:        PlanMetadataSchema,
});

export type SaveMetadataInput = z.infer<typeof SaveMetadataSchema>;

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const EjeTransversalSchema = z.union([
  z.literal(1),  z.literal(2),  z.literal(3),  z.literal(4),
  z.literal(5),  z.literal(6),  z.literal(7),  z.literal(8),
  z.literal(9),  z.literal(10),
  z.literal(11), z.literal(12), z.literal(13), z.literal(14),
  z.literal(15), z.literal(16), z.literal(17),
  z.literal(18), z.literal(19), z.literal(20), z.literal(21),
  z.literal(22), z.literal(23), z.literal(24), z.literal(25),
  z.literal(26), z.literal(27), z.literal(28), z.literal(29),
  z.literal(30), z.literal(31), z.literal(32), z.literal(33),
  z.literal(34),
]);

const PrincipioIconSchema = z.preprocess(
  // Backward compat: old records stored { principio, pauta, subPautas[] }
  //   or { principio, numeros[] } or { principio, numero }
  // New format: { principio, selections: [{ pauta, subPautas }] }
  (raw) => {
    if (!raw || typeof raw !== "object") return raw;
    const r = raw as Record<string, unknown>;
    if (!r.principio) return raw;
    // Already new format
    if (Array.isArray(r.selections)) return raw;
    // Old format: { principio, pauta, subPautas }
    if (typeof r.pauta === "number" && Array.isArray(r.subPautas)) {
      return { principio: r.principio, selections: [{ pauta: r.pauta, subPautas: r.subPautas }] };
    }
    // Very old: { principio, numeros[] } or { principio, numero }
    const firstNum = Array.isArray(r.numeros)
      ? (r.numeros as number[])[0]
      : typeof r.numero === "number" ? r.numero : 1;
    return { principio: r.principio, selections: [{ pauta: firstNum ?? 1, subPautas: [] }] };
  },
  z.object({
    principio: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    selections: z.array(z.object({
      pauta:     z.number().int().min(1).max(3),
      subPautas: z.array(z.number().int().min(1)).min(0).max(15),
    })).max(3),
  }).nullable()
);

const PrincipioIconItemSchema = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== "object") return raw;
    const r = raw as Record<string, unknown>;
    if (!r.principio) return raw;
    if (Array.isArray(r.selections)) return raw;
    if (typeof r.pauta === "number" && Array.isArray(r.subPautas)) {
      return { principio: r.principio, selections: [{ pauta: r.pauta, subPautas: r.subPautas }] };
    }
    const firstNum = Array.isArray(r.numeros)
      ? (r.numeros as number[])[0]
      : typeof r.numero === "number" ? r.numero : 1;
    return { principio: r.principio, selections: [{ pauta: firstNum ?? 1, subPautas: [] }] };
  },
  z.object({
    principio: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    selections: z.array(z.object({
      pauta:     z.number().int().min(1).max(3),
      subPautas: z.array(z.number().int().min(1)).min(0).max(15),
    })).max(3),
  })
);

const MethodologyItemSchema = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
    const r = raw as Record<string, unknown>;
    // Backward compat: old format had single `principle: PrincipioIcon | null`
    if (!("principles" in r)) {
      const p = r.principle ?? null;
      return { text: r.text, principles: p ? [p] : [] };
    }
    return raw;
  },
  z.object({
    text:       z.string().max(5000),
    principles: z.array(PrincipioIconItemSchema).max(3),
  })
);

const DcdItemSchema = z.object({
  text: z.string().max(5000),
  ejes: z.array(EjeTransversalSchema).max(34),
});

const PumRowDataSchema = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
    const r = raw as Record<string, unknown>;
    // backward compat: old format had top-level dcd + ejeTransversales
    if (!("dcdItems" in r)) {
      const text = typeof r.dcd === "string" ? r.dcd : "";
      const ejes = Array.isArray(r.ejeTransversales) ? r.ejeTransversales : [];
      return { ...r, dcdItems: [{ text, ejes }] };
    }
    return raw;
  },
  z.object({
  dcdItems:         z.array(DcdItemSchema).min(1).max(30),
  indicators:       z.array(z.string().max(5000)).max(20),
  methodologyItems: z.array(MethodologyItemSchema).max(20),
  resources: z.preprocess(
    (val) => {
      if (!Array.isArray(val)) return val;
      return val.map((item) =>
        typeof item === "string" ? { text: item, principles: [] } : item
      );
    },
    z.array(MethodologyItemSchema).max(20),
  ),
  evaluations:      z.array(z.string().max(5000)).max(20),
  }),
);

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
