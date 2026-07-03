"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createTeacherAction,
  type TeacherActionState,
} from "@/app/(admin)/admin/teachers/actions";

const INPUT_STYLE: React.CSSProperties = {
  background:   "rgba(243,244,245,0.90)",
  border:       "1px solid rgba(0,39,83,0.14)",
  borderRadius: "0.625rem",
  color:        "#191c1d",
  width:        "100%",
};

export function CreateTeacherPanel() {
  const [isOpen,  setIsOpen]  = useState(false);
  const [formKey, setFormKey] = useState(0);

  const [state, formAction, isPending] = useActionState<TeacherActionState, FormData>(
    createTeacherAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      setIsOpen(false);
      setFormKey((k) => k + 1);
    }
  }, [state]);

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
        Nuevo docente
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{
              background: "rgba(255,255,255,0.97)",
              border:     "1px solid rgba(195,198,210,0.80)",
              boxShadow:  "0 16px 48px rgba(0,39,83,0.18), inset 0 1px 0 rgba(255,255,255,0.90)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-pum-text">Nuevo docente</h2>
                <p className="text-xs text-pum-text-muted mt-0.5">
                  La contraseña inicial será el número de cédula.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-pum-text-disabled hover:text-pum-text cursor-pointer"
                aria-label="Cerrar"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form key={formKey} action={formAction} className="flex flex-col gap-4">
              {/* Datos personales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-pum-text-muted">Nombre completo</label>
                  <input
                    name="name" type="text" required
                    placeholder="Ej. María García López"
                    style={INPUT_STYLE} className="px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-pum-text-muted">Número de cédula</label>
                  <input
                    name="cedula" type="text" required
                    placeholder="1234567890"
                    pattern="\d{10}" title="Debe tener exactamente 10 dígitos" maxLength={10}
                    style={INPUT_STYLE} className="px-3 py-2 text-sm outline-none"
                  />
                  <p className="text-[11px] text-pum-text-disabled">10 dígitos — contraseña inicial</p>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-pum-text-muted">Correo institucional</label>
                <input
                  name="email" type="email" required
                  placeholder="docente@uets.edu.ec"
                  pattern="^[^@]+@uets\.edu\.ec$" title="Debe ser un correo @uets.edu.ec"
                  style={INPUT_STYLE} className="px-3 py-2 text-sm outline-none"
                />
                <p className="text-[11px] text-pum-text-disabled">Debe terminar en @uets.edu.ec</p>
              </div>

              {/* Error */}
              {state?.error && (
                <p
                  className="text-xs font-medium rounded-lg px-3 py-2"
                  style={{ background: "#ffdad6", color: "#ba1a1a" }}
                >
                  {state.error}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-pum-text-muted hover:text-pum-text cursor-pointer px-3 py-1.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="pum-navy-btn text-sm font-semibold text-white px-5 py-2 rounded-xl cursor-pointer disabled:opacity-60"
                >
                  {isPending ? "Creando…" : "Crear docente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
