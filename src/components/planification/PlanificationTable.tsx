"use client";

import { useState, useTransition, useCallback, useRef, useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { PlanificationRow, EjeTransversalId, PrincipioIcon, DcdItem } from "@/modules/planification/planification.types";
import { formatPrincipioLabel } from "@/modules/planification/planification.types";
import type { ActionResult } from "@/types";
import type { SavePlanificationRowsInput } from "@/modules/planification/planification.schema";
import { EJES_TRANSVERSALES, ERE_SOCIAL, ERE_ODS, ALL_EJES, PRINCIPIO_COLORS, DUA_PRINCIPIOS } from "@/constants/planification";
import type { SectionState } from "@/constants/review";

// ── Tipos locales (solo UI) ───────────────────────────────────────────────────

interface SubItem {
  localId: string;
  text: string;
}

interface LocalDcdItem {
  localId: string;
  text: string;
  ejes: EjeTransversalId[];
}

interface LocalMethodologyItem {
  localId: string;
  text: string;
  principle: PrincipioIcon | null;
}

interface LocalPumRow {
  localId: string;
  id?: string;
  dcdItems: LocalDcdItem[];
  indicators: SubItem[];
  methodologyItems: LocalMethodologyItem[];
  resources: LocalMethodologyItem[];
  evaluations: SubItem[];
}

export type PlanSaveAction    = (data: SavePlanificationRowsInput) => Promise<ActionResult>;
export type PlanFinalizeAction = (planificationId: string) => Promise<ActionResult>;

// ── IDs locales estables ──────────────────────────────────────────────────────

let seq = 0;
const newId = () => `lid-${++seq}`;

// ── Conversión servidor → local ───────────────────────────────────────────────

// Backward compat: handles old { principio, numeros[] } and { principio, numero } formats
function normalizePrinciple(raw: unknown): PrincipioIcon | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const principio = r.principio as 1 | 2 | 3;
  if (![1, 2, 3].includes(principio)) return null;
  // New format
  if (typeof r.pauta === "number" && Array.isArray(r.subPautas)) {
    return { principio, pauta: r.pauta as number, subPautas: r.subPautas as number[] };
  }
  // Old format: { principio, numeros[] }
  if (Array.isArray(r.numeros) && r.numeros.length > 0) {
    return { principio, pauta: (r.numeros as number[])[0], subPautas: [] };
  }
  // Very old: { principio, numero }
  if (typeof r.numero === "number") return { principio, pauta: r.numero, subPautas: [] };
  return { principio, pauta: 1, subPautas: [] };
}

function toLocalRow(r: PlanificationRow): LocalPumRow {
  const dcdItems: LocalDcdItem[] = r.data.dcdItems.length > 0
    ? r.data.dcdItems.map(d => ({ localId: newId(), text: d.text, ejes: d.ejes }))
    : [{ localId: newId(), text: "", ejes: [] }];

  return {
    localId: newId(),
    id: r.id,
    dcdItems,
    indicators: r.data.indicators.length > 0
      ? r.data.indicators.map(t => ({ localId: newId(), text: t }))
      : [{ localId: newId(), text: "" }],
    methodologyItems: r.data.methodologyItems.length > 0
      ? r.data.methodologyItems.map(m => ({
          localId: newId(), text: m.text,
          principle: normalizePrinciple(m.principle as unknown),
        }))
      : [{ localId: newId(), text: "", principle: null }],
    resources: r.data.resources.length > 0
      ? r.data.resources.map(m => ({
          localId: newId(), text: m.text,
          principle: normalizePrinciple(m.principle as unknown),
        }))
      : [{ localId: newId(), text: "", principle: null }],
    evaluations: r.data.evaluations.length > 0
      ? r.data.evaluations.map(t => ({ localId: newId(), text: t }))
      : [{ localId: newId(), text: "" }],
  };
}

function emptyRow(): LocalPumRow {
  return {
    localId: newId(),
    dcdItems:        [{ localId: newId(), text: "", ejes: [] }],
    indicators:      [{ localId: newId(), text: "" }],
    methodologyItems:[{ localId: newId(), text: "", principle: null }],
    resources:       [{ localId: newId(), text: "", principle: null }],
    evaluations:     [{ localId: newId(), text: "" }],
  };
}

// ── AutoTextarea ──────────────────────────────────────────────────────────────

function AutoTextarea({
  value, onChange, disabled, placeholder, className,
}: {
  value: string; onChange: (v: string) => void;
  disabled?: boolean; placeholder?: string; className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      rows={2}
      className={`w-full resize-none overflow-hidden bg-transparent text-sm text-pum-text placeholder-pum-text-disabled outline-none leading-relaxed ${className ?? ""}`}
      style={{ minHeight: "2.5rem" }}
    />
  );
}

// ── EjeTransversalSelector ────────────────────────────────────────────────────

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

