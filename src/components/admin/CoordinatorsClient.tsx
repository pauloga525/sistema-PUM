"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  createCoordinatorAction,
  promoteTeacherToCoordinatorAction,
  setCoordinatorSubjectsAction,
  addCoordinatorTeacherAction,
  removeCoordinatorAssignmentAction,
  deleteCoordinatorAction,
  type CoordinatorActionState,
} from "@/app/(admin)/admin/coordinators/actions";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface TeacherOption {
  id:    string;
  name:  string | null;
  email: string;
}

interface SubjectOption {
  id:   string;
  name: string;
  code: string;
}

interface CoordinatorTeacher {
  assignmentId: string;
  teacherId:    string;
  teacherName:  string | null;
  teacherEmail: string;
  subjectCount: number;
}

interface CoordinatorEntry {
  id:                 string;
  name:               string | null;
  email:              string;
  cedula:             string | null;
  coordinatorArea:    string | null;
  createdAt:          Date;
  teachers:           CoordinatorTeacher[];
  progress:           { total: number; approved: number };
  assignedSubjectIds: string[];
}

interface Props {
  coordinators: CoordinatorEntry[];
  teachers:     TeacherOption[];
  subjects:     SubjectOption[];
}

// ── Estilos comunes ────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  background:   "rgba(243,244,245,0.90)",
  border:       "1px solid rgba(0,39,83,0.14)",
  borderRadius: "0.625rem",
  color:        "#191c1d",
  width:        "100%",
};

// ── Barra de progreso ──────────────────────────────────────────────────────────

function ProgressBar({ done, total }: { done: number; total: number }) {
  if (total === 0) return <span className="text-xs text-pum-text-disabled">Sin PUMs aún</span>;
  const pct   = Math.round((done / total) * 100);
  const color = pct === 100 ? "#16a34a" : pct >= 50 ? "#002753" : "#ca8a04";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,39,83,0.08)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color }}>
        {done}/{total}
      </span>
    </div>
  );
}

// ── Panel para agregar un docente a un coordinador existente ──────────────────

