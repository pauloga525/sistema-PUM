"use client";

import { useActionState, useState } from "react";
import {
  createAcademicYearAction,
  createPeriodAction,
  deletePeriodAction,
  setActiveYearAction,
  type CatalogActionState,
} from "@/app/(admin)/admin/catalog/actions";
import type { YearData } from "./CatalogClient";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Sub-componente: fila de año ───────────────────────────────────────────────

function YearRow({ year }: { year: YearData }) {
  const [expanded, setExpanded] = useState(false);
  const [showPeriodForm, setShowPeriodForm] = useState(false);

  const [stateActivate, activateAction, pendingActivate] = useActionState<CatalogActionState, FormData>(
    setActiveYearAction, null
  );
  const [statePeriod, periodAction, pendingPeriod] = useActionState<CatalogActionState, FormData>(
    createPeriodAction, null
  );
  const [stateDeleteP, deletePAction] = useActionState<CatalogActionState, FormData>(
    deletePeriodAction, null
  );

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid rgba(0,39,83,0.10)", marginBottom: "0.5rem" }}
    >
      {/* ── Encabezado del año ── */}
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none"
        style={{ background: year.active ? "rgba(252,204,56,0.12)" : "rgba(255,255,255,0.80)" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <svg
            width="14" height="14"
            viewBox="0 0 24 24"
            fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round"
            className="text-pum-text-muted transition-transform"
            style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
          <span className="text-sm font-semibold text-pum-text">{year.label}</span>
          {year.active && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "#fccc38", color: "#6f5600" }}
            >
              Activo
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-pum-text-muted hidden sm:block">
            {formatDate(year.startDate)} – {formatDate(year.endDate)}
          </span>
          <span className="text-xs text-pum-text-disabled">
            {year.periods.length} {year.periods.length === 1 ? "periodo" : "periodos"}
          </span>
          {!year.active && (
            <form action={activateAction} onClick={(e) => e.stopPropagation()}>
              <input type="hidden" name="id" value={year.id} />
              <button
                type="submit"
                disabled={!!pendingActivate}
                className="text-[11px] px-3 py-1 rounded-lg font-medium cursor-pointer disabled:opacity-60"
                style={{ background: "rgba(0,39,83,0.08)", color: "#002753" }}
              >
                {pendingActivate ? "…" : "Activar"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Contenido expandido ── */}
      {expanded && (
        <div className="px-5 pb-4" style={{ background: "rgba(255,255,255,0.60)" }}>

          {/* Periodos existentes */}
          {year.periods.length === 0 ? (
            <p className="text-xs text-pum-text-disabled py-3">Sin periodos aún.</p>
          ) : (
            <div className="flex flex-col gap-1.5 pt-3 mb-3">
              {year.periods.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-4 py-2.5 rounded-lg"
                  style={{ background: "rgba(0,39,83,0.04)", border: "1px solid rgba(0,39,83,0.07)" }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "#002753", color: "#fccc38" }}
                    >
                      {p.number}
                    </span>
                    <span className="text-sm font-medium text-pum-text">{p.name}</span>
                    <span className="text-xs text-pum-text-muted hidden sm:block">
                      {formatDate(p.startDate)} – {formatDate(p.endDate)}
                    </span>
                  </div>
                  <form action={deletePAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      className="text-[11px] text-pum-error hover:opacity-70 cursor-pointer px-2 py-1 rounded"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}

          {stateDeleteP?.error && (
            <p className="text-xs text-pum-error mb-2">{stateDeleteP.error}</p>
          )}

          {/* Botón / formulario nuevo periodo */}
          {!showPeriodForm ? (
            <button
              type="button"
              onClick={() => setShowPeriodForm(true)}
              className="text-xs text-pum-primary font-medium hover:underline cursor-pointer mt-1"
            >
              + Agregar periodo
            </button>
          ) : (
            <form action={periodAction} className="flex flex-col gap-2 mt-2">
              <input type="hidden" name="academicYearId" value={year.id} />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-pum-text-muted block mb-1">
                    Nombre del periodo
                  </label>
                  <input
                    name="name"
                    placeholder="Quimestre 1"
                    required
                    className="pum-glass-input w-full px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-pum-text-muted block mb-1">
                    Número
                  </label>
                  <input
                    name="number"
                    type="number"
                    min={1}
                    max={10}
                    placeholder="1"
                    required
                    className="pum-glass-input w-full px-3 py-2 text-sm"
                    defaultValue={year.periods.length + 1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-pum-text-muted block mb-1">
                    Fecha de inicio
                  </label>
                  <input name="startDate" type="date" className="pum-glass-input w-full px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-pum-text-muted block mb-1">
                    Fecha de fin
                  </label>
                  <input name="endDate" type="date" className="pum-glass-input w-full px-3 py-2 text-sm" />
                </div>
              </div>

              {statePeriod?.error && (
                <p className="text-xs text-pum-error">{statePeriod.error}</p>
              )}

              <div className="flex gap-2 mt-1">
                <button
                  type="submit"
                  disabled={!!pendingPeriod}
                  className="pum-navy-btn px-4 py-1.5 text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-60"
                >
                  {pendingPeriod ? "Guardando…" : "Guardar periodo"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPeriodForm(false)}
                  className="px-4 py-1.5 text-xs rounded-lg cursor-pointer"
                  style={{ background: "rgba(0,39,83,0.06)", color: "#002753" }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export function AcademicYearManager({ years }: { years: YearData[] }) {
  const [showYearForm, setShowYearForm] = useState(false);
  const [stateYear, yearAction, pendingYear] = useActionState<CatalogActionState, FormData>(
    createAcademicYearAction, null
  );

  return (
    <div className="flex flex-col gap-4">

      {/* ── Lista de años ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(195,198,210,0.70)",
          boxShadow: "0 2px 12px rgba(0,39,83,0.05)",
        }}
      >
        {/* Header de la tarjeta */}
        <div
          className="px-5 py-4 flex items-center justify-between border-b border-pum-border/50"
          style={{ background: "rgba(0,39,83,0.03)" }}
        >
          <div>
            <h2 className="text-sm font-semibold text-pum-text">Años lectivos</h2>
            <p className="text-xs text-pum-text-muted mt-0.5">
              Cada año tiene periodos con fechas de inicio y fin.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowYearForm((v) => !v)}
            className="pum-navy-btn px-4 py-2 text-white text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo año
          </button>
        </div>

        {/* Formulario nuevo año */}
        {showYearForm && (
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(0,39,83,0.06)", background: "rgba(252,204,56,0.05)" }}>
            <form action={yearAction} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-pum-text-muted block mb-1">
                    Etiqueta
                  </label>
                  <input
                    name="label"
                    placeholder="2026-2027"
                    required
                    className="pum-glass-input w-full px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-pum-text-muted block mb-1">
                    Año de inicio
                  </label>
                  <input
                    name="yearStart"
                    type="number"
                    min={2020}
                    max={2100}
                    placeholder="2026"
                    required
                    className="pum-glass-input w-full px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-pum-text-muted block mb-1">
                    Fecha de inicio
                  </label>
                  <input name="startDate" type="date" className="pum-glass-input w-full px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-pum-text-muted block mb-1">
                    Fecha de fin
                  </label>
                  <input name="endDate" type="date" className="pum-glass-input w-full px-3 py-2 text-sm" />
                </div>
              </div>

              {stateYear?.error && (
                <p className="text-xs text-pum-error">{stateYear.error}</p>
              )}
              {stateYear?.ok && (
                <p className="text-xs text-green-700">Año lectivo creado correctamente.</p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!!pendingYear}
                  className="pum-navy-btn px-5 py-2 text-white text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-60"
                >
                  {pendingYear ? "Guardando…" : "Crear año lectivo"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowYearForm(false)}
                  className="px-4 py-2 text-xs rounded-xl cursor-pointer"
                  style={{ background: "rgba(0,39,83,0.06)", color: "#002753" }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista */}
        <div className="p-4">
          {years.length === 0 ? (
            <p className="text-sm text-center text-pum-text-muted py-6">
              No hay años lectivos registrados. Crea uno para comenzar.
            </p>
          ) : (
            years.map((y) => <YearRow key={y.id} year={y} />)
          )}
        </div>
      </div>
    </div>
  );
}
