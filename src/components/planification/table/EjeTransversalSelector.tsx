"use client";

import { useState } from "react";
import type { EjeTransversalId } from "@/modules/planification/planification.types";
import { EJES_TRANSVERSALES, ERE_SOCIAL, ERE_ODS, PREPARATORIA_HABILIDADES } from "@/constants/planification";
import { Dialog } from "@/components/ui/Dialog";

interface EjeDef {
  id: number;
  label: string;
  abbr: string;
  file: string;
}

const ERE_ALL = [...ERE_SOCIAL, ...ERE_ODS];

function EjeIcon({ file, abbr, size = 40 }: { file: string; abbr: string; size?: number }) {
  return (
    <img
      src={`/icons/ejes-transversales/${file}`}
      alt={abbr}
      width={size}
      height={size}
      className="w-full h-full object-contain"
      onError={(e) => {
        const img = e.target as HTMLImageElement;
        img.style.display = "none";
        const span = document.createElement("span");
        span.className = "text-[0.6rem] font-bold text-pum-text-muted";
        span.textContent = abbr;
        img.parentElement?.appendChild(span);
      }}
    />
  );
}

/** Ícono seleccionado de un grupo secundario (ERE / Preparatória): click para quitar. */
function SelectedEjeButton({ eje, disabled, onToggle }: { eje: EjeDef; disabled?: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      title={`${eje.label} — click para quitar`}
      aria-label={`Quitar ${eje.label}`}
      disabled={disabled}
      onClick={onToggle}
      className={`w-10 h-10 rounded-lg overflow-hidden transition-all border-2 border-pum-primary ring-2 ring-pum-primary/30 flex items-center justify-center ${
        disabled ? "opacity-60 cursor-default" : "cursor-pointer"
      }`}
    >
      <EjeIcon file={eje.file} abbr={eje.abbr} />
    </button>
  );
}

