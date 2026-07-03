"use client";

import { useState, useTransition } from "react";

interface Props {
  subjectName: string;
  levelName:   string;
  onCreate:    () => Promise<void>;
}

export function CreatePlanButton({ subjectName, levelName, onCreate }: Props) {
  const [open,      setOpen]      = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await onCreate();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg cursor-pointer transition-colors duration-150 whitespace-nowrap bg-pum-primary hover:bg-pum-primary-hover"
      >
        Crear PUM
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !isPending) setOpen(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.97)",
              border: "1px solid rgba(195,198,210,0.70)",
              boxShadow: "0 20px 60px rgba(0,39,83,0.18)",
            }}
          >
            {/* Header */}
            <div
              className="px-6 pt-5 pb-4"
              style={{ borderBottom: "1px solid rgba(0,39,83,0.07)" }}
            >
              <p className="text-base font-semibold text-pum-text leading-tight">
                ¿Crear planificación?
              </p>
              <p className="text-xs text-pum-text-muted mt-1">
                {subjectName} · {levelName}
              </p>
            </div>

            {/* Body */}
            <div className="px-6 py-4 flex flex-col gap-3">
              <div
                className="rounded-xl px-4 py-3 flex items-start gap-3"
                style={{ background: "#dce8ff", border: "1px solid rgba(0,61,122,0.18)" }}
              >
                <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#002753" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "#002753" }}>
                    Serás el editor de este PUM
                  </p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "#003d7a" }}>
                    Al crear la planificación, quedarás asignado como el único editor.
                    Los demás docentes de esta materia y nivel podrán consultarla,
                    pero no podrán editarla.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="px-6 pb-5 flex justify-end gap-2"
              style={{ borderTop: "1px solid rgba(0,39,83,0.07)" }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="text-sm px-4 py-2 rounded-xl font-medium text-pum-text-muted transition-colors disabled:opacity-50 cursor-pointer"
                style={{ background: "rgba(0,39,83,0.06)" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="text-sm px-4 py-2 rounded-xl font-semibold text-white transition-colors disabled:opacity-60 cursor-pointer"
                style={{ background: "linear-gradient(135deg, #002753 0%, #003d7a 100%)" }}
              >
                {isPending ? "Creando…" : "Sí, crear PUM"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
