"use client";

import { useReducer } from "react";
import type { PlanificationRow, EjeTransversalId, PrincipioIcon, DuaSelection } from "@/modules/planification/planification.types";
import type { SavePlanificationRowsInput } from "@/modules/planification/planification.schema";
import type {
  LocalPumRow, LocalDcdItem, LocalMethodologyItem, SubItem,
  ListField, PrincipledListField, Principio,
} from "@/components/planification/table/types";

// ── IDs locales estables ──────────────────────────────────────────────────────

let seq = 0;
export const newId = () => `lid-${++seq}`;

// ── Conversión servidor → local ───────────────────────────────────────────────

// Compatibilidad: { principio, pauta, subPautas }, { principio, numeros[] }, { principio, numero }
function normalizePrinciple(raw: unknown): PrincipioIcon | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const principio = r.principio as Principio;
  if (![1, 2, 3].includes(principio)) return null;
  // Formato actual: { principio, selections }
  if (Array.isArray(r.selections)) {
    return { principio, selections: r.selections as DuaSelection };
  }
  // Formato anterior: { principio, pauta, subPautas }
  if (typeof r.pauta === "number" && Array.isArray(r.subPautas)) {
    return { principio, selections: [{ pauta: r.pauta, subPautas: r.subPautas as number[] }] };
  }
  // Muy antiguo: { principio, numeros[] }
  if (Array.isArray(r.numeros) && r.numeros.length > 0) {
    return { principio, selections: [{ pauta: (r.numeros as number[])[0], subPautas: [] }] };
  }
  // Muy antiguo: { principio, numero }
  if (typeof r.numero === "number") return { principio, selections: [{ pauta: r.numero, subPautas: [] }] };
  return { principio, selections: [] };
}

function toPrinciples(list: unknown[] | undefined): PrincipioIcon[] {
  return (list ?? []).map(normalizePrinciple).filter(Boolean) as PrincipioIcon[];
}

/** Ítem vacío de la lista indicada. */
export function emptyItem(field: ListField, localId = newId()): LocalDcdItem | LocalMethodologyItem | SubItem {
  switch (field) {
    case "dcdItems":         return { localId, text: "", ejes: [] };
    case "methodologyItems":
    case "resources":        return { localId, text: "", principles: [] };
    default:                 return { localId, text: "" };
  }
}

export function toLocalRow(r: PlanificationRow): LocalPumRow {
  return {
    localId: newId(),
    id: r.id,
    dcdItems: r.data.dcdItems.length > 0
      ? r.data.dcdItems.map(d => ({ localId: newId(), text: d.text, ejes: d.ejes }))
      : [{ localId: newId(), text: "", ejes: [] }],
    indicators: r.data.indicators.length > 0
      ? r.data.indicators.map(t => ({ localId: newId(), text: t }))
      : [{ localId: newId(), text: "" }],
    methodologyItems: r.data.methodologyItems.length > 0
      ? r.data.methodologyItems.map(m => ({ localId: newId(), text: m.text, principles: toPrinciples(m.principles) }))
      : [{ localId: newId(), text: "", principles: [] }],
    resources: r.data.resources.length > 0
      ? r.data.resources.map(m => ({ localId: newId(), text: m.text, principles: toPrinciples(m.principles) }))
      : [{ localId: newId(), text: "", principles: [] }],
    evaluations: r.data.evaluations.length > 0
      ? r.data.evaluations.map(t => ({ localId: newId(), text: t }))
      : [{ localId: newId(), text: "" }],
  };
}

export function emptyRow(): LocalPumRow {
  return {
    localId: newId(),
    dcdItems:         [{ localId: newId(), text: "", ejes: [] }],
    indicators:       [{ localId: newId(), text: "" }],
    methodologyItems: [{ localId: newId(), text: "", principles: [] }],
    resources:        [{ localId: newId(), text: "", principles: [] }],
    evaluations:      [{ localId: newId(), text: "" }],
  };
}

// ── Conversión local → servidor ───────────────────────────────────────────────

export function toSavePayload(planificationId: string, rows: LocalPumRow[]): SavePlanificationRowsInput {
  return {
    planificationId,
    rows: rows.map((r, i) => ({
      ...(r.id ? { id: r.id } : {}),
      rowIndex: i,
      data: {
        dcdItems:         r.dcdItems.map((d) => ({ text: d.text, ejes: d.ejes })),
        indicators:       r.indicators.map((s) => s.text),
        methodologyItems: r.methodologyItems.map((m) => ({ text: m.text, principles: m.principles })),
        resources:        r.resources.map((m) => ({ text: m.text, principles: m.principles })),
        evaluations:      r.evaluations.map((s) => s.text),
      },
    })),
  };
}

