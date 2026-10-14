import type { EjeTransversalId, PrincipioIcon } from "@/modules/planification/planification.types";

// ── Tipos locales de la tabla PUM (solo UI) ───────────────────────────────────

export interface SubItem {
  localId: string;
  text: string;
}

export interface LocalDcdItem {
  localId: string;
  text: string;
  ejes: EjeTransversalId[];
}

export interface LocalMethodologyItem {
  localId: string;
  text: string;
  principles: PrincipioIcon[];
}

export interface LocalPumRow {
  localId: string;
  id?: string;
  dcdItems: LocalDcdItem[];
  indicators: SubItem[];
  methodologyItems: LocalMethodologyItem[];
  resources: LocalMethodologyItem[];
  evaluations: SubItem[];
}

/** Listas de una fila que admiten agregar/quitar/editar ítems. */
export type ListField = "dcdItems" | "indicators" | "methodologyItems" | "resources" | "evaluations";
/** Listas de texto simple. */
export type SimpleListField = "indicators" | "evaluations";
/** Listas cuyos ítems llevan principios DUA. */
export type PrincipledListField = "methodologyItems" | "resources";

export type Principio = 1 | 2 | 3;

/** Editor de principio DUA abierto (solo uno a la vez en toda la tabla). */
export type OpenPicker = { itemId: string; principio: Principio } | null;
