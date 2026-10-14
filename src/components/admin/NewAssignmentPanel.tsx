"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createAssignmentAction,
  type AssignmentActionState,
} from "@/app/(admin)/admin/assignments/actions";
import { Dialog } from "@/components/ui/Dialog";

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

interface LevelOption {
  id:    string;
  name:  string;
  code:  string;
  track: string;
}

interface Props {
  academicYearId: string;
  teachers:       TeacherOption[];
  subjects:       SubjectOption[];
  levels:         LevelOption[];
}

const INPUT: React.CSSProperties = {
  background:   "rgba(243,244,245,0.90)",
  border:       "1px solid rgba(0,39,83,0.14)",
  borderRadius: "0.625rem",
  color:        "#191c1d",
  width:        "100%",
  outline:      "none",
};

export function NewAssignmentPanel({ academicYearId, teachers, subjects, levels }: Props) {
  const [isOpen,       setIsOpen]       = useState(false);
  const [formKey,      setFormKey]      = useState(0);
  const [teacherQuery, setTeacherQuery] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherOption | null>(null);
  const [subjectId,    setSubjectId]    = useState("");
  const [levelId,      setLevelId]      = useState("");

  function resetForm() {
    setTeacherQuery("");
    setSelectedTeacher(null);
    setSubjectId("");
    setLevelId("");
  }

  const [state, formAction, isPending] = useActionState<AssignmentActionState, FormData>(
    async (prev, formData) => {
      const result = await createAssignmentAction(prev, formData);
      if (result?.ok) {
        setIsOpen(false);
        setFormKey((k) => k + 1);
        resetForm();
      }
      return result;
    },
    null,
  );

  function handleClose() {
    setIsOpen(false);
    resetForm();
  }

  const filteredTeachers = useMemo(() => {
    const q = teacherQuery.toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) =>
      (t.name ?? "").toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q)
    );
  }, [teachers, teacherQuery]);

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-xl cursor-pointer pum-navy-btn"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Nueva asignación
      </button>

      {/* Modal */}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => { if (!open) handleClose(); }}
        dismissible={!isPending}
        size="xl"
        title="Nueva asignación"
        description={<span className="text-xs">La asignación cubre el año lectivo completo.</span>}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Cerrar"
          className="absolute right-5 top-5 text-pum-text-disabled hover:text-pum-text cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Body */}
        <form key={formKey} action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="academicYearId" value={academicYearId} />
          <input type="hidden" name="teacherId"      value={selectedTeacher?.id ?? ""} />
          <input type="hidden" name="subjectId"      value={subjectId} />
          <input type="hidden" name="levelId"        value={levelId} />

          {/* ── 1. Seleccionar docente ── */}
          <div>
            <label htmlFor="new-assignment-teacher" className="text-xs font-semibold uppercase tracking-wide text-pum-text-muted block mb-2">
              1. Docente
            </label>

            {selectedTeacher ? (
              <div
                className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                style={{ background: "rgba(0,39,83,0.06)", border: "1px solid rgba(0,39,83,0.15)" }}
              >
                <div>
                  <p className="text-sm font-semibold text-pum-text">{selectedTeacher.name ?? selectedTeacher.email}</p>
                  {selectedTeacher.name && (
                    <p className="text-[11px] text-pum-text-muted">{selectedTeacher.email}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedTeacher(null); setTeacherQuery(""); }}
                  className="text-xs text-pum-text-muted hover:text-pum-error cursor-pointer px-2 py-1 rounded"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-pum-text-muted"
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    id="new-assignment-teacher"
                    type="search"
                    value={teacherQuery}
                    onChange={(e) => setTeacherQuery(e.target.value)}
                    placeholder="Buscar por nombre o correo…"
                    style={{ ...INPUT, paddingLeft: "2rem" }}
                    className="px-3 py-2 text-sm"
                    autoFocus
                  />
                </div>

                <div
                  className="rounded-xl overflow-y-auto flex flex-col gap-0.5 p-1"
                  style={{ border: "1px solid rgba(0,39,83,0.10)", maxHeight: "180px" }}
                >
                  {filteredTeachers.length === 0 ? (
                    <p className="text-xs text-center text-pum-text-muted py-4">
                      {teacherQuery ? `Sin resultados para "${teacherQuery}"` : "No hay docentes registrados"}
                    </p>
                  ) : (
                    filteredTeachers.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTeacher(t)}
                        className="flex flex-col items-start px-3 py-2 rounded-lg text-left transition-colors cursor-pointer hover:bg-pum-primary/5"
                      >
                        <span className="text-sm font-medium text-pum-text">{t.name ?? t.email}</span>
                        {t.name && <span className="text-[11px] text-pum-text-muted">{t.email}</span>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── 2. Materia ── */}
          <div>
            <label htmlFor="new-assignment-subject" className="text-xs font-semibold uppercase tracking-wide text-pum-text-muted block mb-2">
              2. Materia
            </label>
            <select
              id="new-assignment-subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              required
              style={INPUT}
              className="px-3 py-2 text-sm"
            >
              <option value="">— Seleccionar materia —</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          {/* ── 3. Nivel ── */}
          <div>
            <label htmlFor="new-assignment-level" className="text-xs font-semibold uppercase tracking-wide text-pum-text-muted block mb-2">
              3. Nivel
            </label>
            <select
              id="new-assignment-level"
              value={levelId}
              onChange={(e) => setLevelId(e.target.value)}
              required
              style={INPUT}
              className="px-3 py-2 text-sm"
            >
              <option value="">— Seleccionar nivel —</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.track === "BACHILLERATO" ? "Bachillerato" : "Básica"}
                </option>
              ))}
            </select>
          </div>

          {/* Error */}
          {state?.error && (
            <p role="alert" className="text-xs font-medium rounded-lg px-3 py-2" style={{ background: "#ffdad6", color: "#ba1a1a" }}>
              {state.error}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-1 pb-1">
            <button
              type="button"
              onClick={handleClose}
              className="text-sm text-pum-text-muted hover:text-pum-text cursor-pointer px-3 py-1.5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !selectedTeacher}
              className="pum-navy-btn text-sm font-semibold text-white px-5 py-2 rounded-xl cursor-pointer disabled:opacity-60"
            >
              {isPending ? "Asignando…" : "Asignar"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