function EjeTransversalSelector({
  value, onChange, disabled, hasError,
}: {
  value: EjeTransversalId[];
  onChange: (v: EjeTransversalId[]) => void;
  disabled?: boolean;
  hasError?: boolean;
}) {
  const [ereOpen, setEreOpen] = useState(false);

  const toggle = (id: EjeTransversalId) => {
    if (disabled) return;
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const selectedEre = [...ERE_SOCIAL, ...ERE_ODS].filter((e) =>
    value.includes(e.id as EjeTransversalId)
  );
  const ereCount = selectedEre.length;

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

      {/* Iconos ERE seleccionados — mostrar debajo */}
      {selectedEre.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mt-1.5">
          {selectedEre.map((eje) => (
            <button
              key={eje.id}
              type="button"
              title={`${eje.label} — click para quitar`}
              disabled={disabled}
              onClick={() => toggle(eje.id as EjeTransversalId)}
              className={`w-10 h-10 rounded-lg overflow-hidden transition-all border-2 border-pum-primary ring-2 ring-pum-primary/30 flex items-center justify-center ${
                disabled ? "opacity-60 cursor-default" : "cursor-pointer"
              }`}
            >
              <EjeIcon file={eje.file} abbr={eje.abbr} />
            </button>
          ))}
        </div>
      )}

      {/* Botón +ERE */}
      {!disabled && (
        <button
          type="button"
          onClick={() => setEreOpen(true)}
          className="text-[0.7rem] text-pum-primary hover:underline underline-offset-2 text-left cursor-pointer self-start mt-1.5 transition-colors"
        >
          + ERE{ereCount > 0 ? ` (${ereCount})` : ""}
        </button>
      )}

      {/* Modal ERE */}
      {ereOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
            onClick={() => setEreOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEreOpen(false)}>
            <div
              className="bg-white rounded-2xl w-[480px] max-h-[85vh] overflow-y-auto flex flex-col"
              style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 sticky top-0 bg-white z-10" style={{ borderBottom: "1px solid #f1f5f9" }}>
                <div>
                  <span className="text-sm font-bold text-pum-text">Educación Religiosa Escolar</span>
                  {ereCount > 0 && (
                    <span className="ml-2 text-xs font-semibold text-pum-primary">{ereCount} seleccionado{ereCount !== 1 ? "s" : ""}</span>
                  )}
                </div>
                <button type="button" onClick={() => setEreOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer text-xl leading-none">×</button>
              </div>

              <div className="px-5 py-4 flex flex-col gap-5">
                {/* Grupo: Valores Sociales */}
                <div>
                  <p className="text-[0.65rem] font-semibold text-pum-text-muted uppercase tracking-wide mb-2">Valores Sociales</p>
                  <div className="grid grid-cols-4 gap-2">
                    {ERE_SOCIAL.map((eje) => {
                      const sel = value.includes(eje.id as EjeTransversalId);
                      return (
                        <button
                          key={eje.id}
                          type="button"
                          title={eje.label}
                          onClick={() => toggle(eje.id as EjeTransversalId)}
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

                {/* Grupo: ODS */}
                <div>
                  <p className="text-[0.65rem] font-semibold text-pum-text-muted uppercase tracking-wide mb-2">Objetivos de Desarrollo Sostenible</p>
                  <div className="grid grid-cols-4 gap-2">
                    {ERE_ODS.map((eje) => {
                      const sel = value.includes(eje.id as EjeTransversalId);
                      return (
                        <button
                          key={eje.id}
                          type="button"
                          title={eje.label}
                          onClick={() => toggle(eje.id as EjeTransversalId)}
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
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #f1f5f9" }}>
                {ereCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const ereIds = new Set<EjeTransversalId>([...ERE_SOCIAL, ...ERE_ODS].map((e) => e.id as EjeTransversalId));
                      onChange(value.filter((id) => !ereIds.has(id)));
                    }}
                    className="text-xs text-red-400 hover:text-red-600 cursor-pointer"
                  >
                    Quitar todos
                  </button>
                )}
                <div className="ml-auto">
                  <button
                    type="button"
                    onClick={() => setEreOpen(false)}
                    className="text-xs font-bold px-4 py-1.5 rounded-xl text-white cursor-pointer"
                    style={{ backgroundColor: "#002753" }}
                  >
                    ✓ Listo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ── PrincipleBadge ────────────────────────────────────────────────────────────

function PrincipleBadge({
  principle, isOpen, disabled,
  onToggle, onPickPrincipio, onPickPauta, onToggleSubPauta, onClear,
}: {
  principle: PrincipioIcon | null;
  isOpen: boolean;
  disabled?: boolean;
  onToggle: () => void;
  onPickPrincipio: (p: 1 | 2 | 3) => void;
  onPickPauta: (pauta: number) => void;
  onToggleSubPauta: (n: number) => void;
  onClear: () => void;
}) {
  const color = principle ? PRINCIPIO_COLORS[principle.principio] : "#94A3B8";
  const label = principle ? formatPrincipioLabel(principle) : "P?";

  // Sub-pautas disponibles para la pauta actualmente seleccionada
  const currentPrincipioDef = principle
    ? DUA_PRINCIPIOS.find((p) => p.num === principle.principio)
    : undefined;
  const currentPautaDef = principle && currentPrincipioDef
    ? currentPrincipioDef.pautas.find((p) => p.num === principle.pauta)
    : undefined;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        title={principle ? `${label} — click para editar` : "Seleccionar principio DUA"}
        onClick={disabled ? undefined : onToggle}
        className={`min-w-[2.75rem] h-9 px-1.5 rounded-full flex items-center justify-center text-[0.58rem] font-bold text-white transition-all ${
          disabled ? "opacity-60 cursor-default" : "cursor-pointer hover:opacity-90"
        } ${isOpen ? "ring-2 ring-offset-1" : ""}`}
        style={{ backgroundColor: color, ...(isOpen ? { outlineColor: color } : {}) }}
      >
        {label}
      </button>

      {isOpen && !disabled && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
            onClick={onToggle}
            aria-hidden="true"
          />

          {/* Modal centrado */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onToggle}>
            <div
              className="bg-white rounded-2xl shadow-2xl w-80 max-h-[90vh] overflow-y-auto"
              style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: "1px solid #f1f5f9" }}>
                <span className="text-sm font-bold text-pum-text">Principio DUA</span>
                <button type="button" onClick={onToggle} className="text-slate-400 hover:text-slate-600 cursor-pointer text-lg leading-none">×</button>
              </div>

              <div className="px-5 py-4 flex flex-col gap-4">
                {/* Selector de principio */}
                <div>
                  <p className="text-[0.65rem] font-semibold text-pum-text-muted uppercase tracking-wide mb-2">Principio</p>
                  <div className="flex gap-2">
                    {([1, 2, 3] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => onPickPrincipio(p)}
                        className={`flex-1 py-2 text-sm font-bold text-white rounded-xl cursor-pointer transition-all ${
                          principle?.principio === p ? "ring-2 ring-offset-2" : "opacity-60 hover:opacity-85"
                        }`}
                        style={{
                          backgroundColor: PRINCIPIO_COLORS[p],
                          ...(principle?.principio === p ? { ringColor: PRINCIPIO_COLORS[p] } : {}),
                        }}
                      >
                        P{p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selector de pauta */}
                {principle && currentPrincipioDef && (
                  <div>
                    <p className="text-[0.65rem] font-semibold text-pum-text-muted uppercase tracking-wide mb-2">Pauta</p>
                    <div className="flex flex-col gap-1.5">
                      {currentPrincipioDef.pautas.map((pd) => {
                        const selected = principle.pauta === pd.num;
                        return (
                          <button
                            key={pd.num}
                            type="button"
                            onClick={() => onPickPauta(pd.num)}
                            className="text-left text-xs px-3 py-2 rounded-xl cursor-pointer transition-all border"
                            style={
                              selected
                                ? { backgroundColor: color, color: "#fff", borderColor: color, fontWeight: 600 }
                                : { backgroundColor: "#f8fafc", color: "#374151", borderColor: "#e2e8f0" }
                            }
                          >
                            {pd.num}. {pd.label.replace(/^Pauta \d+:\s*/, "")}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sub-pautas */}
                {principle && currentPautaDef && (
                  <div>
                    <p className="text-[0.65rem] font-semibold text-pum-text-muted uppercase tracking-wide mb-2">Sub-pautas</p>
                    <div className="flex flex-col gap-1.5">
                      {currentPautaDef.subPautas.map((sp) => {
                        const checked = principle.subPautas.includes(sp.num);
                        return (
                          <button
                            key={sp.num}
                            type="button"
                            onClick={() => onToggleSubPauta(sp.num)}
                            className="text-left text-xs px-3 py-2 rounded-xl cursor-pointer transition-all border"
                            style={
                              checked
                                ? { backgroundColor: color, color: "#fff", borderColor: color, fontWeight: 600 }
                                : { backgroundColor: "#f8fafc", color: "#374151", borderColor: "#e2e8f0" }
                            }
                          >
                            <span style={{ fontWeight: checked ? 700 : 500 }}>
                              {principle.principio}:{principle.pauta}.{sp.num}
                            </span>{" "}
                            — {sp.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid #f1f5f9" }}>
                <button
                  type="button"
                  onClick={onClear}
                  className="text-xs text-red-400 hover:text-red-600 cursor-pointer"
                >
                  Quitar principio
                </button>
                <button
                  type="button"
                  onClick={onToggle}
                  className="text-xs font-bold px-4 py-1.5 rounded-xl text-white cursor-pointer"
                  style={{ backgroundColor: color !== "#94A3B8" ? color : "#64748b" }}
                >
                  ✓ Listo
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ── SubItemList ───────────────────────────────────────────────────────────────

function SubItemList({
  items, disabled, placeholder, onAdd, onRemove, onUpdate,
}: {
  items: SubItem[];
  disabled?: boolean;
  placeholder?: string;
  onAdd: () => void;
  onRemove: (localId: string) => void;
  onUpdate: (localId: string, value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => (
        <div key={item.localId} className="flex gap-1 items-start">
          <AutoTextarea
            value={item.text}
            onChange={(v) => onUpdate(item.localId, v)}
            disabled={disabled}
            placeholder={placeholder}
            className="flex-1"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onRemove(item.localId)}
              title="Eliminar ítem"
              className="text-pum-text-disabled hover:text-pum-error mt-1 leading-none text-base cursor-pointer shrink-0 transition-colors"
            >
              ×
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={onAdd}
          className="text-[0.7rem] text-pum-primary hover:underline underline-offset-2 text-left cursor-pointer self-start mt-0.5 transition-colors"
        >
          + agregar
        </button>
      )}
    </div>
  );
}

// ── MethodologyItemsList ──────────────────────────────────────────────────────

function MethodologyItemsList({
  items, disabled, openPickerId, placeholder,
  onAdd, onRemove, onUpdateText,
  onTogglePicker, onPickPrincipio, onPickPauta, onToggleSubPauta, onClearPrinciple,
}: {
  items: LocalMethodologyItem[];
  disabled?: boolean;
  openPickerId: string | null;
  placeholder?: string;
  onAdd: () => void;
  onRemove: (localId: string) => void;
  onUpdateText: (localId: string, value: string) => void;
  onTogglePicker: (localId: string) => void;
  onPickPrincipio: (itemLocalId: string, p: 1 | 2 | 3) => void;
  onPickPauta: (itemLocalId: string, pauta: number) => void;
  onToggleSubPauta: (itemLocalId: string, n: number) => void;
  onClearPrinciple: (localId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.localId} className="flex gap-1.5 items-start">
          <PrincipleBadge
            principle={item.principle}
            isOpen={openPickerId === item.localId}
            disabled={disabled}
            onToggle={() => onTogglePicker(item.localId)}
            onPickPrincipio={(p) => onPickPrincipio(item.localId, p)}
            onPickPauta={(pauta) => onPickPauta(item.localId, pauta)}
            onToggleSubPauta={(n) => onToggleSubPauta(item.localId, n)}
            onClear={() => onClearPrinciple(item.localId)}
          />
          <AutoTextarea
            value={item.text}
            onChange={(v) => onUpdateText(item.localId, v)}
            disabled={disabled}
            placeholder={placeholder ?? "Estrategia o actividad..."}
            className="flex-1"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onRemove(item.localId)}
              title="Eliminar ítem"
              className="text-pum-text-disabled hover:text-pum-error mt-1 leading-none text-base cursor-pointer shrink-0 transition-colors"
            >
              ×
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={onAdd}
          className="text-[0.7rem] text-pum-primary hover:underline underline-offset-2 text-left cursor-pointer self-start mt-0.5 transition-colors"
        >
          + agregar
        </button>
      )}
    </div>
  );
}

// ── FinalizeDialog ────────────────────────────────────────────────────────────

function FinalizeDialog({
  onConfirm, onCancel, isPending, error,
}: {
  onConfirm: () => void; onCancel: () => void;
  isPending: boolean; error: string | null;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <div className="bg-pum-surface border border-pum-border rounded-xl shadow-pum-md w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-pum-text mb-2">Finalizar planificación</h2>
        <p className="text-sm text-pum-text-muted mb-1">
          Al finalizar, la planificación quedará{" "}
          <strong className="text-pum-text">bloqueada para edición</strong>. Esta acción no se puede deshacer.
        </p>
        <p className="text-sm text-pum-text-muted mb-5">
          Asegúrate de haber completado todas las filas antes de continuar.
        </p>
        {error && (
          <div className="bg-pum-error-light border border-pum-error rounded-md p-3 mb-4">
            <p className="text-sm text-pum-error">{error}</p>
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 text-sm border border-pum-border text-pum-text rounded-md hover:bg-pum-bg disabled:opacity-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium bg-pum-success text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isPending ? "Finalizando..." : "Sí, finalizar"}
          </button>
        </div>
      </div>
    </div>
  );
}

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

  const [rows, setRows] = useState<LocalPumRow[]>(() =>
    initialRows.length > 0 ? initialRows.map(toLocalRow) : [emptyRow()]
  );
  const [openPrinciplePicker, setOpenPrinciplePicker] = useState<string | null>(null);
  const [saveStatus, setSaveStatus]   = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError]     = useState<string | null>(null);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();
  // Track which rows have been locally edited (their orange highlight should disappear but comment stays)
  const [editedLocalIds, setEditedLocalIds] = useState<Set<string>>(() => new Set());
  const [isDirty, setIsDirty] = useState(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mutable ref so the autosave timer always calls the latest handleSave (avoids stale closures)
  const handleSaveRef = useRef<() => void>(() => {});

  const markDirty = () => {
    setSaveStatus("idle");
    setSaveError(null);
    setIsDirty(true);
    if (!isFinalized) {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => {
        autosaveTimerRef.current = null;
        handleSaveRef.current();
      }, 2500);
    }
  };

  const markRowEdited = (localId: string) => {
    setEditedLocalIds((prev) => { const s = new Set(prev); s.add(localId); return s; });
  };

  // ── Payload ───────────────────────────────────────────────────────────────

  const buildPayload = useCallback((): SavePlanificationRowsInput => ({
    planificationId: planId,
    rows: rows.map((r, i) => ({
      ...(r.id ? { id: r.id } : {}),
      rowIndex: i,
      data: {
        dcdItems:         r.dcdItems.map((d) => ({ text: d.text, ejes: d.ejes })),
        indicators:       r.indicators.map((s) => s.text),
        methodologyItems: r.methodologyItems.map((m) => ({ text: m.text, principle: m.principle })),
        resources:        r.resources.map((m) => ({ text: m.text, principle: m.principle })),
        evaluations:      r.evaluations.map((s) => s.text),
      },
    })),
  }), [planId, rows]);

  // ── Guardar / Finalizar ───────────────────────────────────────────────────

  const handleSave = () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    setSaveStatus("saving");
    setSaveError(null);
    startTransition(async () => {
      const result = await onSave(buildPayload());
      if (result.success) {
        setSaveStatus("saved");
        setIsDirty(false);
        if (onClearFeedback && editedLocalIds.size > 0) {
          const editedKeys = rows
            .map((r, idx) => editedLocalIds.has(r.localId) ? `row_${idx}` : null)
            .filter(Boolean) as string[];
          if (editedKeys.length > 0) await onClearFeedback(planId, editedKeys);
          setEditedLocalIds(new Set());
        }
      } else {
        setSaveStatus("error");
        setSaveError(result.error);
      }
    });
  };

  // Keep ref updated so the autosave timer always calls the latest version
  useEffect(() => { handleSaveRef.current = handleSave; });

  const handleFinalizeConfirm = () => {
    setFinalizeError(null);
    startTransition(async () => {
      const saveResult = await onSave(buildPayload());
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

  // ── Mutaciones de filas ───────────────────────────────────────────────────

  const addDcdItem = (rowId: string) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? { ...r, dcdItems: [...r.dcdItems, { localId: newId(), text: "", ejes: [] }] }
        : r
    ));
    markRowEdited(rowId); markDirty();
  };

  const removeDcdItem = (rowId: string, itemId: string) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? { ...r, dcdItems: r.dcdItems.filter((d) => d.localId !== itemId) }
        : r
    ));
    markRowEdited(rowId); markDirty();
  };

  const updateDcdText = (rowId: string, itemId: string, v: string) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? { ...r, dcdItems: r.dcdItems.map((d) => d.localId === itemId ? { ...d, text: v } : d) }
        : r
    ));
    markRowEdited(rowId); markDirty();
  };

  const updateDcdEjes = (rowId: string, itemId: string, ejes: EjeTransversalId[]) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? { ...r, dcdItems: r.dcdItems.map((d) => d.localId === itemId ? { ...d, ejes } : d) }
        : r
    ));
    markRowEdited(rowId); markDirty();
  };

  type SimpleListKey = "indicators" | "evaluations";

  const addSubItem = (rowId: string, field: SimpleListKey) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? { ...r, [field]: [...(r[field] as SubItem[]), { localId: newId(), text: "" }] }
        : r
    ));
    markRowEdited(rowId);
    markDirty();
  };

  const removeSubItem = (rowId: string, field: SimpleListKey, itemId: string) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? { ...r, [field]: (r[field] as SubItem[]).filter((i) => i.localId !== itemId) }
        : r
    ));
    markRowEdited(rowId);
    markDirty();
  };

  const updateSubItem = (rowId: string, field: SimpleListKey, itemId: string, v: string) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? { ...r, [field]: (r[field] as SubItem[]).map((i) => i.localId === itemId ? { ...i, text: v } : i) }
        : r
    ));
    markRowEdited(rowId);
    markDirty();
  };

  const addMethodologyItem = (rowId: string) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? { ...r, methodologyItems: [...r.methodologyItems, { localId: newId(), text: "", principle: null }] }
        : r
    ));
    markRowEdited(rowId);
    markDirty();
  };

  const removeMethodologyItem = (rowId: string, itemId: string) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? { ...r, methodologyItems: r.methodologyItems.filter((i) => i.localId !== itemId) }
        : r
    ));
    markRowEdited(rowId);
    markDirty();
  };

  const updateMethodologyText = (rowId: string, itemId: string, v: string) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? { ...r, methodologyItems: r.methodologyItems.map((i) => i.localId === itemId ? { ...i, text: v } : i) }
        : r
    ));
    markRowEdited(rowId);
    markDirty();
  };

  const handlePickPrincipio = (rowId: string, itemId: string, principio: 1 | 2 | 3) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? {
            ...r,
            methodologyItems: r.methodologyItems.map((i) => {
              if (i.localId !== itemId) return i;
              // Keep pauta only if same principle, else reset
              const pauta = i.principle?.principio === principio ? i.principle.pauta : 1;
              return { ...i, principle: { principio, pauta, subPautas: [] } };
            }),
          }
        : r
    ));
    markRowEdited(rowId);
    markDirty();
  };

  const handlePickPauta = (rowId: string, itemId: string, pauta: number) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? {
            ...r,
            methodologyItems: r.methodologyItems.map((i) => {
              if (i.localId !== itemId || !i.principle) return i;
              return { ...i, principle: { ...i.principle, pauta, subPautas: [] } };
            }),
          }
        : r
    ));
    markRowEdited(rowId);
    markDirty();
  };

  const handleToggleSubPauta = (rowId: string, itemId: string, n: number) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? {
            ...r,
            methodologyItems: r.methodologyItems.map((i) => {
              if (i.localId !== itemId || !i.principle) return i;
              const current = i.principle.subPautas;
              const newSubs = current.includes(n)
                ? current.filter((s) => s !== n)
                : [...current, n].sort((a, b) => a - b);
              return { ...i, principle: { ...i.principle, subPautas: newSubs } };
            }),
          }
        : r
    ));
    markRowEdited(rowId);
    markDirty();
  };

  const clearPrinciple = (rowId: string, itemId: string) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? { ...r, methodologyItems: r.methodologyItems.map((i) => i.localId === itemId ? { ...i, principle: null } : i) }
        : r
    ));
    setOpenPrinciplePicker(null);
    markRowEdited(rowId);
    markDirty();
  };

  // ── Handlers recursos (con badge DUA) ────────────────────────────────────

  const addResourceItem = (rowId: string) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? { ...r, resources: [...r.resources, { localId: newId(), text: "", principle: null }] }
        : r
    ));
    markRowEdited(rowId); markDirty();
  };

  const removeResourceItem = (rowId: string, itemId: string) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? { ...r, resources: r.resources.filter((i) => i.localId !== itemId) }
        : r
    ));
    markRowEdited(rowId); markDirty();
  };

  const updateResourceText = (rowId: string, itemId: string, v: string) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? { ...r, resources: r.resources.map((i) => i.localId === itemId ? { ...i, text: v } : i) }
        : r
    ));
    markRowEdited(rowId); markDirty();
  };

  const handlePickPrincipioRes = (rowId: string, itemId: string, principio: 1 | 2 | 3) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? {
            ...r,
            resources: r.resources.map((i) => {
              if (i.localId !== itemId) return i;
              const pauta = i.principle?.principio === principio ? i.principle.pauta : 1;
              return { ...i, principle: { principio, pauta, subPautas: [] } };
            }),
          }
        : r
    ));
    markRowEdited(rowId); markDirty();
  };

  const handlePickPautaRes = (rowId: string, itemId: string, pauta: number) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? {
            ...r,
            resources: r.resources.map((i) => {
              if (i.localId !== itemId || !i.principle) return i;
              return { ...i, principle: { ...i.principle, pauta, subPautas: [] } };
            }),
          }
        : r
    ));
    markRowEdited(rowId); markDirty();
  };

  const handleToggleSubPautaRes = (rowId: string, itemId: string, n: number) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? {
            ...r,
            resources: r.resources.map((i) => {
              if (i.localId !== itemId || !i.principle) return i;
              const current = i.principle.subPautas;
              const newSubs = current.includes(n)
                ? current.filter((s) => s !== n)
                : [...current, n].sort((a, b) => a - b);
              return { ...i, principle: { ...i.principle, subPautas: newSubs } };
            }),
          }
        : r
    ));
    markRowEdited(rowId); markDirty();
  };

  const clearPrincipleRes = (rowId: string, itemId: string) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? { ...r, resources: r.resources.map((i) => i.localId === itemId ? { ...i, principle: null } : i) }
        : r
    ));
    setOpenPrinciplePicker(null);
    markRowEdited(rowId); markDirty();
  };

  const addRow = () => { setRows((p) => [...p, emptyRow()]); markDirty(); };
  const removeRow = (localId: string) => {
    setRows((p) => p.length > 1 ? p.filter((r) => r.localId !== localId) : p);
    markDirty();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // Fixed-width columns: text wraps vertically instead of expanding horizontally
  const HEADERS = [
    { label: "#",                     w: "3%",  subtitle: undefined, title: undefined },
    { label: "¿Qué van a aprender?",  w: "22%", subtitle: "Destreza con Criterio de Desempeño / Competencia",                              title: "DCD — Destrezas con Criterios de Desempeño: habilidades y conocimientos que el estudiante debe dominar" },
    { label: "¿Qué evaluar?",         w: "17%", subtitle: "Indicadores de evaluación",                                                     title: "Indicadores de logro: criterios observables para verificar que se alcanzó la destreza" },
    { label: "¿Cómo van a aprender?", w: "22%", subtitle: "Metodologías para los aprendizajes · Estrategias Metodológicas · DUA",         title: "Metodología y Principios DUA (Diseño Universal para el Aprendizaje): estrategias de enseñanza inclusiva" },
    { label: "Recursos",              w: "13%", subtitle: undefined,                                                                        title: "Materiales, herramientas y medios necesarios para la clase" },
    { label: "¿Cómo evaluar?",        w: "19%", subtitle: "Actividades de Evaluación / Técnicas / Instrumentos",                           title: "Técnicas e instrumentos de evaluación formativa y sumativa" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      {!isFinalized && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm min-h-[1.25rem] flex items-center gap-2">
            {saveStatus === "saving" && (
              <span className="text-pum-text-muted flex items-center gap-1.5">
                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Guardando...
              </span>
            )}
            {saveStatus === "saved" && !isDirty && (
              <span className="text-pum-success">✓ Guardado</span>
            )}
            {saveStatus === "error" && (
              <span className="text-pum-error">{saveError}</span>
            )}
            {isDirty && saveStatus === "idle" && (
              <span className="text-[11px] text-pum-text-disabled">Se guardará automáticamente…</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium bg-pum-primary text-white rounded-md hover:bg-pum-primary-hover disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isPending && saveStatus === "saving" ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={() => { setFinalizeError(null); setShowFinalizeDialog(true); }}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium border border-pum-success text-pum-success rounded-md hover:bg-pum-success-light disabled:opacity-50 transition-colors cursor-pointer"
            >
              Finalizar PUM
            </button>
          </div>
        </div>
      )}

      {/* ── Tabla ─────────────────────────────────────────────────────────── */}

      {/* Mobile scroll hint */}
      <p className="sm:hidden text-[11px] text-pum-text-disabled flex items-center gap-1.5 -mb-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
        Desliza para ver todas las columnas
      </p>

      <div className="relative">
        {/* Fade-right gradient scroll indicator */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-lg z-10 sm:hidden"
          style={{ background: "linear-gradient(to left, rgba(255,255,255,0.85), transparent)" }}
          aria-hidden="true"
        />
      <div className="overflow-x-auto rounded-lg border border-pum-border" style={{ WebkitOverflowScrolling: "touch" }}>
        <table className="border-collapse w-full" style={{ tableLayout: "fixed", minWidth: 900 }}>
          <colgroup>
            {HEADERS.map((h, i) => <col key={i} style={{ width: h.w }} />)}
            {!isFinalized && <col style={{ width: "4%" }} />}
          </colgroup>
          <thead>
            <tr
              className="text-xs font-semibold text-white"
              style={{ backgroundColor: "var(--pum-color-primary)" }}
            >
              {HEADERS.map((h, i) => (
                <th
                  key={i}
                  title={h.title}
                  className={`px-3 py-2 border-r border-white/20 last:border-r-0 ${i === 0 ? "text-center" : "text-left"} ${h.title ? "cursor-help" : ""}`}
                >
                  <span className="flex items-center gap-1 font-semibold text-xs leading-tight">
                    {h.label}
                    {h.title && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 flex-shrink-0" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                      </svg>
                    )}
                  </span>
                  {h.subtitle && (
                    <span className="block mt-1 text-[10px] font-normal italic opacity-80 leading-tight">
                      {h.subtitle}
                    </span>
                  )}
                </th>
              ))}
              {!isFinalized && <th className="w-8 px-1" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const fb         = rowFeedback?.[i];
              const fbComment  = fb?.comment?.trim() ? fb.comment.trim() : null;
              const fbApproved = fb?.approved && !fbComment;
              const rowEdited  = editedLocalIds.has(row.localId);
              const showOrange = !!fbComment && !rowEdited;
              const colCount   = isFinalized ? 6 : 7;

              return (
              <Fragment key={row.localId}>
              <tr
                className={`border-t border-pum-border align-top transition-colors ${!fb ? "hover:bg-pum-bg/30" : ""}`}
                style={{ background: showOrange ? "rgba(249,115,22,0.10)" : fbApproved ? "rgba(22,163,74,0.05)" : undefined }}
              >
                {/* # */}
                <td
                  className="px-3 py-3 text-center text-sm text-pum-text-muted border-r border-pum-border"
                  style={{ borderLeft: showOrange ? "3px solid #f97316" : fbApproved ? "3px solid #16a34a" : undefined }}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{i + 1}</span>
                    {fbApproved && (
                      <span className="text-[10px] font-bold" style={{ color: "#16a34a" }}>✓</span>
                    )}
                  </div>
                </td>

                {/* ¿Qué van a aprender? */}
                <td className="px-3 py-2 border-r border-pum-border" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                  <div className="flex flex-col gap-3">
                    {row.dcdItems.map((dcdItem, dIdx) => (
                      <div key={dcdItem.localId} className="flex flex-col gap-1">
                        <div className="flex gap-1 items-start">
                          <AutoTextarea
                            value={dcdItem.text}
                            onChange={(v) => updateDcdText(row.localId, dcdItem.localId, v)}
                            disabled={isFinalized}
                            placeholder="Destreza con Criterio de Desempeño..."
                            className="flex-1"
                          />
                          {!isFinalized && row.dcdItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDcdItem(row.localId, dcdItem.localId)}
                              title="Eliminar destreza"
                              className="text-pum-text-disabled hover:text-pum-error mt-1 leading-none text-base cursor-pointer shrink-0 transition-colors"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        <EjeTransversalSelector
                          value={dcdItem.ejes}
                          onChange={(ejes) => updateDcdEjes(row.localId, dcdItem.localId, ejes)}
                          disabled={isFinalized}
                          hasError={false}
                        />
                        {dIdx < row.dcdItems.length - 1 && (
                          <div className="border-t border-pum-border mt-1" />
                        )}
                      </div>
                    ))}
                    {!isFinalized && (
                      <button
                        type="button"
                        onClick={() => addDcdItem(row.localId)}
                        className="text-[0.7rem] text-pum-primary hover:underline underline-offset-2 text-left cursor-pointer self-start transition-colors"
                      >
                        + agregar destreza
                      </button>
                    )}
                  </div>
                </td>

                {/* ¿Qué evaluar? */}
                <td className="px-3 py-2 border-r border-pum-border" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                  <SubItemList
                    items={row.indicators}
                    disabled={isFinalized}
                    placeholder="Indicador de logro..."
                    onAdd={() => addSubItem(row.localId, "indicators")}
                    onRemove={(id) => removeSubItem(row.localId, "indicators", id)}
                    onUpdate={(id, v) => updateSubItem(row.localId, "indicators", id, v)}
                  />
                </td>

                {/* ¿Cómo van a aprender? */}
                <td className="px-3 py-2 border-r border-pum-border" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                  <MethodologyItemsList
                    items={row.methodologyItems}
                    disabled={isFinalized}
                    openPickerId={openPrinciplePicker}
                    onAdd={() => addMethodologyItem(row.localId)}
                    onRemove={(id) => removeMethodologyItem(row.localId, id)}
                    onUpdateText={(id, v) => updateMethodologyText(row.localId, id, v)}
                    onTogglePicker={(id) =>
                      setOpenPrinciplePicker(openPrinciplePicker === id ? null : id)
                    }
                    onPickPrincipio={(id, p) => handlePickPrincipio(row.localId, id, p)}
                    onPickPauta={(id, pauta) => handlePickPauta(row.localId, id, pauta)}
                    onToggleSubPauta={(id, n) => handleToggleSubPauta(row.localId, id, n)}
                    onClearPrinciple={(id) => clearPrinciple(row.localId, id)}
                  />
                </td>

                {/* Recursos */}
                <td className="px-3 py-2 border-r border-pum-border" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                  <MethodologyItemsList
                    items={row.resources}
                    disabled={isFinalized}
                    placeholder="Material o recurso..."
                    openPickerId={openPrinciplePicker}
                    onAdd={() => addResourceItem(row.localId)}
                    onRemove={(id) => removeResourceItem(row.localId, id)}
                    onUpdateText={(id, v) => updateResourceText(row.localId, id, v)}
                    onTogglePicker={(id) =>
                      setOpenPrinciplePicker(openPrinciplePicker === id ? null : id)
                    }
                    onPickPrincipio={(id, p) => handlePickPrincipioRes(row.localId, id, p)}
                    onPickPauta={(id, p) => handlePickPautaRes(row.localId, id, p)}
                    onToggleSubPauta={(id, n) => handleToggleSubPautaRes(row.localId, id, n)}
                    onClearPrinciple={(id) => clearPrincipleRes(row.localId, id)}
                  />
                </td>

                {/* ¿Cómo evaluar? */}
                <td className="px-3 py-2" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                  <SubItemList
                    items={row.evaluations}
                    disabled={isFinalized}
                    placeholder="Técnica o instrumento..."
                    onAdd={() => addSubItem(row.localId, "evaluations")}
                    onRemove={(id) => removeSubItem(row.localId, "evaluations", id)}
                    onUpdate={(id, v) => updateSubItem(row.localId, "evaluations", id, v)}
                  />
                </td>

                {/* Eliminar fila */}
                {!isFinalized && (
                  <td className="px-1 py-2 align-middle">
                    <button
                      type="button"
                      onClick={() => removeRow(row.localId)}
                      disabled={rows.length === 1}
                      title="Eliminar fila"
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
                      <span style={{ fontSize: "12px", flexShrink: 0, marginTop: "1px" }}>💬</span>
                      <span style={{ fontSize: "11px", color: "#9a3412", fontStyle: "italic", lineHeight: "1.4" }}>
                        {fbComment}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>{/* end .relative scroll wrapper */}

      {/* ── Agregar fila ──────────────────────────────────────────────────── */}
      {!isFinalized && rows.length < 50 && (
        <button
          type="button"
          onClick={addRow}
          className="text-sm text-pum-primary hover:underline underline-offset-2 text-left cursor-pointer self-start transition-colors"
        >
          + Agregar fila
        </button>
      )}

      {/* ── Dialog de finalización ────────────────────────────────────────── */}
      {showFinalizeDialog && (
        <FinalizeDialog
          onConfirm={handleFinalizeConfirm}
          onCancel={() => setShowFinalizeDialog(false)}
          isPending={isPending}
          error={finalizeError}
        />
      )}

    </div>
  );
}
