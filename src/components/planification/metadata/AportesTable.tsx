"use client";

import type { AporteMultimodal } from "@/modules/planification/planification.types";
import type { SectionState, SectionStates } from "@/constants/review";
import { FeedbackHighlight } from "./FeedbackHighlight";
import { describedBy, FieldError, inputClass, SectionTitle } from "./fields";

const APORTE_COLS = [
  { field: "dim"    as const, key: "aportes_dim"   as const, label: "Dimensión y Opción Transversal",         placeholder: "Dimensión..." },
  { field: "aporte" as const, key: "aportes_nivel" as const, label: "Aporte Multimodal del Nivel / Subnivel", placeholder: "Aporte..." },
  { field: "como"   as const, key: "aportes_como"  as const, label: "¿Cómo van a aprender?",                  placeholder: "¿Cómo?" },
];

/** Clave de revisión del coordinador para cada columna. */
export function aporteFeedbackKey(field: keyof AporteMultimodal): keyof SectionStates {
  return APORTE_COLS.find((c) => c.field === field)!.key;
}

/** Borde de la celda según la revisión de su columna (tiene prioridad sobre el foco). */
function feedbackBorder(state?: SectionState): string | undefined {
  const hasComment = !!state?.comment?.trim();
  if (hasComment) return "border-[#f97316] focus:border-[#f97316]";
  if (state?.approved) return "border-[#22c55e] focus:border-[#22c55e]";
  return undefined;
}

/** Tabla fija de aportes multimodales (6 filas × 3 columnas). */
export function AportesTable({
  aportes,
  onChange,
  feedback,
  disabled,
  error,
  idPrefix,
}: {
  aportes: AporteMultimodal[];
  onChange: (index: number, field: keyof AporteMultimodal, value: string) => void;
  feedback: SectionStates;
  disabled: boolean;
  error?: string;
  idPrefix: string;
}) {
  const titleId = `${idPrefix}-aportes-title`;
  const errorId = `${idPrefix}-aportes-error`;

  return (
    <section aria-labelledby={titleId}>
      <SectionTitle id={titleId}>Aportes Multimodales a Desarrollar</SectionTitle>
      <div
        role="table"
        aria-labelledby={titleId}
        aria-describedby={describedBy(!!error && errorId)}
        className="overflow-hidden rounded-[0.625rem] border border-[rgba(0,39,83,0.10)]"
      >
        <div role="row" className="grid grid-cols-3 bg-[rgba(0,39,83,0.05)] text-[11px] font-bold uppercase tracking-wide text-[#5A6A82]">
          {APORTE_COLS.map(({ key, label }) => (
            <div key={key} role="columnheader" className="px-3 py-2">
              <FeedbackHighlight state={feedback[key]}>
                <span>{label}</span>
              </FeedbackHighlight>
            </div>
          ))}
        </div>
        {aportes.map((ap, i) => (
          <div
            key={i}
            role="row"
            className={`grid grid-cols-3 gap-2 px-3 py-2 border-t border-[rgba(0,39,83,0.06)] ${i % 2 === 1 ? "bg-[rgba(0,39,83,0.025)]" : "bg-transparent"}`}
          >
            {APORTE_COLS.map(({ field, key, label, placeholder }) => (
              <div key={field} role="cell">
                <input
                  type="text"
                  value={ap[field]}
                  onChange={(e) => onChange(i, field, e.target.value)}
                  placeholder={placeholder}
                  disabled={disabled}
                  aria-label={`${label}, fila ${i + 1}`}
                  className={inputClass({ className: feedbackBorder(feedback[key]) })}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      <FieldError id={errorId} className="mt-1">{error}</FieldError>
    </section>
  );
}
