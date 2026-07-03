"use client";

import { useState, useTransition, useCallback, useRef, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import type { PlanificationRow, EjeTransversalId, PrincipioIcon } from "@/modules/planification/planification.types";
import type { ActionResult } from "@/types";
import type { SavePlanificationRowsInput } from "@/modules/planification/planification.schema";
import { EJES_TRANSVERSALES, PRINCIPIO_COLORS } from "@/constants/planification";
import type { SectionState } from "@/constants/review";

// ── Tipos locales (solo UI) ───────────────────────────────────────────────────

interface SubItem {
  localId: string;
  text: string;
}

interface LocalMethodologyItem {
  localId: string;
  text: string;
  principle: PrincipioIcon | null;
}

interface LocalPumRow {
  localId: string;
  id?: string;
  dcd: string;
  ejeTransversales: EjeTransversalId[];
  indicators: SubItem[];
  methodologyItems: LocalMethodologyItem[];
  resources: SubItem[];
  evaluations: SubItem[];
}

export type PlanSaveAction    = (data: SavePlanificationRowsInput) => Promise<ActionResult>;
export type PlanFinalizeAction = (planificationId: string) => Promise<ActionResult>;

// ── IDs locales estables ──────────────────────────────────────────────────────

let seq = 0;
const newId = () => `lid-${++seq}`;

// ── Conversión servidor → local ───────────────────────────────────────────────

// Backward compat: old DB records stored { principio, numero } (single); new format is { principio, numeros[] }
function normalizePrinciple(raw: unknown): import("@/modules/planification/planification.types").PrincipioIcon | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const principio = r.principio as 1 | 2 | 3;
  if (![1, 2, 3].includes(principio)) return null;
  if (Array.isArray(r.numeros) && r.numeros.length > 0) return { principio, numeros: r.numeros as number[] };
  if (typeof r.numero === "number") return { principio, numeros: [r.numero] };
  return { principio, numeros: [1] };
}

function toLocalRow(r: PlanificationRow): LocalPumRow {
  // Backward compat: old rows stored ejeTransversal (singular, nullable)
  const raw = r.data as unknown as Record<string, unknown>;
  const ejeTransversales: EjeTransversalId[] = Array.isArray(raw.ejeTransversales)
    ? (raw.ejeTransversales as EjeTransversalId[])
    : raw.ejeTransversal != null
    ? [raw.ejeTransversal as EjeTransversalId]
    : [];
  return {
    localId: newId(),
    id: r.id,
    dcd: r.data.dcd,
    ejeTransversales,
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
      ? r.data.resources.map(t => ({ localId: newId(), text: t }))
      : [{ localId: newId(), text: "" }],
    evaluations: r.data.evaluations.length > 0
      ? r.data.evaluations.map(t => ({ localId: newId(), text: t }))
      : [{ localId: newId(), text: "" }],
  };
}

