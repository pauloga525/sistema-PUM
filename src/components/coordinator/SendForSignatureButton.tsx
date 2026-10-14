"use client";

import { useState, useTransition } from "react";
import { sendForSignatureAction } from "@/app/(coordinator)/coordinator/retroalimentacion/actions";
import { useToast } from "@/components/ui/Toast";
import { Dialog } from "@/components/ui/Dialog";

interface Props {
  planId:     string;
  isRejected: boolean;
}

export function SendForSignatureButton({ planId, isRejected }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  const label = isRejected ? "Re-enviar para firma" : "Enviar para firma";
  const bg    = isRejected ? "#002753" : "#7c3aed";

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await sendForSignatureAction(planId);
      if (result.success) {
        setShowModal(false);
        addToast(isRejected ? "PUM re-enviado para firma" : "PUM enviado para firma correctamente");
      } else {
        setError(result.error ?? "Error inesperado.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setShowModal(true); }}
        className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        style={{ background: bg }}
      >
        {label}
      </button>

      <Dialog
        open={showModal}
        onOpenChange={setShowModal}
        dismissible={!isPending}
        size="sm"
        title={isRejected ? "Re-enviar PUM para firma" : "Enviar PUM para firma"}
        description={
          <span className="block text-xs leading-relaxed">
            {isRejected
              ? "El PUM fue rechazado por el administrador. Al re-enviarlo, quedará pendiente de revisión nuevamente."
              : "El PUM aprobado será enviado al administrador para su firma y aprobación final. Esta acción no se puede deshacer."}
          </span>
        }
      >
        <div className="flex flex-col gap-4">
          {error && (
            <p role="alert" className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              disabled={isPending}
              className="text-sm px-4 py-2 rounded-xl font-medium text-pum-text-muted transition-colors disabled:opacity-50"
              style={{ background: "rgba(0,39,83,0.06)" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="text-sm px-4 py-2 rounded-xl font-semibold text-white transition-colors disabled:opacity-50"
              style={{ background: bg }}
            >
              {isPending ? "Enviando…" : "Sí, enviar"}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
