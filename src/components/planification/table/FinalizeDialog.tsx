"use client";

import { Dialog } from "@/components/ui/Dialog";

/** Confirmación para finalizar (bloquear) la planificación. */
export function FinalizeDialog({
  open, onConfirm, onCancel, isPending, error,
}: {
  open: boolean;
  onConfirm: () => void; onCancel: () => void;
  isPending: boolean; error: string | null;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => { if (!next) onCancel(); }}
      dismissible={!isPending}
      title="Finalizar planificación"
      description={
        <>
          Al finalizar, la planificación quedará{" "}
          <strong className="text-pum-text">bloqueada para edición</strong>. Esta acción no se puede deshacer.
        </>
      }
    >
      <p className="text-sm text-pum-text-muted mb-5">
        Asegúrate de haber completado todas las filas antes de continuar.
      </p>
      {error && (
        <div role="alert" className="bg-pum-error-light border border-pum-error rounded-md p-3 mb-4">
          <p className="text-sm text-pum-error">{error}</p>
        </div>
      )}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="px-4 py-2 text-sm border border-pum-border text-pum-text rounded-md hover:bg-pum-bg disabled:opacity-50 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium bg-pum-success text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isPending ? "Finalizando..." : "Sí, finalizar"}
        </button>
      </div>
    </Dialog>
  );
}
