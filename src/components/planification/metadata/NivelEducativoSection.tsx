"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { FeedbackHighlight } from "./FeedbackHighlight";
import { FieldLabel, TextInput } from "./fields";
import type { SectionProps } from "./types";

/**
 * Nivel educativo: se llena según la asignación docente; el docente solo lo
 * edita (override) tras confirmar que su coordinador lo pidió.
 */
export function NivelEducativoSection({
  form,
  update,
  errors,
  feedback,
  disabled,
  idPrefix,
  defaultNivelSub,
  defaultNivelGrado,
}: Omit<SectionProps, "required"> & { defaultNivelSub: string; defaultNivelGrado: string }) {
  const [editing, setEditing]         = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const titleId = `${idPrefix}-nivel-title`;

  return (
    <section aria-labelledby={titleId}>
      <div className="mb-3 flex items-center justify-between">
        <div className="border-l-[3px] border-[rgba(0,39,83,0.20)] pl-[0.625rem]">
          <h3 id={titleId} className="text-[11px] font-bold uppercase tracking-wider text-[#5A6A82]">
            Nivel Educativo
          </h3>
        </div>
        {!disabled && !editing && (
          <button
            type="button"
            onClick={() => setShowWarning(true)}
            aria-label="Editar Nivel Educativo"
            className="flex cursor-pointer items-center gap-1 rounded-md border border-[rgba(0,39,83,0.14)] bg-[rgba(0,39,83,0.06)] px-2.5 py-[3px] text-[11px] font-semibold text-[#002753]"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Editar
          </button>
        )}
        {!disabled && editing && (
          <span className="rounded-md border border-[rgba(249,115,22,0.25)] bg-[rgba(249,115,22,0.10)] px-2.5 py-[3px] text-[11px] font-medium text-[#b45309]">
            Modo edición activo
          </span>
        )}
      </div>

      <FeedbackHighlight state={feedback["meta_nivel"]}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor={`${idPrefix}-nivelSub`}>Subnivel</FieldLabel>
            <TextInput
              id={`${idPrefix}-nivelSub`}
              value={form.nivelSubnivelOverride ?? defaultNivelSub}
              onChange={(v) => update("nivelSubnivelOverride", v, "meta_nivel")}
              placeholder="Ej: Educación Básica"
              disabled={disabled || !editing}
              error={errors.nivelSubnivelOverride}
            />
          </div>
          <div>
            <FieldLabel htmlFor={`${idPrefix}-nivelGrado`}>Grados / Nivel</FieldLabel>
            <TextInput
              id={`${idPrefix}-nivelGrado`}
              value={form.nivelGradoOverride ?? defaultNivelGrado}
              onChange={(v) => update("nivelGradoOverride", v, "meta_nivel")}
              placeholder="Ej: 3ro de Bachillerato"
              disabled={disabled || !editing}
              error={errors.nivelGradoOverride}
            />
          </div>
        </div>
      </FeedbackHighlight>

      <Dialog
        open={showWarning}
        onOpenChange={setShowWarning}
        size="sm"
        title="¿Editar Nivel Educativo?"
        description={
          <>
            Esta información se llena automáticamente según tu asignación docente.
            Edítala <strong>solo si tu coordinador lo ha solicitado</strong>, para poder corregir el subnivel o los grados.
          </>
        }
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowWarning(false)}
            className="rounded-lg border border-[#cbd5e1] bg-[#f1f5f9] px-[18px] py-[7px] text-[13px] font-medium text-[#334155] hover:bg-[#e2e8f0]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => { setShowWarning(false); setEditing(true); }}
            className="rounded-lg bg-[#b45309] px-[18px] py-[7px] text-[13px] font-bold text-white hover:bg-[#92400e]"
          >
            Sí, editar
          </button>
        </div>
      </Dialog>
    </section>
  );
}
