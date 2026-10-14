"use client";

import type { SaveStatus } from "@/hooks/planification/useAutosave";

interface SaveState {
  status: SaveStatus;
  error: string | null;
  isDirty: boolean;
  isPending: boolean;
  onSave: () => void;
}

/** Estado del guardado: "Guardando…", "✓ Guardado", error o cambios pendientes. */
function SaveIndicator({ status, error, isDirty, textClass = "" }: Omit<SaveState, "isPending" | "onSave"> & { textClass?: string }) {
  return (
    <>
      {status === "saving" && (
        <span className={`${textClass} text-pum-text-muted flex items-center gap-1.5`}>
          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          Guardando...
        </span>
      )}
      {status === "saved" && !isDirty && (
        <span className={`${textClass} text-pum-success`}>✓ Guardado</span>
      )}
      {status === "error" && (
        <span className={`${textClass} text-pum-error`}>{error}</span>
      )}
      {isDirty && status === "idle" && (
        <span className="text-[11px] text-pum-text-disabled">Se guardará automáticamente…</span>
      )}
    </>
  );
}

function SaveButton({ status, isPending, onSave }: Pick<SaveState, "status" | "isPending" | "onSave">) {
  return (
    <button
      onClick={onSave}
      disabled={isPending}
      className="px-4 py-2 text-sm font-medium bg-pum-primary text-white rounded-md hover:bg-pum-primary-hover disabled:opacity-50 transition-colors cursor-pointer"
    >
      {isPending && status === "saving" ? "Guardando..." : "Guardar"}
    </button>
  );
}

/** Barra superior: estado del guardado + Guardar + Finalizar PUM. */
export function PlanToolbar({ onFinalize, ...save }: SaveState & { onFinalize: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {/* Región viva: anuncia los cambios de estado a lectores de pantalla */}
      <div className="text-sm min-h-[1.25rem] flex items-center gap-2" aria-live="polite">
        <SaveIndicator status={save.status} error={save.error} isDirty={save.isDirty} />
      </div>
      <div className="flex items-center gap-2">
        <SaveButton status={save.status} isPending={save.isPending} onSave={save.onSave} />
        <button
          onClick={onFinalize}
          disabled={save.isPending}
          className="px-4 py-2 text-sm font-medium border border-pum-success text-pum-success rounded-md hover:bg-pum-success-light disabled:opacity-50 transition-colors cursor-pointer"
        >
          Finalizar PUM
        </button>
      </div>
    </div>
  );
}

/** Barra inferior: + Agregar fila y Guardar (el estado se repite sin región viva). */
export function PlanFooterBar({ canAddRow, onAddRow, ...save }: SaveState & { canAddRow: boolean; onAddRow: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {canAddRow ? (
        <button
          type="button"
          onClick={onAddRow}
          className="text-sm text-pum-primary hover:underline underline-offset-2 text-left cursor-pointer self-start transition-colors"
        >
          + Agregar fila
        </button>
      ) : <span />}

      <div className="flex items-center gap-3">
        <SaveIndicator status={save.status} error={save.error} isDirty={save.isDirty} textClass="text-sm" />
        <SaveButton status={save.status} isPending={save.isPending} onSave={save.onSave} />
      </div>
    </div>
  );
}