/** Modal de selección de un grupo de ejes (ERE o Preparatória). */
function EjeGroupDialog({
  open, onOpenChange, title, groups, value, onToggle, onClearAll,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  groups: { label: string; items: readonly EjeDef[] }[];
  value: EjeTransversalId[];
  onToggle: (id: EjeTransversalId) => void;
  onClearAll: () => void;
}) {
  const count = groups.reduce((n, g) => n + g.items.filter((e) => value.includes(e.id as EjeTransversalId)).length, 0);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={
        <>
          {title}
          {count > 0 && (
            <span className="ml-2 text-xs font-semibold text-pum-primary">{count} seleccionado{count !== 1 ? "s" : ""}</span>
          )}
        </>
      }
    >
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        aria-label="Cerrar"
        className="absolute right-5 top-4 text-slate-400 hover:text-slate-600 cursor-pointer text-xl leading-none"
      >
        ×
      </button>

      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-[0.65rem] font-semibold text-pum-text-muted uppercase tracking-wide mb-2">{group.label}</p>
            <div className="grid grid-cols-4 gap-2">
              {group.items.map((eje) => {
                const sel = value.includes(eje.id as EjeTransversalId);
                return (
                  <button
                    key={eje.id}
                    type="button"
                    title={eje.label}
                    aria-pressed={sel}
                    onClick={() => onToggle(eje.id as EjeTransversalId)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all cursor-pointer ${
                      sel ? "border-pum-primary ring-2 ring-pum-primary/20 bg-pum-bg" : "border-transparent hover:border-pum-border bg-slate-50"
                    }`}
                  >
                    <div className="w-12 h-12 flex items-center justify-center">
                      <EjeIcon file={eje.file} abbr={eje.abbr} size={48} />
                    </div>
                    <span className="text-[0.6rem] text-center leading-tight text-pum-text line-clamp-2" style={{ maxWidth: "72px" }}>{eje.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 -mx-6 mt-4 bg-white px-6 py-3 flex items-center justify-between border-t border-slate-100">
        {count > 0 && (
          <button type="button" onClick={onClearAll} className="text-xs text-red-400 hover:text-red-600 cursor-pointer">
            Quitar todos
          </button>
        )}
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-xs font-bold px-4 py-1.5 rounded-xl text-white bg-pum-primary cursor-pointer"
          >
            ✓ Listo
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export function EjeTransversalSelector({
  value, onChange, disabled, hasError,
}: {
  value: EjeTransversalId[];
  onChange: (v: EjeTransversalId[]) => void;
  disabled?: boolean;
  hasError?: boolean;
}) {
  const [ereOpen,  setEreOpen]  = useState(false);
  const [prepOpen, setPrepOpen] = useState(false);

  const toggle = (id: EjeTransversalId) => {
    if (disabled) return;
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const removeGroup = (group: readonly EjeDef[]) => {
    const ids = new Set<EjeTransversalId>(group.map((e) => e.id as EjeTransversalId));
    onChange(value.filter((id) => !ids.has(id)));
  };

  const selectedEre  = ERE_ALL.filter((e) => value.includes(e.id as EjeTransversalId));
  const selectedPrep = PREPARATORIA_HABILIDADES.filter((e) => value.includes(e.id as EjeTransversalId));
  const ereCount  = selectedEre.length;
  const prepCount = selectedPrep.length;

  return (
    <div className={`mt-2 ${hasError ? "p-1.5 rounded-md border border-red-300 bg-red-50" : ""}`}>
      {/* Iconos principales (1-10) */}
      <div className="flex gap-1.5 flex-wrap">
        {EJES_TRANSVERSALES.map((eje) => {
          const selected = value.includes(eje.id as EjeTransversalId);
          return (
            <button
              key={eje.id}
              type="button"
              title={eje.label}
              aria-label={eje.label}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => toggle(eje.id as EjeTransversalId)}
              className={`w-10 h-10 rounded-lg overflow-hidden transition-all border-2 flex items-center justify-center ${
                selected ? "border-pum-primary ring-2 ring-pum-primary/30" : "border-transparent hover:border-pum-border bg-pum-bg"
              } ${disabled ? "opacity-60 cursor-default" : "cursor-pointer"}`}
            >
              <EjeIcon file={eje.file} abbr={eje.abbr} />
            </button>
          );
        })}
      </div>

      {/* Iconos ERE seleccionados — debajo */}
      {ereCount > 0 && (
        <div className="flex gap-1.5 flex-wrap mt-1.5">
          {selectedEre.map((eje) => (
            <SelectedEjeButton key={eje.id} eje={eje} disabled={disabled} onToggle={() => toggle(eje.id as EjeTransversalId)} />
          ))}
        </div>
      )}

      {/* Iconos Preparatória seleccionados — debajo */}
      {prepCount > 0 && (
        <div className="flex gap-1.5 flex-wrap mt-1.5">
          {selectedPrep.map((eje) => (
            <SelectedEjeButton key={eje.id} eje={eje} disabled={disabled} onToggle={() => toggle(eje.id as EjeTransversalId)} />
          ))}
        </div>
      )}

      {/* Botones +ERE y +Preparatória */}
      {!disabled && (
        <div className="flex gap-3 mt-1.5">
          <button
            type="button"
            onClick={() => setEreOpen(true)}
            className="text-[0.7rem] text-pum-primary hover:underline underline-offset-2 text-left cursor-pointer transition-colors"
          >
            + ERE{ereCount > 0 ? ` (${ereCount})` : ""}
          </button>
          <button
            type="button"
            onClick={() => setPrepOpen(true)}
            className="text-[0.7rem] text-pum-primary hover:underline underline-offset-2 text-left cursor-pointer transition-colors"
          >
            + Preparatória{prepCount > 0 ? ` (${prepCount})` : ""}
          </button>
        </div>
      )}

      <EjeGroupDialog
        open={prepOpen}
        onOpenChange={setPrepOpen}
        title="Preparatória"
        groups={[{ label: "Habilidades", items: PREPARATORIA_HABILIDADES }]}
        value={value}
        onToggle={toggle}
        onClearAll={() => removeGroup(PREPARATORIA_HABILIDADES)}
      />

      <EjeGroupDialog
        open={ereOpen}
        onOpenChange={setEreOpen}
        title="Educación Religiosa Escolar"
        groups={[
          { label: "Pacto Educativo Global",             items: ERE_SOCIAL },
          { label: "Objetivos de Desarrollo Sostenible", items: ERE_ODS },
        ]}
        value={value}
        onToggle={toggle}
        onClearAll={() => removeGroup(ERE_ALL)}
      />
    </div>
  );
}
