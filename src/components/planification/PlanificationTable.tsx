"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PlanificationRow } from "@/modules/planification/planification.types";
import type { ActionResult } from "@/types";
import type { SavePlanificationRowsInput } from "@/modules/planification/planification.schema";
import type { SectionState } from "@/constants/review";
import { usePlanRows, emptyRow, toSavePayload, type PlanItemAction } from "@/hooks/planification/usePlanRows";
import { useAutosave } from "@/hooks/planification/useAutosave";
import type { OpenPicker, Principio } from "./table/types";
import { PlanToolbar, PlanFooterBar } from "./table/PlanToolbar";
import { PlanTableHeader } from "./table/PlanTableHeader";
import { PlanRow } from "./table/PlanRow";
import { FinalizeDialog } from "./table/FinalizeDialog";
import { DeleteRowDialog } from "./table/DeleteRowDialog";

export type PlanSaveAction    = (data: SavePlanificationRowsInput) => Promise<ActionResult>;
export type PlanFinalizeAction = (planificationId: string) => Promise<ActionResult>;

const MAX_ROWS = 50;
const AUTOSAVE_DELAY_MS = 30000;

// ── PlanificationTable ────────────────────────────────────────────────────────

export function PlanificationTable({
  planId, initialRows, isFinalized, onSave, onFinalize, onClearFeedback, rowFeedback,
}: {
  planId: string;
  initialRows: PlanificationRow[];
  isFinalized: boolean;
  onSave: PlanSaveAction;
  onFinalize: PlanFinalizeAction;
  onClearFeedback?: (planId: string, keys: string[]) => Promise<void>;
  rowFeedback?: Record<number, SectionState>;
}) {
  const router = useRouter();
  const { rows, editedLocalIds, dispatch } = usePlanRows(initialRows);
  const [isPending, startTransition] = useTransition();
  const [openPicker, setOpenPicker] = useState<OpenPicker>(null);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [insertHoverIdx, setInsertHoverIdx] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const autosave = useAutosave({
    enabled: !isFinalized,
    delayMs: AUTOSAVE_DELAY_MS,
    isPending,
    startTransition,
    save: () => onSave(toSavePayload(planId, rows)),
    // Las filas editadas pierden su observación del coordinador
    onSaved: async () => {
      if (!onClearFeedback || editedLocalIds.size === 0) return;
      const editedKeys = rows
        .map((r, idx) => editedLocalIds.has(r.localId) ? `row_${idx}` : null)
        .filter(Boolean) as string[];
      if (editedKeys.length > 0) await onClearFeedback(planId, editedKeys);
      dispatch({ type: "CLEAR_EDITED" });
    },
  });

  // ── Mutaciones (todas programan el autoguardado) ──────────────────────────

  const editItem = (action: PlanItemAction) => {
    dispatch(action);
    if (action.type === "ADD_PRINCIPLE") setOpenPicker({ itemId: action.itemId, principio: action.principio });
    if (action.type === "UPDATE_PRINCIPLE") setOpenPicker(null);
    autosave.markDirty();
  };

  const togglePicker = (itemId: string, principio: Principio) =>
    setOpenPicker(
      openPicker?.itemId === itemId && openPicker?.principio === principio ? null : { itemId, principio }
    );

  const addRow = () => { dispatch({ type: "ADD_ROW", row: emptyRow() }); autosave.markDirty(); };
  const insertRow = (afterIndex: number) => { dispatch({ type: "INSERT_ROW", afterIndex, row: emptyRow() }); autosave.markDirty(); };
  const removeRow = (rowId: string) => { dispatch({ type: "REMOVE_ROW", rowId }); autosave.markDirty(); };

  // ── Finalizar ─────────────────────────────────────────────────────────────

  const handleFinalizeConfirm = () => {
    setFinalizeError(null);
    startTransition(async () => {
      const saveResult = await onSave(toSavePayload(planId, rows));
      if (!saveResult.success) { setFinalizeError(saveResult.error); return; }
      const finalResult = await onFinalize(planId);
      if (finalResult.success) {
        setShowFinalizeDialog(false);
        router.refresh();
      } else {
        setFinalizeError(finalResult.error);
      }
    });
  };

  const saveState = {
    status: autosave.status,
    error: autosave.error,
    isDirty: autosave.isDirty,
    isPending,
    onSave: autosave.saveNow,
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {!isFinalized && (
        <PlanToolbar
          {...saveState}
          onFinalize={() => { setFinalizeError(null); setShowFinalizeDialog(true); }}
        />
      )}

      {/* Indicación de scroll en móvil */}
      <p className="sm:hidden text-[11px] text-pum-text-disabled flex items-center gap-1.5 -mb-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
        Desliza para ver todas las columnas
      </p>

      <div className="relative">
        {/* Degradado a la derecha que sugiere scroll horizontal */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-lg z-10 sm:hidden"
          style={{ background: "linear-gradient(to left, rgba(255,255,255,0.85), transparent)" }}
          aria-hidden="true"
        />
        <div className="overflow-x-auto rounded-lg border border-pum-border" style={{ WebkitOverflowScrolling: "touch" }}>
          <table className="border-collapse w-full" style={{ tableLayout: "fixed", minWidth: 900 }}>
            <PlanTableHeader isFinalized={isFinalized} />
            <tbody>
              {rows.map((row, i) => (
                <PlanRow
                  key={row.localId}
                  row={row}
                  index={i}
                  isFinalized={isFinalized}
                  isLast={i === rows.length - 1}
                  canDelete={rows.length > 1}
                  feedback={rowFeedback?.[i]}
                  edited={editedLocalIds.has(row.localId)}
                  openPicker={openPicker}
                  insertHover={insertHoverIdx === i}
                  onEdit={editItem}
                  onTogglePicker={togglePicker}
                  onRequestDelete={() => setConfirmDeleteId(row.localId)}
                  onInsertRow={() => insertRow(i)}
                  onInsertHover={(hover) => setInsertHoverIdx(hover ? i : null)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!isFinalized && (
        <PlanFooterBar {...saveState} canAddRow={rows.length < MAX_ROWS} onAddRow={addRow} />
      )}

      <FinalizeDialog
        open={showFinalizeDialog}
        onConfirm={handleFinalizeConfirm}
        onCancel={() => setShowFinalizeDialog(false)}
        isPending={isPending}
        error={finalizeError}
      />

      <DeleteRowDialog
        open={confirmDeleteId !== null}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId !== null) removeRow(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
      />
    </div>
  );
}