function AddTeacherPanel({
  coordinatorId,
  teachers,
  assignedTeacherIds,
}: {
  coordinatorId:      string;
  teachers:           TeacherOption[];
  assignedTeacherIds: Set<string>;
}) {
  const [open,      setOpen]      = useState(false);
  const [teacherId, setTeacherId] = useState("");
  const [error,     setError]     = useState<string | null>(null);
  const [isPending, start]        = useTransition();

  const available = teachers.filter((t) => !assignedTeacherIds.has(t.id));

  const handleSave = () => {
    if (!teacherId) return;
    start(async () => {
      const res = await addCoordinatorTeacherAction(coordinatorId, teacherId);
      if (res?.ok) {
        setOpen(false);
        setTeacherId("");
        setError(null);
      } else {
        setError((res as { ok: false; error: string }).error);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
        style={{ background: "rgba(0,39,83,0.07)", color: "#002753" }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Agregar docente
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{
              background: "rgba(255,255,255,0.97)",
              border:     "1px solid rgba(195,198,210,0.80)",
              boxShadow:  "0 16px 48px rgba(0,39,83,0.18)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-pum-text">Agregar docente</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-pum-text-disabled hover:text-pum-text cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {available.length === 0 ? (
                <p className="text-sm text-pum-text-muted py-2">Todos los docentes ya están asignados a este coordinador.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-pum-text-muted">Docente</label>
                  <select
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    style={INPUT}
                    className="px-2.5 py-2 text-sm outline-none"
                  >
                    <option value="">— Seleccionar docente —</option>
                    {available.map((t) => (
                      <option key={t.id} value={t.id}>{t.name ?? t.email}</option>
                    ))}
                  </select>
                </div>
              )}

              {error && (
                <p className="text-xs font-medium rounded-lg px-3 py-2" style={{ background: "#ffdad6", color: "#ba1a1a" }}>{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="text-sm text-pum-text-muted hover:text-pum-text cursor-pointer px-3 py-1.5">
                  Cancelar
                </button>
                {available.length > 0 && (
                  <button
                    type="button"
                    disabled={isPending || !teacherId}
                    onClick={handleSave}
                    className="pum-navy-btn text-sm font-semibold text-white px-4 py-1.5 rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? "Guardando…" : "Agregar"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

// ── Panel para asignar materias a un coordinador ──────────────────────────────

function AssignSubjectsPanel({
  coordinatorId,
  subjects,
  initialSelectedIds,
}: {
  coordinatorId:      string;
  subjects:           SubjectOption[];
  initialSelectedIds: string[];
}) {
  const [open,     setOpen]     = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search,   setSearch]   = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [isPending, start]      = useTransition();

  const openModal = () => {
    setSelected(new Set(initialSelectedIds));
    setSearch("");
    setError(null);
    setOpen(true);
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const q = search.toLowerCase().trim();
  const visible = subjects.filter(
    (s) => !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
  );

  const handleSave = () => {
    start(async () => {
      const res = await setCoordinatorSubjectsAction(coordinatorId, Array.from(selected));
      if (res?.ok) {
        setOpen(false);
      } else {
        setError((res as { ok: false; error: string }).error ?? "Error al guardar");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
        style={{ background: "rgba(16,128,80,0.09)", color: "#0a6641" }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        Asignar materias
        {initialSelectedIds.length > 0 && (
          <span
            className="ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(16,128,80,0.15)", color: "#0a6641" }}
          >
            {initialSelectedIds.length}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl mb-8"
            style={{
              background: "rgba(255,255,255,0.97)",
              border:     "1px solid rgba(195,198,210,0.80)",
              boxShadow:  "0 16px 48px rgba(0,39,83,0.18)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-pum-text">Asignar materias</h3>
                <p className="text-[11px] text-pum-text-muted mt-0.5">
                  El coordinador solo podrá asignar estas materias a sus docentes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-pum-text-disabled hover:text-pum-text cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Buscador */}
            <div className="relative mb-3">
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-pum-text-disabled pointer-events-none"
              >
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre o código…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...INPUT, paddingLeft: "1.75rem" }}
                className="w-full py-1.5 pr-3 text-xs outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-pum-text-disabled hover:text-pum-text cursor-pointer"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Lista */}
            <div
              className="rounded-xl p-2 max-h-64 overflow-y-auto flex flex-col gap-0.5 mb-3"
              style={{ background: "rgba(0,39,83,0.03)", border: "1px solid rgba(0,39,83,0.07)" }}
            >
              {visible.length === 0 ? (
                <p className="text-xs text-pum-text-muted px-2 py-3">
                  {q ? `Sin resultados para "${search}".` : "No hay materias en el catálogo."}
                </p>
              ) : (
                visible.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggle(s.id)}
                      className="w-3.5 h-3.5 rounded flex-shrink-0"
                    />
                    <div className="min-w-0 flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ background: "rgba(0,39,83,0.08)", color: "#002753" }}
                      >
                        {s.code}
                      </span>
                      <p className="text-xs text-pum-text font-medium truncate">{s.name}</p>
                    </div>
                  </label>
                ))
              )}
            </div>

            {/* Contador + atajos */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-pum-text-muted">
                {selected.size > 0
                  ? `${selected.size} materia${selected.size !== 1 ? "s" : ""} seleccionada${selected.size !== 1 ? "s" : ""}`
                  : "Ninguna seleccionada — se mostrarán todas"}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(new Set(subjects.map((s) => s.id)))}
                  className="text-[11px] text-pum-primary hover:underline cursor-pointer"
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="text-[11px] text-pum-text-muted hover:underline cursor-pointer"
                >
                  Ninguna
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs font-medium rounded-lg px-3 py-2 mb-3" style={{ background: "#ffdad6", color: "#ba1a1a" }}>
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-pum-text-muted hover:text-pum-text cursor-pointer px-3 py-1.5"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSave}
                className="pum-navy-btn text-sm font-semibold text-white px-4 py-1.5 rounded-xl cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

// ── Tarjeta de coordinador ─────────────────────────────────────────────────────

function CoordinatorCard({ entry, teachers, subjects }: { entry: CoordinatorEntry; teachers: TeacherOption[]; subjects: SubjectOption[] }) {
  const [expanded,      setExpanded]      = useState(false);
  const [isPending,     start]            = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleRemove = (assignmentId: string) => {
    start(async () => { await removeCoordinatorAssignmentAction(assignmentId); });
  };

  const handleDelete = () => {
    start(async () => {
      await deleteCoordinatorAction(entry.id);
      setDeleteConfirm(false);
    });
  };

  const assignedIds = new Set(entry.teachers.map((t) => t.teacherId));
  const allApproved = entry.progress.total > 0 && entry.progress.approved === entry.progress.total;

  return (
    <div
      className="overflow-hidden"
      style={{
        background:           "rgba(255,255,255,0.88)",
        backdropFilter:       "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border:               "1px solid rgba(224,230,240,0.85)",
        borderRadius:         "1rem",
        boxShadow:            "0 2px 10px rgba(0,39,83,0.05), inset 0 1px 0 rgba(255,255,255,0.90)",
      }}
    >
      {/* Cabecera */}
      <div
        className="flex items-center gap-4 px-5 py-4"
        style={{ background: "rgba(0,39,83,0.025)", borderBottom: "1px solid rgba(0,39,83,0.07)" }}
      >
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)" }}
        >
          {entry.name?.[0]?.toUpperCase() ?? "C"}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-pum-text text-sm">{entry.name ?? "Sin nombre"}</p>
            {entry.coordinatorArea && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(29,78,216,0.10)", color: "#1d4ed8" }}
              >
                {entry.coordinatorArea}
              </span>
            )}
          </div>
          <p className="text-xs text-pum-text-muted">{entry.email}</p>
          {entry.cedula && <p className="text-[11px] text-pum-text-disabled">CI: {entry.cedula}</p>}
        </div>

        {/* Progreso */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <ProgressBar done={entry.progress.approved} total={entry.progress.total} />
          {allApproved && entry.progress.total > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#dcfce7", color: "#166534" }}>
              ✓ Completo
            </span>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <AssignSubjectsPanel
            coordinatorId={entry.id}
            subjects={subjects}
            initialSelectedIds={entry.assignedSubjectIds}
          />
          <AddTeacherPanel
            coordinatorId={entry.id}
            teachers={teachers}
            assignedTeacherIds={assignedIds}
          />
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
            style={{ background: "rgba(0,39,83,0.05)", color: "#002753" }}
          >
            {expanded ? "Ocultar" : `Docentes (${entry.teachers.length})`}
            <svg
              width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            disabled={isPending}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-pum-text-disabled hover:text-pum-error hover:bg-red-50 cursor-pointer transition-colors"
            title="Eliminar coordinador"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Docentes expandibles */}
      {expanded && (
        <div className="px-5 py-3">
          {entry.teachers.length === 0 ? (
            <p className="text-xs text-pum-text-muted py-2">Sin docentes asignados aún.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {entry.teachers.map((t) => (
                <div
                  key={t.assignmentId}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
                  style={{ background: "rgba(0,39,83,0.06)", color: "#002753" }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                    style={{ background: "rgba(0,39,83,0.35)" }}
                  >
                    {t.teacherName?.[0]?.toUpperCase() ?? "D"}
                  </div>
                  <span className="font-medium">{t.teacherName ?? t.teacherEmail}</span>
                  {t.subjectCount > 0 && (
                    <span className="text-pum-text-disabled text-[10px]">({t.subjectCount} asig.)</span>
                  )}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRemove(t.assignmentId)}
                    title="Quitar docente"
                    className="ml-0.5 text-pum-text-disabled hover:text-pum-error cursor-pointer disabled:opacity-40"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {deleteConfirm && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: "rgba(255,255,255,0.98)", boxShadow: "0 20px 60px rgba(0,39,83,0.20)" }}
          >
            <div>
              <h3 className="font-semibold text-pum-text mb-1">Eliminar coordinador</h3>
              <p className="text-sm text-pum-text-muted">
                ¿Eliminar a <strong>{entry.name ?? entry.email}</strong>? Esta acción no se puede deshacer.
                Se perderán todas sus asignaciones y revisiones.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                className="text-sm text-pum-text-muted hover:text-pum-text cursor-pointer px-3 py-1.5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="text-sm font-semibold text-white px-4 py-1.5 rounded-xl cursor-pointer disabled:opacity-50"
                style={{ background: "#ba1a1a" }}
              >
                {isPending ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── Modal crear coordinador ────────────────────────────────────────────────────

function CreateCoordinatorPanel({ teachers }: { teachers: TeacherOption[] }) {
  const [isOpen,           setIsOpen]           = useState(false);
  const [formKey,          setFormKey]          = useState(0);
  const [mode,             setMode]             = useState<"promote" | "new">("promote");
  const [selected,         setSelected]         = useState<Set<string>>(new Set());
  const [promoteTeacherId, setPromoteTeacherId] = useState("");
  const [teacherSearch,    setTeacherSearch]    = useState("");

  const [stateNew, formActionNew, isPendingNew] = useActionState<CoordinatorActionState, FormData>(
    createCoordinatorAction,
    null,
  );
  const [statePromote, formActionPromote, isPendingPromote] = useActionState<CoordinatorActionState, FormData>(
    promoteTeacherToCoordinatorAction,
    null,
  );

  const state      = mode === "new" ? stateNew      : statePromote;
  const isPending  = mode === "new" ? isPendingNew  : isPendingPromote;
  const formAction = mode === "new" ? formActionNew : formActionPromote;

  const closeAndReset = () => {
    setIsOpen(false);
    setFormKey((k) => k + 1);
    setSelected(new Set());
    setPromoteTeacherId("");
    setTeacherSearch("");
  };

  useEffect(() => {
    if (stateNew?.ok && isOpen && mode === "new") closeAndReset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateNew]);

  useEffect(() => {
    if (statePromote?.ok && isOpen && mode === "promote") closeAndReset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statePromote]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedList = Array.from(selected);
  const q = teacherSearch.toLowerCase().trim();
  const assignable = (
    mode === "promote" && promoteTeacherId
      ? teachers.filter((t) => t.id !== promoteTeacherId)
      : teachers
  ).filter((t) =>
    !q ||
    (t.name ?? "").toLowerCase().includes(q) ||
    t.email.toLowerCase().includes(q),
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-xl cursor-pointer pum-navy-btn"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Nuevo coordinador
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6 shadow-2xl mb-8"
            style={{
              background: "rgba(255,255,255,0.97)",
              border:     "1px solid rgba(195,198,210,0.80)",
              boxShadow:  "0 16px 48px rgba(0,39,83,0.18), inset 0 1px 0 rgba(255,255,255,0.90)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-pum-text">Nuevo coordinador de área</h2>
              <button
                type="button"
                onClick={closeAndReset}
                className="text-pum-text-disabled hover:text-pum-text cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div
              className="flex gap-1 mb-5 p-1 rounded-xl"
              style={{ background: "rgba(0,39,83,0.06)" }}
            >
              <button
                type="button"
                onClick={() => { setMode("promote"); setSelected(new Set()); setPromoteTeacherId(""); }}
                className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all cursor-pointer"
                style={mode === "promote"
                  ? { background: "#fff", boxShadow: "0 1px 4px rgba(0,39,83,0.12)", color: "#002753" }
                  : { color: "#667085" }}
              >
                Desde docente existente
              </button>
              <button
                type="button"
                onClick={() => { setMode("new"); setSelected(new Set()); setPromoteTeacherId(""); }}
                className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all cursor-pointer"
                style={mode === "new"
                  ? { background: "#fff", boxShadow: "0 1px 4px rgba(0,39,83,0.12)", color: "#002753" }
                  : { color: "#667085" }}
              >
                Crear nuevo usuario
              </button>
            </div>

            <form key={`${formKey}-${mode}`} action={formAction} className="flex flex-col gap-4">
              {/* Hidden: teacher ids to assign */}
              <input type="hidden" name="teacherCount" value={selectedList.length} />
              {selectedList.map((tid, i) => (
                <input key={tid} type="hidden" name={`teacherId_${i}`} value={tid} />
              ))}

              {mode === "promote" ? (
                /* ── Promover docente existente ── */
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-pum-text-muted">Docente a promover</label>
                  <select
                    name="teacherId"
                    required
                    value={promoteTeacherId}
                    onChange={(e) => {
                      setPromoteTeacherId(e.target.value);
                      setSelected((prev) => {
                        const next = new Set(prev);
                        next.delete(e.target.value);
                        return next;
                      });
                    }}
                    style={{ ...INPUT, paddingLeft: "0.75rem", paddingRight: "0.75rem", paddingTop: "0.5rem", paddingBottom: "0.5rem" }}
                    className="text-sm outline-none"
                  >
                    <option value="">— Seleccionar docente —</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name ?? t.email}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-pum-text-disabled">
                    El docente mantendrá su cédula como contraseña y conserva su correo actual.
                  </p>
                </div>
              ) : (
                /* ── Crear nuevo usuario ── */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-pum-text-muted">Nombre completo</label>
                      <input
                        name="name" type="text" required placeholder="Ej. Juan Pérez Torres"
                        style={INPUT} className="px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-pum-text-muted">Número de cédula</label>
                      <input
                        name="cedula" type="text" required placeholder="1234567890"
                        pattern="\d{10}" title="10 dígitos" maxLength={10}
                        style={INPUT} className="px-3 py-2 text-sm outline-none"
                      />
                      <p className="text-[11px] text-pum-text-disabled">10 dígitos — contraseña inicial</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-pum-text-muted">Correo institucional</label>
                    <input
                      name="email" type="email" required placeholder="coordinador@uets.edu.ec"
                      pattern="^[^@]+@uets\.edu\.ec$" title="Debe ser @uets.edu.ec"
                      style={INPUT} className="px-3 py-2 text-sm outline-none"
                    />
                  </div>
                </>
              )}

              {/* Área — siempre visible */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-pum-text-muted">Área de coordinación</label>
                <input
                  name="coordinatorArea" type="text"
                  placeholder="Ej. Ciencias Exactas, Humanidades…"
                  style={INPUT} className="px-3 py-2 text-sm outline-none"
                />
              </div>

              {/* Docentes a cargo — siempre visible */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-pum-text-muted">
                  Docentes a cargo <span className="text-pum-text-disabled font-normal">(opcional)</span>
                </label>

                {/* Buscador */}
                <div className="relative">
                  <svg
                    width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-pum-text-disabled pointer-events-none"
                  >
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o correo…"
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    style={{ ...INPUT, paddingLeft: "1.75rem" }}
                    className="w-full py-1.5 pr-3 text-xs outline-none"
                  />
                  {teacherSearch && (
                    <button
                      type="button"
                      onClick={() => setTeacherSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-pum-text-disabled hover:text-pum-text cursor-pointer"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>

                {mode === "promote" && !promoteTeacherId ? (
                  <p className="text-xs text-pum-text-muted">Selecciona primero un docente para ver la lista.</p>
                ) : assignable.length === 0 ? (
                  <p className="text-xs text-pum-text-muted">
                    {q ? `Sin resultados para "${teacherSearch}".` : "No hay docentes disponibles."}
                  </p>
                ) : (
                  <div
                    className="rounded-xl p-2 max-h-48 overflow-y-auto flex flex-col gap-0.5"
                    style={{ background: "rgba(0,39,83,0.03)", border: "1px solid rgba(0,39,83,0.07)" }}
                  >
                    {assignable.map((t) => (
                      <label
                        key={t.id}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(t.id)}
                          onChange={() => toggle(t.id)}
                          className="w-3.5 h-3.5 rounded flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs text-pum-text font-medium truncate">{t.name ?? t.email}</p>
                          {t.name && <p className="text-[10px] text-pum-text-disabled truncate">{t.email}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {selected.size > 0 && (
                  <p className="text-[11px] text-pum-text-muted">
                    {selected.size} docente{selected.size !== 1 ? "s" : ""} seleccionado{selected.size !== 1 ? "s" : ""}
                  </p>
                )}
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
                  onClick={closeAndReset}
                  className="text-sm text-pum-text-muted hover:text-pum-text cursor-pointer px-3 py-1.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="pum-navy-btn text-sm font-semibold text-white px-5 py-2 rounded-xl cursor-pointer disabled:opacity-60"
                >
                  {isPending
                    ? "Procesando…"
                    : mode === "promote"
                      ? "Promover a coordinador"
                      : "Crear coordinador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export function CoordinatorsClient({ coordinators, teachers, subjects }: Props) {
  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-5xl mx-auto w-full">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-7">
        <div>
          <h1 className="text-2xl font-semibold text-pum-text">Coordinadores de Área</h1>
          <p className="text-sm text-pum-text-muted mt-0.5">
            Gestiona coordinadores y los docentes que supervisan.
          </p>
        </div>
        <CreateCoordinatorPanel teachers={teachers} />
      </div>

      {/* Estadísticas */}
      {coordinators.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: "Coordinadores",         value: coordinators.length },
            { label: "Docentes supervisados",  value: new Set(coordinators.flatMap((c) => c.teachers.map((t) => t.teacherId))).size },
            { label: "PUMs aprobados",         value: `${coordinators.reduce((s, c) => s + c.progress.approved, 0)} / ${coordinators.reduce((s, c) => s + c.progress.total, 0)}` },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{
                background:     "rgba(255,255,255,0.85)",
                backdropFilter: "blur(12px)",
                border:         "1px solid rgba(195,198,210,0.70)",
                boxShadow:      "0 2px 8px rgba(0,39,83,0.04)",
              }}
            >
              <p className="text-2xl font-bold text-pum-text">{stat.value}</p>
              <p className="text-xs text-pum-text-muted leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Vacío */}
      {coordinators.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div
            className="text-center rounded-2xl px-10 py-12 max-w-sm"
            style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(195,198,210,0.70)" }}
          >
            <div
              className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: "rgba(0,39,83,0.06)" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#002753" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="7" r="3" /><path d="M3 20v-1a5 5 0 0 1 5-5h2" />
                <circle cx="17" cy="11" r="3" /><path d="M13 20v-1a5 5 0 0 1 5-5h0a5 5 0 0 1 5 5v1" />
              </svg>
            </div>
            <p className="text-base font-semibold text-pum-text mb-1">Sin coordinadores</p>
            <p className="text-sm text-pum-text-muted">Crea el primer coordinador de área con el botón de arriba.</p>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="flex flex-col gap-4">
        {coordinators.map((entry) => (
          <CoordinatorCard key={entry.id} entry={entry} teachers={teachers} subjects={subjects} />
        ))}
      </div>
    </div>
  );
}
