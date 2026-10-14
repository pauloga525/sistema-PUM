"use client";

import type { PrincipioIcon } from "@/modules/planification/planification.types";
import type { SectionState } from "@/constants/review";
import type { PlanItemAction } from "@/hooks/planification/usePlanRows";
import { newId } from "@/hooks/planification/usePlanRows";
import type { LocalPumRow, OpenPicker, Principio, PrincipledListField, SimpleListField } from "./types";
import { DcdCell } from "./DcdCell";
import { ItemListCell } from "./ItemListCell";
import { PrincipledItemsCell } from "./PrincipledItemsCell";

const CELL_STYLE = { wordBreak: "break-word", overflowWrap: "anywhere" } as const;

/**
 * Fila del PUM + sub-fila con la observación del coordinador + separador para
 * insertar una fila debajo.
 */
export function PlanRow({
  row, index, isFinalized, isLast, canDelete, feedback, edited,
  openPicker, insertHover,
  onEdit, onTogglePicker, onRequestDelete, onInsertRow, onInsertHover,
}: {
  row: LocalPumRow;
  index: number;
  isFinalized: boolean;
  isLast: boolean;
  canDelete: boolean;
  feedback?: SectionState;
  /** La fila fue editada localmente: se oculta el resaltado de la observación. */
  edited: boolean;
  openPicker: OpenPicker;
  insertHover: boolean;
  onEdit: (action: PlanItemAction) => void;
  onTogglePicker: (itemId: string, principio: Principio) => void;
  onRequestDelete: () => void;
  onInsertRow: () => void;
  onInsertHover: (hover: boolean) => void;
}) {
  const rowId      = row.localId;
  const n          = index + 1;
  const fbComment  = feedback?.comment?.trim() ? feedback.comment.trim() : null;
  const fbApproved = feedback?.approved && !fbComment;
  const showOrange = !!fbComment && !edited;
  const colCount   = isFinalized ? 6 : 7;

  const simpleList = (field: SimpleListField) => ({
    onAdd:    () => onEdit({ type: "ADD_ITEM", rowId, field, localId: newId() }),
    onRemove: (itemId: string) => onEdit({ type: "REMOVE_ITEM", rowId, field, itemId }),
    onUpdate: (itemId: string, text: string) => onEdit({ type: "UPDATE_ITEM", rowId, field, itemId, text }),
  });

  const principledList = (field: PrincipledListField) => ({
    items:             row[field],
    disabled:          isFinalized,
    openPicker,
    onTogglePicker,
    onAdd:             () => onEdit({ type: "ADD_ITEM", rowId, field, localId: newId() }),
    onRemove:          (itemId: string) => onEdit({ type: "REMOVE_ITEM", rowId, field, itemId }),
    onUpdateText:      (itemId: string, text: string) => onEdit({ type: "UPDATE_ITEM", rowId, field, itemId, text }),
    onUpdatePrinciple: (itemId: string, principio: Principio, updated: PrincipioIcon | null) =>
      onEdit({ type: "UPDATE_PRINCIPLE", rowId, field, itemId, principio, updated }),
    onAddPrinciple:    (itemId: string, principio: Principio) => onEdit({ type: "ADD_PRINCIPLE", rowId, field, itemId, principio }),
  });

  return (
    <>
      <tr
        className={`border-t border-pum-border align-top transition-colors ${!feedback ? "hover:bg-pum-bg/30" : ""}`}
        style={{ background: showOrange ? "rgba(249,115,22,0.10)" : fbApproved ? "rgba(22,163,74,0.05)" : undefined }}
      >
        {/* # */}
        <td
          className="px-3 py-3 text-center text-sm text-pum-text-muted border-r border-pum-border"
          style={{ borderLeft: showOrange ? "3px solid #f97316" : fbApproved ? "3px solid #16a34a" : undefined }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <span>{n}</span>
            {fbApproved && (
              <>
                <span className="text-[10px] font-bold" style={{ color: "#16a34a" }} aria-hidden="true">✓</span>
                <span className="sr-only">Fila aprobada</span>
              </>
            )}
            {showOrange && <span className="sr-only">Fila con observación</span>}
          </div>
        </td>

        {/* ¿Qué van a aprender? */}
        <td className="px-3 py-2 border-r border-pum-border" style={CELL_STYLE}>
          <DcdCell
            items={row.dcdItems}
            disabled={isFinalized}
            itemLabel={`Fila ${n} — destreza`}
            onAdd={() => onEdit({ type: "ADD_ITEM", rowId, field: "dcdItems", localId: newId() })}
            onRemove={(itemId) => onEdit({ type: "REMOVE_ITEM", rowId, field: "dcdItems", itemId })}
            onUpdateText={(itemId, text) => onEdit({ type: "UPDATE_ITEM", rowId, field: "dcdItems", itemId, text })}
            onUpdateEjes={(itemId, ejes) => onEdit({ type: "SET_EJES", rowId, itemId, ejes })}
          />
        </td>

        {/* ¿Qué evaluar? */}
        <td className="px-3 py-2 border-r border-pum-border" style={CELL_STYLE}>
          <ItemListCell
            items={row.indicators}
            disabled={isFinalized}
            placeholder="Indicador de logro..."
            itemLabel={`Fila ${n} — indicador`}
            {...simpleList("indicators")}
          />
        </td>

        {/* ¿Cómo van a aprender? */}
        <td className="px-3 py-2 border-r border-pum-border" style={CELL_STYLE}>
          <PrincipledItemsCell itemLabel={`Fila ${n} — metodología`} {...principledList("methodologyItems")} />
        </td>

        {/* Recursos */}
        <td className="px-3 py-2 border-r border-pum-border" style={CELL_STYLE}>
          <PrincipledItemsCell
            placeholder="Material o recurso..."
            itemLabel={`Fila ${n} — recurso`}
            {...principledList("resources")}
          />
        </td>

        {/* ¿Cómo evaluar? */}
        <td className="px-3 py-2" style={CELL_STYLE}>
          <ItemListCell
            items={row.evaluations}
            disabled={isFinalized}
            placeholder="Técnica o instrumento..."
            itemLabel={`Fila ${n} — evaluación`}
            {...simpleList("evaluations")}
          />
        </td>

        {/* Eliminar fila */}
        {!isFinalized && (
          <td className="px-1 py-2 align-middle">
            <button
              type="button"
              onClick={onRequestDelete}
              disabled={!canDelete}
              title="Eliminar fila"
              aria-label={`Eliminar fila ${n}`}
              className="text-pum-text-disabled hover:text-pum-error disabled:opacity-30 transition-colors cursor-pointer text-lg leading-none"
            >
              ×
            </button>
          </td>
        )}
      </tr>

      {/* Sub-fila del comentario del coordinador */}
      {showOrange && (
        <tr style={{ background: "rgba(249,115,22,0.16)", borderBottom: "2px solid rgba(249,115,22,0.30)" }}>
          <td
            colSpan={colCount}
            style={{ padding: "5px 12px", borderLeft: "3px solid #f97316" }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
              <span style={{ fontSize: "12px", flexShrink: 0, marginTop: "1px" }} aria-hidden="true">💬</span>
              <span style={{ fontSize: "11px", color: "#9a3412", fontStyle: "italic", lineHeight: "1.4" }}>
                <span className="sr-only">Observación del coordinador: </span>
                {fbComment}
              </span>
            </div>
          </td>
        </tr>
      )}

      {/* Separador de inserción entre filas */}
      {!isFinalized && !isLast && (
        <tr
          onMouseEnter={() => onInsertHover(true)}
          onMouseLeave={() => onInsertHover(false)}
          style={{ height: insertHover ? 22 : 6, transition: "height 120ms" }}
        >
          <td colSpan={colCount} style={{ padding: 0, position: "relative" }}>
            {insertHover && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", zIndex: 10 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(0,39,83,0.25)" }} />
                <button
                  type="button"
                  onClick={onInsertRow}
                  title="Insertar fila aquí"
                  aria-label={`Insertar fila después de la fila ${n}`}
                  onMouseEnter={() => onInsertHover(true)}
                  style={{
                    margin: "0 6px",
                    width: 20, height: 20,
                    borderRadius: "50%",
                    background: "#002753",
                    color: "#fff",
                    fontSize: 16, lineHeight: 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, border: "none", cursor: "pointer",
                    boxShadow: "0 1px 4px rgba(0,39,83,0.30)",
                  }}
                >+</button>
                <div style={{ flex: 1, height: 1, background: "rgba(0,39,83,0.25)" }} />
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
