"use client";

import { FeedbackHighlight } from "./FeedbackHighlight";
import { StringListEditor } from "./fields";
import type { SectionProps } from "./types";

/** Objetivos de la unidad y criterios de evaluación (listas editables). */
export function ObjetivosSection({ form, update, errors, feedback, disabled, required, idPrefix }: SectionProps) {
  return (
    <section aria-label="Objetivos y criterios de evaluación">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FeedbackHighlight state={feedback["meta_objetivos"]}>
          <StringListEditor
            id={`${idPrefix}-objetivos`}
            label="Objetivos de la Unidad"
            itemLabel="Objetivo"
            items={form.objetivos}
            onChange={(v) => update("objetivos", v, "meta_objetivos")}
            placeholder="Escribir objetivo..."
            disabled={disabled}
            required={required}
            error={errors.objetivos}
          />
        </FeedbackHighlight>
        <FeedbackHighlight state={feedback["meta_criterios"]}>
          <StringListEditor
            id={`${idPrefix}-criterios`}
            label="Criterios de Evaluación"
            itemLabel="Criterio"
            items={form.criterios}
            onChange={(v) => update("criterios", v, "meta_criterios")}
            placeholder="Escribir criterio..."
            disabled={disabled}
            required={required}
            error={errors.criterios}
          />
        </FeedbackHighlight>
      </div>
    </section>
  );
}
