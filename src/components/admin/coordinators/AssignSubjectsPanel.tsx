"use client";

import { useState, useTransition } from "react";
import { setCoordinatorSubjectsAction } from "@/app/(admin)/admin/coordinators/actions";
import { Dialog } from "@/components/ui/Dialog";
import { DialogCloseButton, FormError, INPUT } from "./shared";
import type { SubjectOption } from "./types";

/** Botón + diálogo para asignar materias a un coordinador. */
export function AssignSubjectsPanel({
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

  // El estado se reinicia al abrir (no con un efecto)
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
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Asignar materias"
        description="El coordinador solo podrá asignar estas materias a sus docentes."
        dismissible={!isPending}
      >
        <DialogCloseButton onClick={() => setOpen(false)} />

        {/* Buscador */}
        <div className="relative mb-3">
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-pum-text-disabled pointer-events-none"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre o código…"
            aria-label="Buscar materia"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...INPUT, paddingLeft: "1.75rem" }}
            className="w-full py-1.5 pr-3 text-xs outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-pum-text-disabled hover:text-pum-text cursor-pointer"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
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

        {error && <FormError className="mb-3">{error}</FormError>}

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
      </Dialog>
    </>
  );
}
