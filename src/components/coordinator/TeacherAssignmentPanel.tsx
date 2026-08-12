"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  createTeacherAssignmentAction,
  removeTeacherAssignmentAction,
  setPrimaryEditorAction,
  type TeacherAssignmentActionState,
} from "@/app/(coordinator)/coordinator/docentes/actions";
import type { AssignedTeacher } from "@/modules/coordinator/coordinator.types";

// ── Tipos del catálogo ────────────────────────────────────────────────────────

export interface CatalogData {
  years:    { id: string; label: string; active: boolean }[];
  subjects: { id: string; name: string; code: string }[];
  levels:   { id: string; name: string; code: string; track: string }[];
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  background:   "rgba(243,244,245,0.90)",
  border:       "1px solid rgba(0,39,83,0.14)",
  borderRadius: "0.625rem",
  color:        "#191c1d",
  width:        "100%",
};

// ── Modal: agregar asignación ─────────────────────────────────────────────────

function AddAssignmentModal({
  teacher,
  catalog,
  onClose,
}: {
  teacher: AssignedTeacher;
  catalog: CatalogData;
  onClose: () => void;
}) {
  const activeYear = catalog.years.find((y) => y.active) ?? catalog.years[0];
  const [yearId,    setYearId]    = useState(activeYear?.id ?? "");
  const [subjectId, setSubjectId] = useState("");
  const [levelId,   setLevelId]   = useState("");
  const [formKey,   setFormKey]   = useState(0);

  const [state, formAction, isPending] = useActionState<TeacherAssignmentActionState, FormData>(
    createTeacherAssignmentAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      onClose();
      setFormKey((k) => k + 1);
    }
  }, [state]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{
          background: "rgba(255,255,255,0.97)",
          border:     "1px solid rgba(195,198,210,0.80)",
          boxShadow:  "0 16px 48px rgba(0,39,83,0.18)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-pum-text">Nueva asignación</h3>
            <p className="text-xs text-pum-text-muted mt-0.5">{teacher.name ?? teacher.email}</p>
          </div>
          <button type="button" onClick={onClose} className="text-pum-text-disabled hover:text-pum-text cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form key={formKey} action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="teacherId" value={teacher.id} />

          {/* Año lectivo */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-pum-text-muted">Año lectivo</label>
            <select
              name="academicYearId"
              value={yearId}
              onChange={(e) => setYearId(e.target.value)}
              required style={INPUT} className="px-3 py-2 text-sm outline-none"
            >
              <option value="">— Seleccionar año —</option>
              {catalog.years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}{y.active ? " (activo)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Materia */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-pum-text-muted">Materia</label>
            <select
              name="subjectId"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              required style={INPUT} className="px-3 py-2 text-sm outline-none"
            >
              <option value="">— Seleccionar materia —</option>
              {catalog.subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          {/* Nivel */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-pum-text-muted">Nivel</label>
            <select
              name="levelId"
              value={levelId}
              onChange={(e) => setLevelId(e.target.value)}
              required style={INPUT} className="px-3 py-2 text-sm outline-none"
            >
              <option value="">— Seleccionar nivel —</option>
              {catalog.levels.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Error */}
          {state && !state.ok && (
            <p className="text-xs font-medium rounded-lg px-3 py-2" style={{ background: "#ffdad6", color: "#ba1a1a" }}>
              {state.error}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-pum-text-muted hover:text-pum-text cursor-pointer px-3 py-1.5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !yearId || !subjectId || !levelId}
              className="pum-navy-btn text-sm font-semibold text-white px-5 py-2 rounded-xl cursor-pointer disabled:opacity-60"
            >
              {isPending ? "Guardando…" : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

// ── Tarjeta de un docente con sus asignaciones ────────────────────────────────

function TeacherCard({ teacher, catalog, isSelf }: { teacher: AssignedTeacher; catalog: CatalogData; isSelf: boolean }) {
  const [addOpen,    setAddOpen]   = useState(false);
  const [isPending,  start]        = useTransition();

  const handleRemove = (assignmentId: string) => {
    start(async () => {
      await removeTeacherAssignmentAction(assignmentId, teacher.id);
    });
  };

  const handleSetPrimary = (assignmentId: string) => {
    start(async () => {
      await setPrimaryEditorAction(assignmentId, teacher.id, true);
    });
  };

  const handleUnsetPrimary = (assignmentId: string) => {
    start(async () => {
      await setPrimaryEditorAction(assignmentId, teacher.id, false);
    });
  };

  return (
    <div
      style={{
        background:           "rgba(255,255,255,0.88)",
        backdropFilter:       "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border:               "1px solid rgba(224,230,240,0.85)",
        borderRadius:         "1rem",
        boxShadow:            "0 2px 10px rgba(0,39,83,0.05), inset 0 1px 0 rgba(255,255,255,0.90)",
        overflow:             "hidden",
      }}
    >
      {/* Encabezado del docente */}
      <div
        className="flex items-center gap-4 px-5 py-4"
        style={{ background: "rgba(0,39,83,0.025)", borderBottom: "1px solid rgba(0,39,83,0.07)" }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #002753 0%, #003d7a 100%)" }}
        >
          {teacher.name?.[0]?.toUpperCase() ?? "D"}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-pum-text">{teacher.name ?? "Sin nombre"}</p>
            {isSelf && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(252,204,56,0.35)", color: "#6f5600" }}
              >
                Tú
              </span>
            )}
          </div>
          <p className="text-xs text-pum-text-muted">{teacher.email}</p>
          {teacher.cedula && <p className="text-xs text-pum-text-disabled">CI: {teacher.cedula}</p>}
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-xl cursor-pointer pum-navy-btn"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Asignar materia
        </button>
      </div>

      {/* Tabla de asignaciones */}
      {teacher.assignments.length === 0 ? (
        <div className="px-5 py-5 text-center">
          <p className="text-sm text-pum-text-muted">
            Sin asignaciones. Usa <strong>Asignar materia</strong> para agregar.
          </p>
        </div>
      ) : (
        <>
          {/* Leyenda informativa */}
          <div className="px-5 pt-3 pb-1">
            <p className="text-[11px] text-pum-text-muted">
              El docente marcado como <strong>Editor</strong> es el único que puede modificar el PUM de esa materia y nivel. Los demás docentes co-asignados solo pueden visualizarlo.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: "rgba(0,39,83,0.03)", borderBottom: "1px solid rgba(0,39,83,0.06)" }}>
                  {["Materia", "Nivel", "Año lectivo", "Rol PUM", ""].map((h, i) => (
                    <th
                      key={i}
                      className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-pum-text-disabled"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teacher.assignments.map((a, i) => (
                  <tr
                    key={a.id}
                    style={{
                      background:   i % 2 !== 0 ? "rgba(0,39,83,0.012)" : "transparent",
                      borderBottom: "1px solid rgba(0,39,83,0.03)",
                    }}
                  >
                    <td className="px-4 py-2.5">
                      <p className="text-pum-text font-medium">{a.subjectName}</p>
                      <code
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded mt-0.5 inline-block"
                        style={{ background: "rgba(0,39,83,0.07)", color: "#002753" }}
                      >
                        {a.subjectCode}
                      </code>
                    </td>
                    <td className="px-4 py-2.5 text-pum-text-muted">
                      {a.levelName}
                      <span className="ml-1 text-[11px] text-pum-text-disabled">({a.levelCode})</span>
                    </td>
                    <td className="px-4 py-2.5 text-pum-text-muted text-xs">{a.yearLabel}</td>

                    {/* Columna: rol PUM — siempre muestra Planifica + Visualiza */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => a.isEditor !== true && handleSetPrimary(a.id)}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
                          style={
                            a.isEditor === true
                              ? { background: "#166534", color: "#ffffff", cursor: "default" }
                              : { background: "rgba(107,114,128,0.12)", color: "#6b7280", cursor: "pointer" }
                          }
                        >
                          Planifica
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => a.isEditor === true && handleUnsetPrimary(a.id)}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
                          style={
                            a.isEditor !== true
                              ? { background: "#166534", color: "#ffffff", cursor: "default" }
                              : { background: "rgba(107,114,128,0.12)", color: "#6b7280", cursor: "pointer" }
                          }
                        >
                          Visualiza
                        </button>
                      </div>
                    </td>

                    {/* Columna: quitar asignación */}
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRemove(a.id)}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg cursor-pointer disabled:opacity-40 transition-colors hover:opacity-80"
                        style={{ background: "rgba(186,26,26,0.08)", color: "#ba1a1a" }}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal agregar */}
      {addOpen && (
        <AddAssignmentModal
          teacher={teacher}
          catalog={catalog}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}

// ── Componente principal exportado ────────────────────────────────────────────

export function TeacherAssignmentPanel({
  teachers,
  catalog,
  coordinatorId,
}: {
  teachers:      AssignedTeacher[];
  catalog:       CatalogData;
  coordinatorId: string;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) =>
      (t.name ?? t.email).toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q)
    );
  }, [teachers, search]);

  return (
    <div className="flex flex-col gap-5">
      {/* Buscador */}
      {teachers.length > 1 && (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar docente…"
          className="px-3 py-2 text-sm outline-none rounded-xl self-start w-56"
          style={{
            background: "rgba(255,255,255,0.85)",
            border:     "1px solid rgba(0,39,83,0.14)",
            color:      "#191c1d",
          }}
        />
      )}

      {filtered.length === 0 && (
        <p className="text-sm text-pum-text-muted">No hay docentes que coincidan con la búsqueda.</p>
      )}

      {filtered.map((teacher) => (
        <TeacherCard
          key={teacher.id}
          teacher={teacher}
          catalog={catalog}
          isSelf={teacher.id === coordinatorId}
        />
      ))}
    </div>
  );
}
