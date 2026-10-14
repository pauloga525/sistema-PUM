"use client";

import { useState, useTransition } from "react";
import { addCoordinatorTeacherAction } from "@/app/(admin)/admin/coordinators/actions";
import { Dialog } from "@/components/ui/Dialog";
import { DialogCloseButton, FormError, INPUT } from "./shared";
import type { TeacherOption } from "./types";

/** Botón + diálogo para agregar un docente a un coordinador existente. */
export function AddTeacherPanel({
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
  const selectId  = `add-teacher-${coordinatorId}`;

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
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Agregar docente
      </button>

      <Dialog open={open} onOpenChange={setOpen} title="Agregar docente" size="sm" dismissible={!isPending}>
        <DialogCloseButton onClick={() => setOpen(false)} />
        <div className="flex flex-col gap-3">
          {available.length === 0 ? (
            <p className="text-sm text-pum-text-muted py-2">Todos los docentes ya están asignados a este coordinador.</p>
          ) : (
            <div className="flex flex-col gap-1">
              <label htmlFor={selectId} className="text-xs font-medium text-pum-text-muted">Docente</label>
              <select
                id={selectId}
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

          {error && <FormError>{error}</FormError>}

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
      </Dialog>
    </>
  );
}
