"use client";

import { useMemo, useState } from "react";
import { ROUTES } from "@/constants/routes";
import { DownloadZipButton } from "./DownloadZipButton";

export interface ExportPlanRow {
  id: string;
  status: string;
  teacherName: string | null;
  teacherEmail: string;
  subjectId: string;
  subjectName: string;
  levelId: string;
  levelName: string;
  levelCode: string;
}

interface Props {
  plans: ExportPlanRow[];
  periodName: string;
  yearLabel: string;
}

// Statuses that get included in the ZIP (teacher submitted the plan)
const ZIP_STATUSES = new Set(["FINALIZED", "FEEDBACK_RECEIVED", "APPROVED", "PENDING_SIGNATURE", "SIGNED", "ADMIN_REJECTED"]);

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:              { label: "Borrador",       bg: "#edeeef", color: "#434750" },
  FINALIZED:          { label: "Finalizado",     bg: "#e0f5ee", color: "#0d8a5e" },
  FEEDBACK_RECEIVED:  { label: "Con obs.",       bg: "#fff7ed", color: "#b45309" },
  APPROVED:           { label: "Aprobado",       bg: "#f0fdf4", color: "#166534" },
  PENDING_SIGNATURE:  { label: "Pend. firma",    bg: "#dce8ff", color: "#002753" },
  SIGNED:             { label: "Firmado",        bg: "#ccfbf1", color: "#0f766e" },
  ADMIN_REJECTED:     { label: "Rechazado",      bg: "#ffdad6", color: "#ba1a1a" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? { label: status, bg: "#edeeef", color: "#434750" };
  return (
    <span
      className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

export function ExportZipClient({ plans, periodName, yearLabel }: Props) {
  const [searchTeacher, setSearchTeacher]     = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedLevel, setSelectedLevel]     = useState("");

  // Derive unique subjects + levels from plans for filter dropdowns
  const subjects = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of plans) map.set(p.subjectId, p.subjectName);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [plans]);

  const levels = useMemo(() => {
    const map = new Map<string, { name: string; code: string }>();
    for (const p of plans) map.set(p.levelId, { name: p.levelName, code: p.levelCode });
    return [...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [plans]);

  // Apply filters
  const filtered = useMemo(() => {
    const q = searchTeacher.toLowerCase().trim();
    return plans.filter((p) => {
      if (selectedSubject && p.subjectId !== selectedSubject) return false;
      if (selectedLevel   && p.levelId   !== selectedLevel)   return false;
      if (q) {
        const haystack = `${p.teacherName ?? ""} ${p.teacherEmail}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [plans, searchTeacher, selectedSubject, selectedLevel]);

  // Plans to include in ZIP (non-DRAFT from filtered set)
  const includedPlans = useMemo(() => filtered.filter((p) => ZIP_STATUSES.has(p.status)), [filtered]);
  const draftCount    = filtered.length - includedPlans.length;

  const zipHref = includedPlans.length > 0
    ? `${ROUTES.API.EXPORT_ZIP}?planIds=${includedPlans.map((p) => p.id).join(",")}`
    : "";

  const hasFilters = !!(searchTeacher || selectedSubject || selectedLevel);

  return (
    <div className="flex flex-col gap-5">

      {/* ── Filtros ── */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(195,198,210,0.70)",
          boxShadow: "0 2px 12px rgba(0,39,83,0.05)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-pum-text">Filtros de exportación</p>
          {hasFilters && (
            <button
              onClick={() => { setSearchTeacher(""); setSelectedSubject(""); setSelectedLevel(""); }}
              className="text-xs font-medium text-pum-primary hover:underline underline-offset-2"
            >
              Limpiar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Buscar docente */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-pum-text-muted uppercase tracking-wide">
              Buscar docente
            </label>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="#737781" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchTeacher}
                onChange={(e) => setSearchTeacher(e.target.value)}
                placeholder="Nombre o correo…"
                className="w-full text-sm pl-8 pr-3 py-2 rounded-xl outline-none transition-colors"
                style={{
                  border: "1.5px solid rgba(0,39,83,0.15)",
                  background: "rgba(0,39,83,0.02)",
                  color: "#002753",
                }}
              />
            </div>
          </div>

          {/* Materia */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-pum-text-muted uppercase tracking-wide">
              Materia
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-xl outline-none transition-colors appearance-none cursor-pointer"
              style={{
                border: "1.5px solid rgba(0,39,83,0.15)",
                background: "rgba(0,39,83,0.02)",
                color: selectedSubject ? "#002753" : "#737781",
              }}
            >
              <option value="">Todas las materias</option>
              {subjects.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>

          {/* Nivel */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-pum-text-muted uppercase tracking-wide">
              Nivel
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-xl outline-none transition-colors appearance-none cursor-pointer"
              style={{
                border: "1.5px solid rgba(0,39,83,0.15)",
                background: "rgba(0,39,83,0.02)",
                color: selectedLevel ? "#002753" : "#737781",
              }}
            >
              <option value="">Todos los niveles</option>
              {levels.map(([id, { name, code }]) => (
                <option key={id} value={id}>{name} ({code})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Incluidas en ZIP */}
        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(195,198,210,0.70)",
            boxShadow: "0 2px 12px rgba(0,39,83,0.05)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{ background: "rgba(13,138,94,0.12)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d8a5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p className="text-3xl font-bold text-pum-text leading-none">{includedPlans.length}</p>
            <p className="text-xs text-pum-text-muted mt-1">Incluidas en ZIP</p>
            {hasFilters && (
              <p className="text-[10px] text-pum-text-disabled mt-0.5">de {plans.filter(p => ZIP_STATUSES.has(p.status)).length} total</p>
            )}
          </div>
        </div>

        {/* Borradores */}
        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(195,198,210,0.70)",
            boxShadow: "0 2px 12px rgba(0,39,83,0.05)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{ background: "rgba(0,39,83,0.07)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#737781" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <p className="text-3xl font-bold text-pum-text leading-none">{draftCount}</p>
            <p className="text-xs text-pum-text-muted mt-1">Borradores (no incluidos)</p>
          </div>
        </div>

        {/* Total */}
        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(195,198,210,0.70)",
            boxShadow: "0 2px 12px rgba(0,39,83,0.05)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{ background: "rgba(168,200,255,0.30)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#335f9d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div>
            <p className="text-3xl font-bold text-pum-text leading-none">{filtered.length}</p>
            <p className="text-xs text-pum-text-muted mt-1">Total planificaciones</p>
            {hasFilters && (
              <p className="text-[10px] text-pum-text-disabled mt-0.5">de {plans.length} total</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Download card ── */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(195,198,210,0.70)",
          boxShadow: "0 2px 12px rgba(0,39,83,0.05), inset 0 1px 0 rgba(255,255,255,0.90)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-pum-text mb-1">
              Exportar {periodName} — {yearLabel}
              {hasFilters && <span className="text-pum-text-muted font-normal"> (filtrado)</span>}
            </p>
            <p className="text-xs text-pum-text-muted">
              El ZIP incluirá{" "}
              <span className="font-medium text-pum-text">{includedPlans.length}</span>{" "}
              {includedPlans.length === 1 ? "planificación enviada" : "planificaciones enviadas"}.
              {draftCount > 0 && (
                <> {draftCount} {draftCount === 1 ? "borrador no incluido" : "borradores no incluidos"}.</>
              )}
            </p>
            {includedPlans.length > 0 && (
              <p className="text-xs text-pum-text-disabled mt-1.5">
                La generación puede tardar unos segundos dependiendo del número de archivos.
              </p>
            )}
          </div>
          <DownloadZipButton
            href={zipHref}
            count={includedPlans.length}
            disabled={includedPlans.length === 0}
          />
        </div>
      </div>

      {/* ── Plan list ── */}
      {filtered.length > 0 ? (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(195,198,210,0.70)",
            boxShadow: "0 2px 12px rgba(0,39,83,0.05), inset 0 1px 0 rgba(255,255,255,0.90)",
          }}
        >
          <div
            className="px-5 py-3.5 border-b border-pum-border/50 flex items-center justify-between"
            style={{ background: "rgba(0,39,83,0.03)" }}
          >
            <h2 className="text-sm font-semibold text-pum-text">
              Detalle — {periodName}
            </h2>
            <span className="text-xs text-pum-text-muted">
              {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,39,83,0.08)" }}>
                  {["Docente", "Materia", "Nivel", "Estado"].map((col) => (
                    <th
                      key={col}
                      className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pum-text-muted"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((plan, i) => (
                  <tr
                    key={plan.id}
                    style={{
                      background: i % 2 !== 0 ? "rgba(0,39,83,0.015)" : "transparent",
                      borderBottom: "1px solid rgba(0,39,83,0.04)",
                    }}
                  >
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-pum-text">
                        {plan.teacherName ?? plan.teacherEmail}
                      </p>
                      {plan.teacherName && (
                        <p className="text-[11px] text-pum-text-disabled">{plan.teacherEmail}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-pum-text">{plan.subjectName}</td>
                    <td className="px-5 py-3 text-sm text-pum-text">
                      {plan.levelName}
                      <span className="text-pum-text-muted text-xs ml-1">({plan.levelCode})</span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={plan.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl px-6 py-10 text-center"
          style={{
            background: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(195,198,210,0.70)",
          }}
        >
          <p className="text-sm text-pum-text-muted">
            {plans.length === 0
              ? "No hay planificaciones para este trimestre."
              : "Ninguna planificación coincide con los filtros aplicados."}
          </p>
        </div>
      )}
    </div>
  );
}
