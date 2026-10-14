"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/Dialog";

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

      <Dialog
        open={open}
        onOpenChange={setOpen}
        dismissible={!isPending}
        size="sm"
        title="¿Crear planificación?"
        description={<span className="text-xs">{subjectName} · {levelName}</span>}
      >
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

        <div className="mt-5 flex justify-end gap-2">
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
      </Dialog>
    </>
  );
}
