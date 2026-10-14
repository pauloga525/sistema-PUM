import type { PlanMetadata } from "@/modules/planification/planification.types";
import type { SaveMetadataInput } from "@/modules/planification/planification.schema";

/** Número fijo de filas de la tabla de aportes multimodales. */
export const APORTES_ROWS = 6;

function emptyAporte() {
  return { dim: "", aporte: "", como: "" };
}

export function emptyMetadata(): PlanMetadata {
  return {
    areaEstudio: "",
    numUnidad: "",
    titulo: "",
    objetivos: [""],
    criterios: [""],
    nPeriodos: "",
    fechInicio: "",
    fechFin: "",
    ejesTransversales: "",
    aportes: Array.from({ length: APORTES_ROWS }, emptyAporte),
    p1: null,
    p2: null,
    p3: null,
  };
}

/** Completa lo guardado con los valores vacíos que el formulario necesita para editar. */
export function mergeWithEmpty(saved: PlanMetadata | null): PlanMetadata {
  const base = emptyMetadata();
  if (!saved) return base;
  return {
    ...saved,
    objetivos: saved.objetivos.length ? saved.objetivos : [""],
    criterios: saved.criterios.length ? saved.criterios : [""],
    p1: saved.p1 ?? null,
    p2: saved.p2 ?? null,
    p3: saved.p3 ?? null,
    aportes: [
      ...saved.aportes,
      ...Array.from({ length: Math.max(0, APORTES_ROWS - saved.aportes.length) }, emptyAporte),
    ].slice(0, APORTES_ROWS),
  };
}

/** Lo que se envía al servidor: sin ítems ni filas vacías. */
export function buildPayload(planId: string, form: PlanMetadata): SaveMetadataInput {
  return {
    planificationId: planId,
    metadata: {
      ...form,
      objetivos: form.objetivos.filter(Boolean),
      criterios: form.criterios.filter(Boolean),
      aportes:   form.aportes.filter((a) => a.dim || a.aporte || a.como),
    },
  };
}
