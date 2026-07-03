"use client";

import { useState, useMemo } from "react";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface AssignmentData {
  id:      string;
  teacher: { id: string; name: string | null; email: string };
  subject: { id: string; name: string; code: string };
  level:   { id: string; name: string; code: string; orderIndex: number; track: string };
  period:  { id: string; name: string; number: number } | null;
}

interface Props {
  assignments: AssignmentData[];
  yearLabel:   string;
}

// ── Grupo de asignaciones por docente ─────────────────────────────────────────

function TeacherGroup({
  teacherName,
  teacherEmail,
  assignments,
}: {
  teacherName:  string;
  teacherEmail: string;
  assignments:  AssignmentData[];
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <>
      <tr
        className="cursor-pointer select-none"
        style={{ background: "rgba(0,39,83,0.04)", borderBottom: "1px solid rgba(0,39,83,0.08)" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <td colSpan={4} className="px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              width="12" height="12"
              viewBox="0 0 24 24"
              fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round"
              className="text-pum-text-muted transition-transform flex-shrink-0"
              style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            <span className="text-sm font-semibold text-pum-text">{teacherName}</span>
            {teacherName !== teacherEmail && (
              <span className="text-xs text-pum-text-muted">{teacherEmail}</span>
            )}
            <span
              className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,39,83,0.10)", color: "#002753" }}
            >
              {assignments.length} {assignments.length === 1 ? "asignación" : "asignaciones"}
            </span>
          </div>
        </td>
      </tr>

      {expanded && assignments.map((a) => (
        <tr key={a.id} style={{ borderBottom: "1px solid rgba(0,39,83,0.04)" }}>
          {/* Materia */}
          <td className="px-4 py-2.5">
            <p className="text-sm text-pum-text">{a.subject.name}</p>
            <code
              className="text-[10px] font-mono px-1.5 py-0.5 rounded mt-0.5 inline-block"
              style={{ background: "rgba(0,39,83,0.07)", color: "#002753" }}
            >
              {a.subject.code}
            </code>
          </td>

          {/* Nivel */}
          <td className="px-4 py-2.5 text-sm text-pum-text">{a.level.name}</td>

          {/* Periodo */}
          <td className="px-4 py-2.5">
            {a.period ? (
              <span
                className="text-xs px-2 py-0.5 rounded-lg"
                style={{ background: "rgba(252,204,56,0.25)", color: "#6f5600" }}
              >
                {a.period.name}
              </span>
            ) : (
              <span className="text-xs text-pum-text-disabled">Todos</span>
            )}
          </td>

          {/* Ciclo */}
          <td className="px-4 py-2.5">
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={
                a.level.track === "BACHILLERATO"
                  ? { background: "rgba(168,200,255,0.35)", color: "#002753" }
                  : { background: "rgba(0,170,130,0.12)", color: "#0d6b50" }
              }
            >
              {a.level.track === "BACHILLERATO" ? "BGU" : "Básica"}
            </span>
          </td>
        </tr>
      ))}
    </>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export function AssignmentsClient({ assignments, yearLabel }: Props) {
  const [search,      setSearch]      = useState("");
  const [filterLevel, setFilterLevel] = useState("");

  // Niveles únicos derivados de las asignaciones
  const levels = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const a of assignments) {
      if (!map.has(a.level.id)) map.set(a.level.id, { id: a.level.id, name: a.level.name });
    }
    return Array.from(map.values());
  }, [assignments]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return assignments.filter((a) => {
      const teacherName = (a.teacher.name ?? a.teacher.email).toLowerCase();
      const matchSearch = !q || (
        teacherName.includes(q) ||
        a.subject.name.toLowerCase().includes(q) ||
        a.level.name.toLowerCase().includes(q)
      );
      const matchLevel = !filterLevel || a.level.id === filterLevel;
      return matchSearch && matchLevel;
    });
  }, [assignments, search, filterLevel]);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; email: string; assignments: AssignmentData[] }>();
    for (const a of filtered) {
      const existing = map.get(a.teacher.id);
      if (existing) {
        existing.assignments.push(a);
      } else {
        map.set(a.teacher.id, {
          name:        a.teacher.name ?? a.teacher.email,
          email:       a.teacher.email,
          assignments: [a],
        });
      }
    }
    return Array.from(map.entries());
  }, [filtered]);

  const INPUT: React.CSSProperties = {
    background:   "rgba(243,244,245,0.90)",
    border:       "1px solid rgba(0,39,83,0.14)",
    borderRadius: "0.625rem",
    color:        "#191c1d",
  };

  return (
    <div
      className="rounded-2xl overflow-hidden flex-1"
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(195,198,210,0.70)",
        boxShadow: "0 2px 12px rgba(0,39,83,0.05), inset 0 1px 0 rgba(255,255,255,0.90)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 border-b border-pum-border/50"
        style={{ background: "rgba(0,39,83,0.03)" }}
      >
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-pum-text">{yearLabel}</h2>
          <p className="text-xs text-pum-text-disabled">
            {assignments.length} asignación{assignments.length !== 1 ? "es" : ""} activa{assignments.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar docente, materia, nivel…"
            style={INPUT}
            className="px-3 py-1.5 text-sm outline-none w-52"
          />
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            style={INPUT}
            className="px-3 py-1.5 text-sm outline-none"
          >
            <option value="">Todos los niveles</option>
            {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          {(search || filterLevel) && (
            <button
              type="button"
              onClick={() => { setSearch(""); setFilterLevel(""); }}
              className="text-xs text-pum-text-muted hover:text-pum-text cursor-pointer px-2 py-1.5 rounded-lg"
              style={{ background: "rgba(0,39,83,0.06)" }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      {assignments.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-sm font-medium text-pum-text mb-1">Sin asignaciones para {yearLabel}</p>
          <p className="text-xs text-pum-text-muted">
            Los coordinadores crean las asignaciones desde su panel de docentes.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-pum-text-muted">No hay resultados con los filtros actuales.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,39,83,0.08)" }}>
                {["Materia", "Nivel", "Periodo", "Ciclo"].map((col, i) => (
                  <th
                    key={i}
                    className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pum-text-muted"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map(([teacherId, group]) => (
                <TeacherGroup
                  key={teacherId}
                  teacherName={group.name}
                  teacherEmail={group.email}
                  assignments={group.assignments}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