// ── Reducer ───────────────────────────────────────────────────────────────────

/** Acciones sobre los ítems de una fila (marcan la fila como editada). */
export type PlanItemAction =
  | { type: "ADD_ITEM";         rowId: string; field: ListField; localId: string }
  | { type: "REMOVE_ITEM";      rowId: string; field: ListField; itemId: string }
  | { type: "UPDATE_ITEM";      rowId: string; field: ListField; itemId: string; text: string }
  | { type: "SET_EJES";         rowId: string; itemId: string; ejes: EjeTransversalId[] }
  | { type: "ADD_PRINCIPLE";    rowId: string; field: PrincipledListField; itemId: string; principio: Principio }
  | { type: "UPDATE_PRINCIPLE"; rowId: string; field: PrincipledListField; itemId: string; principio: Principio; updated: PrincipioIcon | null };

/** Acciones sobre la lista de filas. */
export type PlanRowsAction =
  | PlanItemAction
  | { type: "ADD_ROW";    row: LocalPumRow }
  | { type: "INSERT_ROW"; afterIndex: number; row: LocalPumRow }
  | { type: "REMOVE_ROW"; rowId: string }
  | { type: "CLEAR_EDITED" };

export interface PlanRowsState {
  rows: LocalPumRow[];
  /** Filas editadas localmente (su resaltado de observación se oculta). */
  editedLocalIds: Set<string>;
}

type AnyItem = LocalDcdItem | LocalMethodologyItem | SubItem;

function mapList(row: LocalPumRow, field: ListField, fn: (items: AnyItem[]) => AnyItem[]): LocalPumRow {
  return { ...row, [field]: fn(row[field]) };
}

function updateRowItems(action: PlanItemAction, row: LocalPumRow): LocalPumRow {
  switch (action.type) {
    case "ADD_ITEM":
      return mapList(row, action.field, (items) => [...items, emptyItem(action.field, action.localId)]);
    case "REMOVE_ITEM":
      return mapList(row, action.field, (items) => items.filter((i) => i.localId !== action.itemId));
    case "UPDATE_ITEM":
      return mapList(row, action.field, (items) =>
        items.map((i) => i.localId === action.itemId ? { ...i, text: action.text } : i));
    case "SET_EJES":
      return {
        ...row,
        dcdItems: row.dcdItems.map((d) => d.localId === action.itemId ? { ...d, ejes: action.ejes } : d),
      };
    case "ADD_PRINCIPLE":
      return {
        ...row,
        [action.field]: row[action.field].map((i) =>
          i.localId === action.itemId && !i.principles.some((p) => p.principio === action.principio)
            ? { ...i, principles: [...i.principles, { principio: action.principio, selections: [] }] }
            : i
        ),
      };
    case "UPDATE_PRINCIPLE": {
      const { principio, updated } = action;
      return {
        ...row,
        [action.field]: row[action.field].map((i) => {
          if (i.localId !== action.itemId) return i;
          const principles = updated === null
            ? i.principles.filter((p) => p.principio !== principio)
            : i.principles.map((p) => p.principio === principio ? updated : p);
          return { ...i, principles };
        }),
      };
    }
  }
}

export function planRowsReducer(state: PlanRowsState, action: PlanRowsAction): PlanRowsState {
  switch (action.type) {
    case "ADD_ROW":
      return { ...state, rows: [...state.rows, action.row] };
    case "INSERT_ROW": {
      const rows = [...state.rows];
      rows.splice(action.afterIndex + 1, 0, action.row);
      return { ...state, rows };
    }
    case "REMOVE_ROW":
      return state.rows.length > 1
        ? { ...state, rows: state.rows.filter((r) => r.localId !== action.rowId) }
        : state;
    case "CLEAR_EDITED":
      return { ...state, editedLocalIds: new Set() };
    default: {
      const editedLocalIds = new Set(state.editedLocalIds);
      editedLocalIds.add(action.rowId);
      return {
        rows: state.rows.map((r) => r.localId === action.rowId ? updateRowItems(action, r) : r),
        editedLocalIds,
      };
    }
  }
}

/** Estado de las filas del PUM: carga inicial desde el servidor y mutaciones vía reducer. */
export function usePlanRows(initialRows: PlanificationRow[]) {
  const [state, dispatch] = useReducer(
    planRowsReducer,
    initialRows,
    (init): PlanRowsState => ({
      rows: init.length > 0 ? init.map(toLocalRow) : [emptyRow()],
      editedLocalIds: new Set(),
    })
  );
  return { rows: state.rows, editedLocalIds: state.editedLocalIds, dispatch };
}