function emptyRow(): LocalPumRow {
  return {
    localId: newId(),
    dcd: "",
    ejeTransversales: [],
    indicators:      [{ localId: newId(), text: "" }],
    methodologyItems:[{ localId: newId(), text: "", principle: null }],
    resources:       [{ localId: newId(), text: "" }],
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

function EjeTransversalSelector({
  value, onChange, disabled, hasError,
}: {
  value: EjeTransversalId[];
  onChange: (v: EjeTransversalId[]) => void;
  disabled?: boolean;
  hasError?: boolean;
}) {
  const toggle = (id: EjeTransversalId) => {
    if (disabled) return;
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id]
    );
  };

  return (
    <div className={`mt-2 ${hasError ? "p-1.5 rounded-md border border-red-300 bg-red-50" : ""}`}>
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
                selected
                  ? "border-pum-primary ring-2 ring-pum-primary/30"
                  : "border-transparent hover:border-pum-border bg-pum-bg"
              } ${disabled ? "opacity-60 cursor-default" : "cursor-pointer"}`}
            >
              <img
                src={`/icons/ejes-transversales/${eje.file}`}
                alt={eje.abbr}
                width={40}
                height={40}
                className="w-full h-full object-contain"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = "none";
                  const span = document.createElement("span");
                  span.className = "text-[0.6rem] font-bold text-pum-text-muted";
                  span.textContent = eje.abbr;
                  img.parentElement?.appendChild(span);
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── PrincipleBadge ────────────────────────────────────────────────────────────

function PrincipleBadge({
  principle, isOpen, disabled, pautaCounts,
  onToggle, onPickPrincipio, onToggleNumero, onClear,
}: {
  principle: PrincipioIcon | null;
  isOpen: boolean;
  disabled?: boolean;
  pautaCounts: { 1: number; 2: number; 3: number };
  onToggle: () => void;
  onPickPrincipio: (p: 1 | 2 | 3) => void;
  onToggleNumero: (n: number) => void;
  onClear: () => void;
}) {
  const color = principle ? PRINCIPIO_COLORS[principle.principio] : "#94A3B8";
  const nums  = principle?.numeros ?? [];
  const label = principle
    ? `P${principle.principio}${nums.length > 0 ? `.${nums.join(",")}` : ""}`
    : "P?";

  // Numbers available for the selected principle (from pautas filled in step 1)
  const maxNum = principle ? (pautaCounts[principle.principio] ?? 0) : 0;
  const availableNums = maxNum > 0 ? Array.from({ length: maxNum }, (_, i) => i + 1) : [];

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        title={principle ? `${label} — click para editar` : "Seleccionar principio DUA"}
        onClick={disabled ? undefined : onToggle}
        className={`min-w-[2.25rem] h-9 px-1.5 rounded-full flex items-center justify-center text-[0.58rem] font-bold text-white transition-all ${
          disabled ? "opacity-60 cursor-default" : "cursor-pointer hover:opacity-90"
        } ${isOpen ? "ring-2 ring-offset-1" : ""}`}
        style={{ backgroundColor: color, ...(isOpen ? { outlineColor: color } : {}) }}
      >
        {label}
      </button>

      {isOpen && !disabled && (
        <>
          {/* Backdrop — closes modal when clicking outside */}
          <div
            className="fixed inset-0 z-20"
            onClick={onToggle}
            aria-hidden="true"
          />
          <div className="absolute z-30 top-10 left-0 bg-white border border-pum-border shadow-pum-md rounded-xl p-3 w-52">
            {/* Principio selector */}
            <p className="text-[0.65rem] font-semibold text-pum-text-muted mb-1.5">Principio DUA</p>
            <div className="flex gap-1 mb-3">
              {([1, 2, 3] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPickPrincipio(p)}
                  className={`flex-1 py-1.5 text-xs font-bold text-white rounded-md cursor-pointer transition-opacity ${
                    principle?.principio === p ? "opacity-100 ring-2 ring-offset-1 ring-slate-300" : "opacity-70 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: PRINCIPIO_COLORS[p] }}
                >
                  P{p}
                </button>
              ))}
            </div>

            {/* Pauta numbers — only shown when a principle is selected */}
            {principle && (
              <>
                <p className="text-[0.65rem] font-semibold text-pum-text-muted mb-1.5">
                  Pautas (selecciona una o varias)
                </p>
                {availableNums.length === 0 ? (
                  <p className="text-[0.65rem] text-pum-text-disabled italic mb-2">
                    Sin pautas — completa el Paso 1 primero
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {availableNums.map((n) => {
                      const selected = nums.includes(n);
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => onToggleNumero(n)}
                          className="w-7 h-7 text-xs font-semibold rounded-md cursor-pointer transition-all border"
                          style={
                            selected
                              ? { backgroundColor: color, color: "#fff", borderColor: color }
                              : { backgroundColor: "transparent", color: "#374151", borderColor: "#d1d5db" }
                          }
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClear}
                className="text-[0.65rem] text-red-400 hover:text-red-600 cursor-pointer"
              >
                Quitar principio
              </button>
              <button
                type="button"
                onClick={onToggle}
                className="text-[0.65rem] font-bold px-2.5 py-1 rounded-lg text-white cursor-pointer"
                style={{ backgroundColor: color !== "#94A3B8" ? color : "#64748b" }}
              >
                ✓ Guardar
              </button>
            </div>
          </div>
        </>
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
  items, disabled, openPickerId, pautaCounts,
  onAdd, onRemove, onUpdateText,
  onTogglePicker, onPickPrincipio, onToggleNumero, onClearPrinciple,
}: {
  items: LocalMethodologyItem[];
  disabled?: boolean;
  openPickerId: string | null;
  pautaCounts: { 1: number; 2: number; 3: number };
  onAdd: () => void;
  onRemove: (localId: string) => void;
  onUpdateText: (localId: string, value: string) => void;
  onTogglePicker: (localId: string) => void;
  onPickPrincipio: (itemLocalId: string, p: 1 | 2 | 3) => void;
  onToggleNumero: (itemLocalId: string, n: number) => void;
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
            pautaCounts={pautaCounts}
            onToggle={() => onTogglePicker(item.localId)}
            onPickPrincipio={(p) => onPickPrincipio(item.localId, p)}
            onToggleNumero={(n) => onToggleNumero(item.localId, n)}
            onClear={() => onClearPrinciple(item.localId)}
          />
          <AutoTextarea
            value={item.text}
            onChange={(v) => onUpdateText(item.localId, v)}
            disabled={disabled}
            placeholder="Estrategia o actividad..."
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
  planId, initialRows, isFinalized, onSave, onFinalize, onClearFeedback, rowFeedback, pautaCounts,
}: {
  planId: string;
  initialRows: PlanificationRow[];
  isFinalized: boolean;
  onSave: PlanSaveAction;
  onFinalize: PlanFinalizeAction;
  onClearFeedback?: (planId: string, keys: string[]) => Promise<void>;
  rowFeedback?: Record<number, SectionState>;
  pautaCounts?: { 1: number; 2: number; 3: number };
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
        dcd: r.dcd,
        ejeTransversales: r.ejeTransversales,
        indicators:       r.indicators.map((s) => s.text),
        methodologyItems: r.methodologyItems.map((m) => ({ text: m.text, principle: m.principle })),
        resources:        r.resources.map((s) => s.text),
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

  const updateDcd = (localId: string, v: string) => {
    setRows((p) => p.map((r) => r.localId === localId ? { ...r, dcd: v } : r));
    markRowEdited(localId);
    markDirty();
  };

  const updateEjes = (localId: string, ejes: EjeTransversalId[]) => {
    setRows((p) => p.map((r) => r.localId === localId ? { ...r, ejeTransversales: ejes } : r));
    markRowEdited(localId);
    markDirty();
  };

  type SimpleListKey = "indicators" | "resources" | "evaluations";

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

  const safePautaCounts = pautaCounts ?? { 1: 0, 2: 0, 3: 0 };

  const handlePickPrincipio = (rowId: string, itemId: string, principio: 1 | 2 | 3) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? {
            ...r,
            methodologyItems: r.methodologyItems.map((i) => {
              if (i.localId !== itemId) return i;
              // Keep existing numeros only if same principle, else reset to [1]
              const numeros = i.principle?.principio === principio
                ? i.principle.numeros
                : [1];
              return { ...i, principle: { principio, numeros } };
            }),
          }
        : r
    ));
    markRowEdited(rowId);
    markDirty();
  };

  const handleToggleNumero = (rowId: string, itemId: string, numero: number) => {
    setRows((p) => p.map((r) =>
      r.localId === rowId
        ? {
            ...r,
            methodologyItems: r.methodologyItems.map((i) => {
              if (i.localId !== itemId || !i.principle) return i;
              const current = i.principle.numeros;
              const newNumeros = current.includes(numero)
                ? current.filter((n) => n !== numero)
                : [...current, numero].sort((a, b) => a - b);
              // Must keep at least one selected
              if (newNumeros.length === 0) return i;
              return { ...i, principle: { ...i.principle, numeros: newNumeros } };
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
                  <AutoTextarea
                    value={row.dcd}
                    onChange={(v) => updateDcd(row.localId, v)}
                    disabled={isFinalized}
                    placeholder="Destreza con Criterio de Desempeño..."
                  />
                  <EjeTransversalSelector
                    value={row.ejeTransversales}
                    onChange={(ejes) => updateEjes(row.localId, ejes)}
                    disabled={isFinalized}
                    hasError={false}
                  />
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
                    pautaCounts={safePautaCounts}
                    onAdd={() => addMethodologyItem(row.localId)}
                    onRemove={(id) => removeMethodologyItem(row.localId, id)}
                    onUpdateText={(id, v) => updateMethodologyText(row.localId, id, v)}
                    onTogglePicker={(id) =>
                      setOpenPrinciplePicker(openPrinciplePicker === id ? null : id)
                    }
                    onPickPrincipio={(id, p) => handlePickPrincipio(row.localId, id, p)}
                    onToggleNumero={(id, n) => handleToggleNumero(row.localId, id, n)}
                    onClearPrinciple={(id) => clearPrinciple(row.localId, id)}
                  />
                </td>

                {/* Recursos */}
                <td className="px-3 py-2 border-r border-pum-border" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                  <SubItemList
                    items={row.resources}
                    disabled={isFinalized}
                    placeholder="Material o recurso..."
                    onAdd={() => addSubItem(row.localId, "resources")}
                    onRemove={(id) => removeSubItem(row.localId, "resources", id)}
                    onUpdate={(id, v) => updateSubItem(row.localId, "resources", id, v)}
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
