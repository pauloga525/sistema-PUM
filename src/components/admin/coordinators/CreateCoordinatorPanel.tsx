"use client";

import { useActionState, useState } from "react";
import {
  createCoordinatorAction,
  promoteTeacherToCoordinatorAction,
  type CoordinatorActionState,
} from "@/app/(admin)/admin/coordinators/actions";
import { TempPasswordNotice } from "@/components/shared/TempPasswordNotice";
import { Dialog } from "@/components/ui/Dialog";
import { DialogCloseButton, FormError, INPUT } from "./shared";
import type { TeacherOption } from "./types";

type Mode = "promote" | "new";

/** Botón + diálogo para crear un coordinador (nuevo usuario o docente promovido). */
export function CreateCoordinatorPanel({ teachers }: { teachers: TeacherOption[] }) {
  const [isOpen,  setIsOpen]  = useState(false);
  // Cada apertura usa un formulario nuevo (key): al cerrar se descarta todo su estado
  const [session, setSession] = useState(0);
  const [mode,    setMode]    = useState<Mode>("promote");
  // Mientras se muestra la contraseña temporal el diálogo no se cierra con Esc ni clic fuera
  const [showingPassword, setShowingPassword] = useState(false);

  const closeAndReset = () => {
    setIsOpen(false);
    setSession((s) => s + 1);
    setShowingPassword(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-xl cursor-pointer pum-navy-btn"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Nuevo coordinador
      </button>

      <Dialog
        open={isOpen}
        onOpenChange={(next) => { if (!next) closeAndReset(); }}
        title="Nuevo coordinador de área"
        size="lg"
        dismissible={!(showingPassword && mode === "new")}
      >
        <DialogCloseButton onClick={closeAndReset} size={18} />
        <CreateCoordinatorForm
          key={session}
          teachers={teachers}
          mode={mode}
          onModeChange={setMode}
          onPasswordShown={() => setShowingPassword(true)}
          onClose={closeAndReset}
        />
      </Dialog>
    </>
  );
}

function CreateCoordinatorForm({
  teachers,
  mode,
  onModeChange,
  onPasswordShown,
  onClose,
}: {
  teachers:        TeacherOption[];
  mode:            Mode;
  onModeChange:    (mode: Mode) => void;
  onPasswordShown: () => void;
  onClose:         () => void;
}) {
  const [selected,         setSelected]         = useState<Set<string>>(new Set());
  const [promoteTeacherId, setPromoteTeacherId] = useState("");
  const [teacherSearch,    setTeacherSearch]    = useState("");

  const [stateNew, formActionNew, isPendingNew] = useActionState<CoordinatorActionState, FormData>(
    async (prev, formData) => {
      const result = await createCoordinatorAction(prev, formData);
      if (result?.ok && result.tempPassword) onPasswordShown();
      return result;
    },
    null,
  );
  const [statePromote, formActionPromote, isPendingPromote] = useActionState<CoordinatorActionState, FormData>(
    async (prev, formData) => {
      const result = await promoteTeacherToCoordinatorAction(prev, formData);
      if (result?.ok) onClose();
      return result;
    },
    null,
  );

  const state      = mode === "new" ? stateNew      : statePromote;
  const isPending  = mode === "new" ? isPendingNew  : isPendingPromote;
  const formAction = mode === "new" ? formActionNew : formActionPromote;

  // La contraseña temporal se muestra una sola vez: al cerrar, el formulario se descarta
  const createdPassword =
    mode === "new" && stateNew?.ok && stateNew.tempPassword ? stateNew.tempPassword : null;

  const switchMode = (next: Mode) => {
    onModeChange(next);
    setSelected(new Set());
    setPromoteTeacherId("");
  };

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

  const tabStyle = (active: boolean): React.CSSProperties =>
    active
      ? { background: "#fff", boxShadow: "0 1px 4px rgba(0,39,83,0.12)", color: "#002753" }
      : { color: "#667085" };

  return (
    <>
      {/* Tabs */}
      <div
        className="flex gap-1 mb-5 p-1 rounded-xl"
        style={{ background: "rgba(0,39,83,0.06)" }}
      >
        <button
          type="button"
          onClick={() => switchMode("promote")}
          aria-pressed={mode === "promote"}
          className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all cursor-pointer"
          style={tabStyle(mode === "promote")}
        >
          Desde docente existente
        </button>
        <button
          type="button"
          onClick={() => switchMode("new")}
          aria-pressed={mode === "new"}
          className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all cursor-pointer"
          style={tabStyle(mode === "new")}
        >
          Crear nuevo usuario
        </button>
      </div>

      {createdPassword ? (
        <div className="flex flex-col gap-4">
          <TempPasswordNotice password={createdPassword} title="Coordinador creado correctamente." />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="pum-navy-btn text-sm font-semibold text-white px-5 py-2 rounded-xl cursor-pointer"
            >
              Listo
            </button>
          </div>
        </div>
      ) : (
        <form key={mode} action={formAction} className="flex flex-col gap-4">
          {/* Hidden: teacher ids to assign */}
          <input type="hidden" name="teacherCount" value={selectedList.length} />
          {selectedList.map((tid, i) => (
            <input key={tid} type="hidden" name={`teacherId_${i}`} value={tid} />
          ))}

          {mode === "promote" ? (
            /* ── Promover docente existente ── */
            <div className="flex flex-col gap-1">
              <label htmlFor="coord-promote-teacher" className="text-xs font-medium text-pum-text-muted">Docente a promover</label>
              <select
                id="coord-promote-teacher"
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
                El docente conserva su contraseña y su correo actuales.
              </p>
            </div>
          ) : (
            /* ── Crear nuevo usuario ── */
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="coord-name" className="text-xs font-medium text-pum-text-muted">Nombre completo</label>
                  <input
                    id="coord-name"
                    name="name" type="text" required placeholder="Ej. Juan Pérez Torres"
                    style={INPUT} className="px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="coord-cedula" className="text-xs font-medium text-pum-text-muted">Número de cédula</label>
                  <input
                    id="coord-cedula"
                    name="cedula" type="text" required placeholder="1234567890"
                    pattern="\d{10}" title="10 dígitos" maxLength={10}
                    style={INPUT} className="px-3 py-2 text-sm outline-none"
                  />
                  <p className="text-[11px] text-pum-text-disabled">10 dígitos</p>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="coord-email" className="text-xs font-medium text-pum-text-muted">Correo institucional</label>
                <input
                  id="coord-email"
                  name="email" type="email" required placeholder="coordinador@uets.edu.ec"
                  pattern="^[^@]+@uets\.edu\.ec$" title="Debe ser @uets.edu.ec"
                  style={INPUT} className="px-3 py-2 text-sm outline-none"
                />
              </div>
            </>
          )}

          {/* Área — siempre visible */}
          <div className="flex flex-col gap-1">
            <label htmlFor="coord-area" className="text-xs font-medium text-pum-text-muted">Área de coordinación</label>
            <input
              id="coord-area"
              name="coordinatorArea" type="text"
              placeholder="Ej. Ciencias Exactas, Humanidades…"
              style={INPUT} className="px-3 py-2 text-sm outline-none"
            />
          </div>

          {/* Docentes a cargo — siempre visible */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="coord-teacher-search" className="text-xs font-medium text-pum-text-muted">
              Docentes a cargo <span className="text-pum-text-disabled font-normal">(opcional)</span>
            </label>

            {/* Buscador */}
            <div className="relative">
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-pum-text-disabled pointer-events-none"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="coord-teacher-search"
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
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-pum-text-disabled hover:text-pum-text cursor-pointer"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
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
          {state && !state.ok && <FormError>{state.error}</FormError>}

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
      )}
    </>
  );
}
