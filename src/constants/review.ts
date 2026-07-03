/** Claves de las secciones revisables en un PUM. */
export const REVIEW_SECTION_KEYS = [
  // Datos informativos
  "meta_nivel",
  "meta_area",
  "meta_docentes",
  "meta_unidad",
  "meta_objetivos",
  "meta_criterios",
  // Planificación
  "plan_periodos",
  "plan_ejes",
  // Tabla Aportes Multimodales (3 columnas)
  "aportes_dim",
  "aportes_nivel",
  "aportes_como",
  // DUA (3 principios)
  "dua_p1",
  "dua_p2",
  "dua_p3",
  // Tabla PUM (5 columnas — revisadas por fila, no por columna)
  "pum_dcd",
  "pum_indicators",
  "pum_methodology",
  "pum_resources",
  "pum_evaluations",
] as const;

export type ReviewSectionKey = (typeof REVIEW_SECTION_KEYS)[number];

/**
 * Claves que BLOQUEAN el flujo: el coordinador debe revisar TODAS estas
 * (aprobar o comentar) para poder enviar retroalimentación o aprobar el PUM.
 * Las claves meta_* y plan_* son controles adicionales opcionales — se pueden
 * usar pero no bloquean el avance.
 */
export const BLOCKING_REVIEW_KEYS = REVIEW_SECTION_KEYS.filter(
  (k) => !k.startsWith("pum_") && !k.startsWith("meta_") && !k.startsWith("plan_")
) as ReadonlyArray<ReviewSectionKey>;
// = ["aportes_dim", "aportes_nivel", "aportes_como", "dua_p1", "dua_p2", "dua_p3"]

export const REVIEW_SECTION_LABELS: Record<ReviewSectionKey, string> = {
  meta_nivel:       "Nivel Educativo",
  meta_area:        "Área de Estudio / Asignatura",
  meta_docentes:    "Docentes",
  meta_unidad:      "Número y Título de la Unidad",
  meta_objetivos:   "Objetivos de la Unidad",
  meta_criterios:   "Criterios de Evaluación",
  plan_periodos:    "Número de Periodos / Fechas",
  plan_ejes:        "Ejes Transversales",
  aportes_dim:      "Dimensión y Opción Transversal",
  aportes_nivel:    "Aporte Multimodal del Nivel / Subnivel",
  aportes_como:     "¿Cómo van a aprender? (Aportes)",
  dua_p1:           "DUA — Principio 1",
  dua_p2:           "DUA — Principio 2",
  dua_p3:           "DUA — Principio 3",
  pum_dcd:          "¿Qué van a aprender?",
  pum_indicators:   "¿Qué evaluar?",
  pum_methodology:  "¿Cómo van a aprender?",
  pum_resources:    "Recursos",
  pum_evaluations:  "¿Cómo evaluar?",
};

export type ReviewStatus = "IN_REVIEW" | "FEEDBACK_SENT" | "APPROVED";

export interface SectionState {
  approved: boolean;
  comment: string | null;
}

/** Key for a per-row review entry (e.g. "row_0", "row_1"). */
export type RowSectionKey = `row_${number}`;

/** Any section key: fixed section or per-row. */
export type AnySectionKey = ReviewSectionKey | RowSectionKey;

export type SectionStates = Partial<Record<AnySectionKey, SectionState>>;
