"use client";

import { useState } from "react";
import type { PrincipioIcon } from "@/modules/planification/planification.types";
import { formatPrincipioLabel } from "@/modules/planification/planification.types";
import { PRINCIPIO_COLORS, DUA_PRINCIPIOS } from "@/constants/planification";
import { Dialog } from "@/components/ui/Dialog";

// El principio (P1/P2/P3) es fijo — se elige con "+Px" en la lista.
// El modal solo permite configurar pautas y sub-pautas.

export function PrincipleBadge({
  principle, isOpen, disabled,
  onToggle, onUpdate,
}: {
  principle: PrincipioIcon;   // nunca null: se crea con +Px
  isOpen: boolean;
  disabled?: boolean;
  onToggle: () => void;
  onUpdate: (p: PrincipioIcon | null) => void;
}) {
  const color = PRINCIPIO_COLORS[principle.principio];
  const label = formatPrincipioLabel(principle);

  const [local, setLocal] = useState<PrincipioIcon>(principle);
  const [activePauta, setActivePauta] = useState<number | null>(null);

  // Al abrir el editor se parte del valor guardado (ajuste durante el render,
  // en lugar de un efecto que provoca un segundo render)
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) { setLocal(principle); setActivePauta(null); }
  }

  const clickPauta = (pautaNum: number) => {
    const inSel = local.selections.some((s) => s.pauta === pautaNum);
    if (activePauta === pautaNum) {
      setLocal({ ...local, selections: local.selections.filter((s) => s.pauta !== pautaNum) });
      setActivePauta(null);
    } else if (inSel) {
      setActivePauta(pautaNum);
    } else {
      setLocal({ ...local, selections: [...local.selections, { pauta: pautaNum, subPautas: [] }] });
      setActivePauta(pautaNum);
    }
  };

  const toggleSubPauta = (subNum: number) => {
    if (activePauta === null) return;
    setLocal({
      ...local,
      selections: local.selections.map((s) => {
        if (s.pauta !== activePauta) return s;
        const newSubs = s.subPautas.includes(subNum)
          ? s.subPautas.filter((n) => n !== subNum)
          : [...s.subPautas, subNum].sort((a, b) => a - b);
        return { ...s, subPautas: newSubs };
      }),
    });
  };

  const handleListo = () => { onUpdate(local); onToggle(); };
  const handleClear = () => { onUpdate(null); onToggle(); };

  const principioDef = DUA_PRINCIPIOS.find((p) => p.num === local.principio);
  const activePautaDef = activePauta !== null && principioDef
    ? principioDef.pautas.find((p) => p.num === activePauta)
    : undefined;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        title={`${label} — click para editar`}
        aria-haspopup="dialog"
        onClick={disabled ? undefined : onToggle}
        className={`min-w-[2.75rem] h-8 px-1.5 rounded-full flex items-center justify-center text-[0.58rem] font-bold text-white transition-all ${
          disabled ? "opacity-60 cursor-default" : "cursor-pointer hover:opacity-90"
        } ${isOpen ? "ring-2 ring-offset-1" : ""}`}
        style={{ backgroundColor: color }}
      >
        {label}
      </button>

      {/* Cerrar (Esc, clic fuera, ×) conserva los cambios, igual que "✓ Listo" */}
      <Dialog
        open={isOpen && !disabled}
        onOpenChange={(open) => { if (!open) handleListo(); }}
        size="sm"
        title={
          <span className="flex items-center gap-2">
            <span className="text-xs font-bold text-white px-2.5 py-1 rounded-full" style={{ backgroundColor: color }}>
              P{local.principio}
            </span>
            Principio DUA
          </span>
        }
      >
        <button
          type="button"
          onClick={handleListo}
          aria-label="Cerrar"
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 cursor-pointer text-lg leading-none"
        >
          ×
        </button>

        <div className="flex flex-col gap-4">
          {/* Pautas */}
          {principioDef && (
            <div>
              <p className="text-[0.65rem] font-semibold text-pum-text-muted uppercase tracking-wide mb-1">
                Pauta{" "}
                <span className="normal-case font-normal text-pum-text-disabled">— click para seleccionar, doble click para quitar</span>
              </p>
              <div className="flex flex-col gap-1.5">
                {principioDef.pautas.map((pd) => {
                  const inSel = local.selections.some((s) => s.pauta === pd.num);
                  const isActive = activePauta === pd.num;
                  const selEntry = local.selections.find((s) => s.pauta === pd.num);
                  return (
                    <button key={pd.num} type="button" onClick={() => clickPauta(pd.num)}
                      aria-pressed={inSel}
                      className="text-left text-xs px-3 py-2 rounded-xl cursor-pointer transition-all border"
                      style={isActive
                        ? { backgroundColor: color, color: "#fff", borderColor: color, fontWeight: 700 }
                        : inSel
                        ? { backgroundColor: `${color}22`, color: "#374151", borderColor: color, fontWeight: 600 }
                        : { backgroundColor: "#f8fafc", color: "#374151", borderColor: "#e2e8f0" }}
                    >
                      <span>{pd.num}. {pd.label.replace(/^Pauta \d+:\s*/, "")}</span>
                      {inSel && selEntry && selEntry.subPautas.length > 0 && (
                        <span className="ml-1.5 text-[0.6rem] font-bold opacity-80">
                          ({selEntry.subPautas.map((n) => `${local.principio}:${pd.num}.${n}`).join(", ")})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-pautas de la pauta activa */}
          {activePautaDef && (
            <div>
              <p className="text-[0.65rem] font-semibold text-pum-text-muted uppercase tracking-wide mb-2">Sub-pautas — Pauta {activePauta}</p>
              <div className="flex flex-col gap-1.5">
                {activePautaDef.subPautas.map((sp) => {
                  const checked = local.selections.find((s) => s.pauta === activePauta)?.subPautas.includes(sp.num) ?? false;
                  return (
                    <button key={sp.num} type="button" onClick={() => toggleSubPauta(sp.num)}
                      aria-pressed={checked}
                      className="text-left text-xs px-3 py-2 rounded-xl cursor-pointer transition-all border"
                      style={checked
                        ? { backgroundColor: color, color: "#fff", borderColor: color, fontWeight: 600 }
                        : { backgroundColor: "#f8fafc", color: "#374151", borderColor: "#e2e8f0" }}
                    >
                      <span style={{ fontWeight: checked ? 700 : 500 }}>{local.principio}:{activePauta}.{sp.num}</span>{" "}— {sp.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="-mx-6 mt-4 flex items-center justify-between border-t border-slate-100 px-6 pt-3">
          <button type="button" onClick={handleClear} className="text-xs text-red-400 hover:text-red-600 cursor-pointer">Quitar principio</button>
          <button type="button" onClick={handleListo} className="text-xs font-bold px-4 py-1.5 rounded-xl text-white cursor-pointer" style={{ backgroundColor: color }}>✓ Listo</button>
        </div>
      </Dialog>
    </div>
  );
}
