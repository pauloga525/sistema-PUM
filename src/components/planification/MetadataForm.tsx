"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { PlanMetadata, AporteMultimodal, DuaSelection } from "@/modules/planification/planification.types";
import { DUA_PRINCIPIOS } from "@/constants/planification";
import type { SaveMetadataInput } from "@/modules/planification/planification.schema";
import type { ActionResult } from "@/types";
import type { SectionStates, SectionState } from "@/constants/review";

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyMetadata(): PlanMetadata {
  return {
    areaEstudio: "",
    numUnidad: "",
    titulo: "",
    objetivos: [""],
    criterios: [""],
    nPeriodos: "",
    fechInicio: "",
    fechFin: "",
    ejesTransversales: "",
    aportes: Array.from({ length: 6 }, () => ({ dim: "", aporte: "", como: "" })),
    p1: null,
    p2: null,
    p3: null,
  };
}

function mergeWithEmpty(saved: PlanMetadata | null): PlanMetadata {
  const base = emptyMetadata();
  if (!saved) return base;
  return {
    ...saved,
    objetivos: saved.objetivos.length ? saved.objetivos : [""],
    criterios: saved.criterios.length ? saved.criterios : [""],
    p1: saved.p1 ?? null,
    p2: saved.p2 ?? null,
    p3: saved.p3 ?? null,
    aportes: [
      ...saved.aportes,
      ...Array.from(
        { length: Math.max(0, 6 - saved.aportes.length) },
        () => ({ dim: "", aporte: "", como: "" })
      ),
    ].slice(0, 6),
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

type ValidationErrors = Partial<{
  areaEstudio: string;
  numUnidad: string;
  titulo: string;
  objetivos: string;
  criterios: string;
  nPeriodos: string;
  fechInicio: string;
  fechFin: string;
  ejesTransversales: string;
}>;

function validate(form: PlanMetadata): ValidationErrors {
  const e: ValidationErrors = {};
  if (!form.areaEstudio.trim())              e.areaEstudio       = "Campo requerido";
  if (!form.numUnidad.trim())                e.numUnidad         = "Campo requerido";
  if (!form.titulo.trim())                   e.titulo            = "Campo requerido";
  if (!form.objetivos.some((o) => o.trim())) e.objetivos         = "Ingresa al menos un objetivo";
  if (!form.criterios.some((c) => c.trim())) e.criterios         = "Ingresa al menos un criterio";
  if (!form.nPeriodos.trim())                e.nPeriodos         = "Campo requerido";
  if (!form.fechInicio.trim())               e.fechInicio        = "Campo requerido";
  if (!form.fechFin.trim())                  e.fechFin           = "Campo requerido";
  if (!form.ejesTransversales.trim())        e.ejesTransversales = "Campo requerido";
  return e;
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const INPUT_BASE: React.CSSProperties = {
  background: "rgba(244,246,250,0.80)",
  border: "1px solid rgba(0,39,83,0.14)",
  borderRadius: "0.625rem",
  padding: "0.375rem 0.625rem",
  fontSize: "0.75rem",
  color: "#0D1B2E",
  width: "100%",
  outline: "none",
  transition: "border-color 150ms, box-shadow 150ms",
};

const INPUT_ERROR: React.CSSProperties = {
  border: "1px solid rgba(198,40,40,0.50)",
};

const INPUT_FOCUS: React.CSSProperties = {
  border: "1px solid rgba(0,39,83,0.40)",
  boxShadow: "0 0 0 3px rgba(0,39,83,0.07)",
};

const INPUT_DISABLED: React.CSSProperties = {
  background: "rgba(244,246,250,0.50)",
  color: "#8899AA",
  cursor: "not-allowed",
};

const SECTION_DIVIDER: React.CSSProperties = {
  borderLeft: "3px solid rgba(0,39,83,0.20)",
  paddingLeft: "0.625rem",
  marginBottom: "0.75rem",
};

// ── FeedbackHighlight ─────────────────────────────────────────────────────────

function FeedbackHighlight({
  state,
  children,
}: {
  state?: SectionState;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; bottom: number } | null>(null);

  const hasComment = !!state?.comment?.trim();
  const isApproved = !!(state?.approved && !hasComment);
  if (!hasComment && !isApproved) return <>{children}</>;

  const borderColor = hasComment ? "#f97316" : "#16a34a";
  const bg          = hasComment ? "rgba(249,115,22,0.07)" : "rgba(22,163,74,0.06)";

  const showTooltip = () => {
    if (!hasComment || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setTooltipPos({ x: r.left + r.width / 2, bottom: window.innerHeight - r.top + 6 });
  };

  const tooltip = tooltipPos ? (
    <div
      className="pointer-events-none"
      style={{
        position: "fixed",
        bottom: tooltipPos.bottom,
        left: tooltipPos.x,
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "#fef08a",
        border: "1px solid #fbbf24",
        borderRadius: "8px",
        padding: "8px 12px",
        fontSize: "11px",
        color: "#713f12",
        fontWeight: 500,
        width: "220px",
        whiteSpace: "normal",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <p style={{ margin: 0 }}>{state!.comment}</p>
      <div style={{
        position: "absolute", top: "100%", left: "50%",
        transform: "translateX(-50%)",
        width: 0, height: 0,
        borderLeft: "7px solid transparent",
        borderRight: "7px solid transparent",
        borderTop: "7px solid #fbbf24",
      }} />
    </div>
  ) : null;

  return (
    <div
      ref={ref}
      className="relative"
      style={{ border: `1.5px solid ${borderColor}`, borderRadius: "6px", background: bg, padding: "6px 8px" }}
      onMouseEnter={showTooltip}
      onMouseLeave={() => setTooltipPos(null)}
    >
      {children}
      {isApproved && (
        <span
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
          style={{ background: "#16a34a", lineHeight: 1 }}
        >✓</span>
      )}
      {hasComment && (
        <span className="absolute -top-3 -right-1.5 text-[13px]" style={{ lineHeight: 1 }}>💬</span>
      )}
      {typeof document !== "undefined" && tooltip && createPortal(tooltip, document.body)}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={SECTION_DIVIDER}>
      <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#5A6A82" }}>
        {children}
      </h3>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-semibold mb-1" style={{ color: "#5A6A82" }}>
      {children}
      {required && <span className="ml-0.5" style={{ color: "#c62828" }}>*</span>}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder = "",
  disabled = false,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);
  const style: React.CSSProperties = {
    ...INPUT_BASE,
    ...(disabled ? INPUT_DISABLED : {}),
    ...(error ? INPUT_ERROR : {}),
    ...(focused && !disabled ? INPUT_FOCUS : {}),
  };

  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        style={style}
      />
      {error && (
        <p className="text-[11px] mt-0.5" style={{ color: "#c62828" }}>{error}</p>
      )}
    </div>
  );
}

function StringListEditor({
  label,
  items,
  onChange,
  placeholder,
  disabled,
  required,
  error,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}) {
  const add    = () => onChange([...items, ""]);
  const remove = (i: number) =>
    onChange(items.length > 1 ? items.filter((_, idx) => idx !== i) : [""]);
  const update = (i: number, v: string) =>
    onChange(items.map((x, idx) => (idx === i ? v : x)));

  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <FocusableInput
              value={item}
              onChange={(v) => update(i, v)}
              placeholder={placeholder}
              disabled={disabled}
              hasError={!!error}
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold transition-colors"
                style={{ color: "#B8C4D6", background: "transparent" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#c62828"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#B8C4D6"; }}
                title="Eliminar"
                aria-label="Eliminar ítem"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {error && (
        <p className="text-[11px] mt-1" style={{ color: "#c62828" }}>{error}</p>
      )}
      {!disabled && (
        <button
          type="button"
          onClick={add}
          className="mt-1.5 text-[11px] font-semibold transition-colors"
          style={{ color: "#002753" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.textDecoration = "underline"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.textDecoration = "none"; }}
        >
          + Agregar
        </button>
      )}
    </div>
  );
}

function FocusableInput({
  value,
  onChange,
  placeholder,
  disabled,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const style: React.CSSProperties = {
    ...INPUT_BASE,
    ...(disabled ? INPUT_DISABLED : {}),
    ...(hasError ? INPUT_ERROR : {}),
    ...(focused && !disabled ? INPUT_FOCUS : {}),
  };

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      disabled={disabled}
      style={{ ...style, flex: 1 }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  planId: string;
  initialMetadata: PlanMetadata | null;
  isFinalized: boolean;
  onSave: (data: SaveMetadataInput) => Promise<ActionResult>;
  onClearFeedback?: (planId: string, keys: string[]) => Promise<void>;
  proceedPath?: string;
  coordinatorFeedback?: SectionStates;
}

export function MetadataForm({ planId, initialMetadata, isFinalized, onSave, onClearFeedback, proceedPath, coordinatorFeedback }: Props) {
  const router = useRouter();
  const [form, setForm]     = useState<PlanMetadata>(() => mergeWithEmpty(initialMetadata));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [errors, setErrors]     = useState<ValidationErrors>({});
  const [isPending, startTransition] = useTransition();
  // Qué pautas están expandidas por principio (solo UI, no afecta los datos)
  const [expandedPautas, setExpandedPautas] = useState<Record<"p1" | "p2" | "p3", number[]>>({ p1: [], p2: [], p3: [] });

  // Local copy of coordinator feedback — cleared per-section when the teacher edits that field
  const [localFeedback, setLocalFeedback] = useState<SectionStates>(() => ({ ...(coordinatorFeedback ?? {}) }));
  // Track which keys were cleared in this session so we can persist the cleanup on save
  const clearedKeysRef = useRef<Set<string>>(new Set());

  const clearFeedback = useCallback((key: keyof SectionStates) => {
    setLocalFeedback((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev } as SectionStates;
      delete next[key];
      return next;
    });
    clearedKeysRef.current.add(String(key));
  }, []);

  const dirty = () => {
    setStatus("idle");
    setErrorMsg("");
  };

  const set = <K extends keyof PlanMetadata>(key: K, value: PlanMetadata[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    dirty();
  };

  const setAporte = (i: number, field: keyof AporteMultimodal, value: string) => {
    const feedbackKey = field === "dim" ? "aportes_dim" : field === "aporte" ? "aportes_nivel" : "aportes_como";
    setForm((prev) => {
      const aportes = [...prev.aportes];
      aportes[i] = { ...aportes[i], [field]: value };
      return { ...prev, aportes };
    });
    clearFeedback(feedbackKey as keyof SectionStates);
    dirty();
  };

  function buildPayload(): SaveMetadataInput {
    return {
      planificationId: planId,
      metadata: {
        ...form,
        objetivos: form.objetivos.filter(Boolean),
        criterios: form.criterios.filter(Boolean),
        aportes:   form.aportes.filter((a) => a.dim || a.aporte || a.como),
      },
    };
  }

  const persistClearedFeedback = async () => {
    const keys = Array.from(clearedKeysRef.current);
    if (onClearFeedback && keys.length > 0) {
      await onClearFeedback(planId, keys);
      clearedKeysRef.current.clear();
    }
  };

  const handleSave = () => {
    setStatus("saving");
    startTransition(async () => {
      const result = await onSave(buildPayload());
      if (result.success) {
        setStatus("saved");
        await persistClearedFeedback();
      } else {
        setStatus("error");
        setErrorMsg(result.error ?? "Error desconocido");
      }
    });
  };

  const handleSaveAndProceed = () => {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStatus("saving");
    startTransition(async () => {
      const result = await onSave(buildPayload());
      if (result.success) {
        setStatus("saved");
        await persistClearedFeedback();
        if (proceedPath) router.push(proceedPath);
      } else {
        setStatus("error");
        setErrorMsg(result.error ?? "Error desconocido");
      }
    });
  };

  const disabled  = isFinalized || isPending;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div
      className="mb-6 overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(224,230,240,0.80)",
        borderRadius: "1rem",
        boxShadow: "0 2px 16px rgba(0,39,83,0.05), inset 0 1px 0 rgba(255,255,255,0.90)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-3.5"
        style={{
          background: "linear-gradient(135deg, rgba(0,39,83,0.06) 0%, rgba(42,74,138,0.04) 100%)",
          borderBottom: "1px solid rgba(0,39,83,0.07)",
        }}
      >
        <h2 className="text-sm font-bold" style={{ color: "#002753" }}>
          Datos de la Unidad Microcurricular
        </h2>
        {!isFinalized && proceedPath && (
          <p className="text-[11px] mt-0.5" style={{ color: "#5A6A82" }}>
            Los campos marcados con <span className="font-bold" style={{ color: "#c62828" }}>*</span> son obligatorios para continuar.
          </p>
        )}
      </div>

      {/* Body */}
      <div className="p-5 space-y-6">

        {/* ── Identificación ──────────────────────────────────────────── */}
        <section>
          <SectionTitle>Identificación</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <FieldLabel required={!!proceedPath}>Área de Estudio</FieldLabel>
              <FeedbackHighlight state={localFeedback["meta_area"]}>
                <TextInput
                  value={form.areaEstudio}
                  onChange={(v) => { set("areaEstudio", v); clearFeedback("meta_area"); }}
                  placeholder="Ej: Ciencias Naturales"
                  disabled={disabled}
                  error={errors.areaEstudio}
                />
              </FeedbackHighlight>
            </div>
            <div>
              <FieldLabel required={!!proceedPath}>N° de Unidad</FieldLabel>
              <FeedbackHighlight state={localFeedback["meta_unidad"]}>
                <TextInput
                  value={form.numUnidad}
                  onChange={(v) => { set("numUnidad", v); clearFeedback("meta_unidad"); }}
                  placeholder="Ej: 1"
                  disabled={disabled}
                  error={errors.numUnidad}
                />
              </FeedbackHighlight>
            </div>
            <div>
              <FieldLabel required={!!proceedPath}>Título de la Unidad</FieldLabel>
              <FeedbackHighlight state={localFeedback["meta_unidad"]}>
                <TextInput
                  value={form.titulo}
                  onChange={(v) => { set("titulo", v); clearFeedback("meta_unidad"); }}
                  placeholder="Título de la unidad microcurricular"
                  disabled={disabled}
                  error={errors.titulo}
                />
              </FeedbackHighlight>
            </div>
          </div>
        </section>

        {/* ── Objetivos y Criterios ───────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FeedbackHighlight state={localFeedback["meta_objetivos"]}>
              <StringListEditor
                label="Objetivos de la Unidad"
                items={form.objetivos}
                onChange={(v) => { set("objetivos", v); clearFeedback("meta_objetivos"); }}
                placeholder="Escribir objetivo..."
                disabled={disabled}
                required={!!proceedPath}
                error={errors.objetivos}
              />
            </FeedbackHighlight>
            <FeedbackHighlight state={localFeedback["meta_criterios"]}>
              <StringListEditor
                label="Criterios de Evaluación"
                items={form.criterios}
                onChange={(v) => { set("criterios", v); clearFeedback("meta_criterios"); }}
                placeholder="Escribir criterio..."
                disabled={disabled}
                required={!!proceedPath}
                error={errors.criterios}
              />
            </FeedbackHighlight>
          </div>
        </section>

        {/* ── Planificación temporal ──────────────────────────────────── */}
        <section>
          <SectionTitle>Planificación temporal</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <FieldLabel required={!!proceedPath}>N° de Periodos</FieldLabel>
              <FeedbackHighlight state={localFeedback["plan_periodos"]}>
                <TextInput
                  value={form.nPeriodos}
                  onChange={(v) => { set("nPeriodos", v); clearFeedback("plan_periodos"); }}
                  placeholder="Ej: 12"
                  disabled={disabled}
                  error={errors.nPeriodos}
                />
              </FeedbackHighlight>
            </div>
            <div>
              <FieldLabel required={!!proceedPath}>Fecha de inicio</FieldLabel>
              <FeedbackHighlight state={localFeedback["plan_periodos"]}>
                <DatePickerInput
                  value={form.fechInicio}
                  onChange={(v) => { set("fechInicio", v); clearFeedback("plan_periodos"); }}
                  disabled={disabled}
                  error={errors.fechInicio}
                />
              </FeedbackHighlight>
            </div>
            <div>
              <FieldLabel required={!!proceedPath}>Fecha de finalización</FieldLabel>
              <FeedbackHighlight state={localFeedback["plan_periodos"]}>
                <DatePickerInput
                  value={form.fechFin}
                  onChange={(v) => { set("fechFin", v); clearFeedback("plan_periodos"); }}
                  disabled={disabled}
                  error={errors.fechFin}
                />
              </FeedbackHighlight>
            </div>
            <div>
              <FieldLabel required={!!proceedPath}>Ejes Transversales</FieldLabel>
              <FeedbackHighlight state={localFeedback["plan_ejes"]}>
                <TextInput
                  value={form.ejesTransversales}
                  onChange={(v) => { set("ejesTransversales", v); clearFeedback("plan_ejes"); }}
                  placeholder="Ej: Educación Socioemocional"
                  disabled={disabled}
                  error={errors.ejesTransversales}
                />
              </FeedbackHighlight>
            </div>
          </div>
        </section>

        {/* ── Aportes Multimodales ────────────────────────────────────── */}
        <section>
          <SectionTitle>Aportes Multimodales a Desarrollar</SectionTitle>
          <div
            className="overflow-hidden"
            style={{
              border: "1px solid rgba(0,39,83,0.10)",
              borderRadius: "0.625rem",
            }}
          >
            {(() => {
              const APORTE_COLS = [
                { field: "dim"    as const, key: "aportes_dim"   as const, label: "Dimensión y Opción Transversal",         placeholder: "Dimensión..." },
                { field: "aporte" as const, key: "aportes_nivel" as const, label: "Aporte Multimodal del Nivel / Subnivel", placeholder: "Aporte..." },
                { field: "como"   as const, key: "aportes_como"  as const, label: "¿Cómo van a aprender?",                  placeholder: "¿Cómo?" },
              ];
              return (
                <>
                  <div
                    className="grid grid-cols-3 text-[11px] font-bold uppercase tracking-wide"
                    style={{ background: "rgba(0,39,83,0.05)", color: "#5A6A82" }}
                  >
                    {APORTE_COLS.map(({ key, label }) => (
                      <div key={key} className="px-3 py-2">
                        <FeedbackHighlight state={localFeedback[key]}>
                          <span>{label}</span>
                        </FeedbackHighlight>
                      </div>
                    ))}
                  </div>
                  {form.aportes.map((ap, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-3 gap-2 px-3 py-2"
                      style={{
                        background: i % 2 === 1 ? "rgba(0,39,83,0.025)" : "transparent",
                        borderTop: "1px solid rgba(0,39,83,0.06)",
                      }}
                    >
                      {APORTE_COLS.map(({ field, key, placeholder }) => (
                        <AporteCell
                          key={field}
                          value={ap[field]}
                          onChange={(v) => setAporte(i, field, v)}
                          placeholder={placeholder}
                          disabled={disabled}
                          feedbackState={localFeedback[key]}
                        />
                      ))}
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </section>

        {/* ── DUA Principios ──────────────────────────────────────────── */}
        <section>
          <SectionTitle>Diseño Universal del Aprendizaje — Pautas</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {DUA_PRINCIPIOS.map((p) => {
              const fieldKey  = p.key as "p1" | "p2" | "p3";
              const reviewKey = `dua_${p.key}` as "dua_p1" | "dua_p2" | "dua_p3";
              const selection: DuaSelection = (form[fieldKey] as DuaSelection | null) ?? [];
              const opened = expandedPautas[fieldKey];

              function toggleExpand(pautaNum: number) {
                setExpandedPautas((prev) => {
                  const cur = prev[fieldKey];
                  const isOpen = cur.includes(pautaNum);
                  return { ...prev, [fieldKey]: isOpen ? cur.filter((n) => n !== pautaNum) : [...cur, pautaNum] };
                });
              }

              function toggleSubPauta(pautaNum: number, subNum: number) {
                if (disabled) return;
                const current: DuaSelection = (form[fieldKey] as DuaSelection | null) ?? [];
                const existing = current.find((e) => e.pauta === pautaNum);
                let updated: DuaSelection;
                if (!existing) {
                  updated = [...current, { pauta: pautaNum, subPautas: [subNum] }];
                } else {
                  const newSubs = existing.subPautas.includes(subNum)
                    ? existing.subPautas.filter((n) => n !== subNum)
                    : [...existing.subPautas, subNum].sort((a, b) => a - b);
                  updated = newSubs.length === 0
                    ? current.filter((e) => e.pauta !== pautaNum)
                    : current.map((e) => e.pauta === pautaNum ? { ...e, subPautas: newSubs } : e);
                }
                set(fieldKey, updated.length > 0 ? updated : null);
                clearFeedback(reviewKey);
              }

              const totalSubs   = selection.reduce((acc, e) => acc + e.subPautas.length, 0);
              const activePautas = selection.filter((e) => e.subPautas.length > 0).length;

              return (
                <FeedbackHighlight key={p.key} state={localFeedback[reviewKey]}>
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-pum-text leading-tight">
                      {p.label}
                    </p>

                    {/* Pautas — cada una se expande/colapsa independientemente */}
                    <div className="flex flex-col gap-1.5">
                      {p.pautas.map((pauta) => {
                        const entry = selection.find((e) => e.pauta === pauta.num);
                        const hasSelection = (entry?.subPautas.length ?? 0) > 0;
                        const isExpanded   = opened.includes(pauta.num);

                        return (
                          <div key={pauta.num}>
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => toggleExpand(pauta.num)}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all select-none text-xs${disabled ? " opacity-60 cursor-not-allowed" : " cursor-pointer"}`}
                              style={{
                                background: hasSelection ? "rgba(0,39,83,0.10)" : isExpanded ? "rgba(0,39,83,0.05)" : "rgba(0,39,83,0.03)",
                                border:     `1.5px solid ${hasSelection ? "rgba(0,39,83,0.35)" : isExpanded ? "rgba(0,39,83,0.20)" : "rgba(0,39,83,0.10)"}`,
                                color:      hasSelection ? "#002753" : "#5A6A82",
                              }}
                            >
                              <span className={`flex-1 text-left leading-tight${hasSelection ? " font-semibold" : ""}`}>{pauta.label}</span>
                              {hasSelection && (
                                <span style={{ fontSize: "10px", background: "rgba(0,39,83,0.18)", borderRadius: "9999px", padding: "1px 6px", flexShrink: 0, color: "#002753" }}>
                                  {entry!.subPautas.length}
                                </span>
                              )}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="12" height="12" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round"
                                style={{ flexShrink: 0, transition: "transform 0.15s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>

                            {/* Sub-pautas expandibles */}
                            {isExpanded && (
                              <div
                                className="flex flex-col gap-1 mt-1 ml-3 pl-3"
                                style={{ borderLeft: "2px solid rgba(0,39,83,0.15)" }}
                              >
                                {pauta.subPautas.map((sp) => {
                                  const isChecked = entry?.subPautas.includes(sp.num) ?? false;
                                  return (
                                    <label
                                      key={sp.num}
                                      className={`flex items-start gap-1.5 py-0.5 cursor-pointer select-none text-[11px]${disabled ? " cursor-not-allowed opacity-60" : ""}`}
                                      style={{ color: isChecked ? "#002753" : "#5A6A82" }}
                                    >
                                      <input
                                        type="checkbox"
                                        className="mt-0.5 flex-shrink-0 accent-pum-primary"
                                        checked={isChecked}
                                        disabled={disabled}
                                        onChange={() => toggleSubPauta(pauta.num, sp.num)}
                                      />
                                      <span className={isChecked ? "font-medium" : ""}>
                                        P{p.num}:{pauta.num}.{sp.num} {sp.label}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Contador */}
                    {totalSubs > 0 && (
                      <p className="text-[10px] mt-0.5" style={{ color: "#5A6A82" }}>
                        {activePautas} pauta{activePautas !== 1 ? "s" : ""} — {totalSubs} sub-pauta{totalSubs !== 1 ? "s" : ""} seleccionada{totalSubs !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </FeedbackHighlight>
              );
            })}
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        {!isFinalized && (
          <div
            className="flex items-center justify-between pt-4"
            style={{ borderTop: "1px solid rgba(0,39,83,0.07)" }}
          >
            <div>
              {status === "error" && (
                <p className="text-xs" style={{ color: "#c62828" }}>{errorMsg}</p>
              )}
              {status === "saved" && !proceedPath && (
                <p className="text-xs" style={{ color: "#0d8a5e" }}>Datos guardados correctamente.</p>
              )}
              {hasErrors && (
                <p className="text-xs" style={{ color: "#c62828" }}>
                  Completa los campos requeridos antes de continuar.
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {proceedPath && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ color: "#5A6A82", textDecoration: "underline", textUnderlineOffset: "2px" }}
                >
                  Solo guardar
                </button>
              )}
              <button
                type="button"
                onClick={proceedPath ? handleSaveAndProceed : handleSave}
                disabled={isPending}
                className="px-4 py-1.5 text-white text-xs font-semibold rounded-full disabled:opacity-50 transition-all duration-150 cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #002753 0%, #003d7a 100%)",
                  boxShadow: "0 2px 8px rgba(0,39,83,0.25), inset 0 1px 0 rgba(255,255,255,0.12)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg, #001a3d 0%, #002753 100%)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 3px 12px rgba(0,39,83,0.30), inset 0 1px 0 rgba(255,255,255,0.12)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg, #002753 0%, #003d7a 100%)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(0,39,83,0.25), inset 0 1px 0 rgba(255,255,255,0.12)";
                }}
              >
                {isPending
                  ? "Guardando..."
                  : proceedPath
                  ? "Guardar y Continuar →"
                  : "Guardar datos de la unidad"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DatePickerInput ───────────────────────────────────────────────────────────

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DOW_ES    = ["L","M","X","J","V","S","D"];

function parseDMY(s: string): Date | null {
  if (!s) return null;
  const parts = s.split("/").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [d, m, y] = parts;
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

function formatDMY(d: Date): string {
  const dd   = String(d.getDate()).padStart(2, "0");
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function DatePickerInput({
  value,
  onChange,
  disabled = false,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  const selectedDate = parseDMY(value);
  const [open, setOpen]       = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => selectedDate ?? new Date());
  const anchorRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (portalRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const openCalendar = () => {
    if (disabled) return;
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setDropPos({
        top:   rect.bottom + window.scrollY + 4,
        left:  rect.left   + window.scrollX,
        width: rect.width,
      });
    }
    setViewDate(selectedDate ?? new Date());
    setOpen(true);
  };

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDow   = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells       = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const todayMs = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); })();

  const handleSelectDay = (day: number) => {
    onChange(formatDMY(new Date(year, month, day)));
    setOpen(false);
  };

  const inputStyle: React.CSSProperties = {
    ...INPUT_BASE,
    ...(disabled ? INPUT_DISABLED : {}),
    ...(error ? INPUT_ERROR : {}),
    cursor: disabled ? "not-allowed" : "pointer",
    paddingRight: "1.75rem",
    userSelect: "none",
  };

  const calendar = open && dropPos && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={portalRef}
          style={{
            position:     "absolute",
            top:          dropPos.top,
            left:         dropPos.left,
            width:        Math.max(dropPos.width, 224),
            background:   "#ffffff",
            border:       "1px solid rgba(0,39,83,0.14)",
            borderRadius: 12,
            boxShadow:    "0 8px 28px rgba(0,39,83,0.13), 0 2px 6px rgba(0,39,83,0.07)",
            zIndex:       9999,
            padding:      "10px 10px 12px",
          }}
        >
          {/* Month navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 8px", borderRadius: 6, fontSize: 15, color: "#002753", lineHeight: 1 }}
            >‹</button>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#002753" }}>
              {MONTHS_ES[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 8px", borderRadius: 6, fontSize: 15, color: "#002753", lineHeight: 1 }}
            >›</button>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {DOW_ES.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#8899AA" }}>{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const thisMs    = new Date(year, month, day).setHours(0,0,0,0);
              const isSelected = selectedDate ? thisMs === selectedDate.setHours(0,0,0,0) : false;
              const isToday    = thisMs === todayMs;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  style={{
                    background:  isSelected ? "#002753" : isToday ? "rgba(0,39,83,0.07)" : "transparent",
                    color:       isSelected ? "#ffffff"  : isToday ? "#002753"            : "#1a1c1e",
                    border:      isToday && !isSelected  ? "1px solid rgba(0,39,83,0.22)" : "1px solid transparent",
                    borderRadius: 6,
                    padding:     "4px 0",
                    fontSize:    11,
                    fontWeight:  isSelected || isToday ? 700 : 400,
                    cursor:      "pointer",
                    textAlign:   "center",
                    transition:  "background 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,39,83,0.10)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = isToday ? "rgba(0,39,83,0.07)" : "transparent";
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div>
      <div ref={anchorRef} style={{ position: "relative" }} onClick={openCalendar}>
        <input
          type="text"
          readOnly
          value={value}
          placeholder="DD/MM/AAAA"
          disabled={disabled}
          style={inputStyle}
        />
        {!disabled && (
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="#8899AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        )}
      </div>
      {error && <p className="text-[11px] mt-0.5" style={{ color: "#c62828" }}>{error}</p>}
      {calendar}
    </div>
  );
}

function AporteCell({
  value,
  onChange,
  placeholder,
  disabled,
  feedbackState,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  feedbackState?: SectionState;
}) {
  const [focused, setFocused] = useState(false);
  const hasComment = !!feedbackState?.comment?.trim();
  const isApproved = !!(feedbackState?.approved && !hasComment);
  const style: React.CSSProperties = {
    ...INPUT_BASE,
    ...(disabled ? INPUT_DISABLED : {}),
    ...(focused && !disabled ? INPUT_FOCUS : {}),
    ...(hasComment ? { border: "1px solid #f97316" } : {}),
    ...(isApproved ? { border: "1px solid #22c55e" } : {}),
  };

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      disabled={disabled}
      style={style}
    />
  );
}
