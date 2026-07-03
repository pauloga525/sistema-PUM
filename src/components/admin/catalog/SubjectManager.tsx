"use client";

import { useActionState, useState, useTransition } from "react";
import {
  createSubjectAction,
  deleteSubjectAction,
  addSubjectToLevelAction,
  removeSubjectFromLevelAction,
  type CatalogActionState,
} from "@/app/(admin)/admin/catalog/actions";
import type { SubjectData, LevelData } from "./CatalogClient";

// ── Sub-componente: fila de materia ───────────────────────────────────────────

function SubjectRow({
  subject,
  levels,
}: {
  subject: SubjectData;
  levels: LevelData[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [stateDelete, deleteAction, pendingDelete] = useActionState<CatalogActionState, FormData>(
    deleteSubjectAction, null
  );
  const [stateAdd, addAction, pendingAdd] = useActionState<CatalogActionState, FormData>(
    addSubjectToLevelAction, null
  );
  const [stateRemove, removeAction] = useActionState<CatalogActionState, FormData>(
    removeSubjectFromLevelAction, null
  );

  const linkedLevelIds = new Set(subject.subjectLevels.map((sl) => sl.levelId));
  const availableLevels = levels.filter((l) => !linkedLevelIds.has(l.id));

  return (
    <div
      className="rounded-xl overflow-hidden mb-2"
      style={{ border: "1px solid rgba(0,39,83,0.10)" }}
    >
      {/* ── Encabezado ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        style={{ background: "rgba(255,255,255,0.70)" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <svg
          width="12" height="12"
          viewBox="0 0 24 24"
          fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round"
          className="text-pum-text-muted flex-shrink-0 transition-transform"
          style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-pum-text">{subject.name}</span>
          {subject.areaEstudio && (
            <span className="ml-2 text-xs text-pum-text-muted">{subject.areaEstudio}</span>
          )}
        </div>

        <code
          className="text-[11px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ background: "rgba(0,39,83,0.07)", color: "#002753" }}
        >
          {subject.code}
        </code>

        <span className="text-xs text-pum-text-disabled flex-shrink-0">
          {subject.subjectLevels.length} {subject.subjectLevels.length === 1 ? "nivel" : "niveles"}
        </span>

        {/* Eliminar */}
        <form action={deleteAction} onClick={(e) => e.stopPropagation()}>
          <input type="hidden" name="id" value={subject.id} />
          <button
            type="submit"
            disabled={!!pendingDelete}
            onClick={(e) => {
              if (!confirm(`¿Eliminar la materia "${subject.name}"? Esta acción no se puede deshacer.`)) {
                e.preventDefault();
              }
            }}
            className="text-xs text-pum-error hover:opacity-70 cursor-pointer px-2 py-1 rounded disabled:opacity-40 flex-shrink-0"
          >
            {pendingDelete ? "…" : "Eliminar"}
          </button>
        </form>
      </div>

      {stateDelete?.error && (
        <p className="px-4 pb-2 text-xs text-pum-error">{stateDelete.error}</p>
      )}

      {/* ── Niveles vinculados ── */}
      {expanded && (
        <div className="px-4 pb-4 pt-2" style={{ background: "rgba(0,39,83,0.02)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-pum-text-muted mb-2">
            Niveles vinculados
          </p>

          {subject.subjectLevels.length === 0 ? (
            <p className="text-xs text-pum-text-disabled mb-3">
              No está vinculada a ningún nivel.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {subject.subjectLevels.map((sl) => (
                <div
                  key={sl.id}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs"
                  style={{ background: "rgba(0,39,83,0.08)", color: "#002753" }}
                >
                  <span className="font-medium">{sl.level.name}</span>
                  <form action={removeAction} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={sl.id} />
                    <button
                      type="submit"
                      className="ml-1 text-pum-text-muted hover:text-pum-error cursor-pointer"
                      title="Desvincular"
                      style={{ lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}

          {stateRemove?.error && (
            <p className="text-xs text-pum-error mb-2">{stateRemove.error}</p>
          )}

          {/* Agregar vínculo */}
          {availableLevels.length > 0 ? (
            <form action={addAction} className="flex gap-2">
              <input type="hidden" name="subjectId" value={subject.id} />
              <select
                name="levelId"
                required
                className="pum-glass-input flex-1 px-2 py-1.5 text-xs"
              >
                <option value="">Vincular a nivel…</option>
                {availableLevels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.track === "BACHILLERATO" ? "BGU" : "Básica"})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!!pendingAdd}
                className="pum-navy-btn px-3 py-1.5 text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-60"
              >
                {pendingAdd ? "…" : "Vincular"}
              </button>
            </form>
          ) : (
            <p className="text-xs text-pum-text-disabled">
              Ya está vinculada a todos los niveles disponibles.
            </p>
          )}

          {stateAdd?.error && (
            <p className="text-xs text-pum-error mt-1">{stateAdd.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

interface Props {
  subjects: SubjectData[];
  levels:   LevelData[];
}

export function SubjectManager({ subjects, levels }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stateCreate, createAction, pendingCreate] = useActionState<CatalogActionState, FormData>(
    createSubjectAction, null
  );

  const filtered = subjects.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.areaEstudio ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      {/* ── Tarjeta principal ── */}
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
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between border-b border-pum-border/50"
          style={{ background: "rgba(0,39,83,0.03)" }}
        >
          <div>
            <h2 className="text-sm font-semibold text-pum-text">
              Materias <span className="font-normal text-pum-text-muted">({subjects.length})</span>
            </h2>
            <p className="text-xs text-pum-text-muted mt-0.5">
              Crea materias y vincúlalas a los niveles donde se imparten.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="pum-navy-btn px-4 py-2 text-white text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva materia
          </button>
        </div>

        {/* Formulario nueva materia */}
        {showForm && (
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(0,39,83,0.06)", background: "rgba(252,204,56,0.04)" }}>
            <form action={createAction} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-pum-text-muted block mb-1">
                    Nombre de la materia
                  </label>
                  <input
                    name="name"
                    placeholder="Ej: Ciencias Naturales"
                    required
                    className="pum-glass-input w-full px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-pum-text-muted block mb-1">
                    Código
                  </label>
                  <input
                    name="code"
                    placeholder="Ej: CCNN"
                    required
                    className="pum-glass-input w-full px-3 py-2 text-sm uppercase"
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-pum-text-muted block mb-1">
                  Área de estudio (opcional)
                </label>
                <input
                  name="areaEstudio"
                  placeholder="Ej: Ciencias Naturales y Experimentales"
                  className="pum-glass-input w-full px-3 py-2 text-sm"
                />
              </div>

              {stateCreate?.error && (
                <p className="text-xs text-pum-error">{stateCreate.error}</p>
              )}
              {stateCreate?.ok && (
                <p className="text-xs text-green-700">Materia creada. Ahora puedes vincularla a los niveles.</p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!!pendingCreate}
                  className="pum-navy-btn px-5 py-2 text-white text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-60"
                >
                  {pendingCreate ? "Guardando…" : "Crear materia"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-xs rounded-xl cursor-pointer"
                  style={{ background: "rgba(0,39,83,0.06)", color: "#002753" }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Buscador */}
        {subjects.length > 0 && (
          <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(0,39,83,0.06)" }}>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, código o área…"
              className="pum-glass-input w-full max-w-sm px-3 py-2 text-sm"
            />
          </div>
        )}

        {/* Lista */}
        <div className="p-4">
          {subjects.length === 0 ? (
            <p className="text-sm text-center text-pum-text-muted py-6">
              No hay materias registradas. Crea una para comenzar.
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-center text-pum-text-muted py-4">
              No hay resultados para &quot;{searchQuery}&quot;.
            </p>
          ) : (
            filtered.map((s) => (
              <SubjectRow key={s.id} subject={s} levels={levels} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
