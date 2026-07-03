"use client";

import { useState, useTransition } from "react";
import { sendForSignatureAction } from "@/app/(coordinator)/coordinator/retroalimentacion/actions";
import { useToast } from "@/components/ui/Toast";

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

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !isPending) setShowModal(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
            style={{
              background: "rgba(255,255,255,0.97)",
              border: "1px solid rgba(195,198,210,0.70)",
              boxShadow: "0 20px 60px rgba(0,39,83,0.18)",
            }}
          >
            <div>
              <h3 className="text-base font-semibold text-pum-text">
                {isRejected ? "Re-enviar PUM para firma" : "Enviar PUM para firma"}
              </h3>
              <p className="text-xs text-pum-text-muted mt-1 leading-relaxed">
                {isRejected
                  ? "El PUM fue rechazado por el administrador. Al re-enviarlo, quedará pendiente de revisión nuevamente."
                  : "El PUM aprobado será enviado al administrador para su firma y aprobación final. Esta acción no se puede deshacer."}
              </p>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
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
        </div>
      )}
    </>
  );
}
