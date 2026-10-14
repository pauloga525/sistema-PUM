"use client";

import { FeedbackHighlight } from "./FeedbackHighlight";
import { FieldLabel, SectionTitle, TextInput } from "./fields";
import type { SectionProps } from "./types";

/** Identificación de la unidad: área, número y título. */
export function InfoGeneralSection({ form, update, errors, feedback, disabled, required, idPrefix }: SectionProps) {
  const titleId = `${idPrefix}-ident-title`;
  return (
    <section aria-labelledby={titleId}>
      <SectionTitle id={titleId}>Identificación</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <FieldLabel htmlFor={`${idPrefix}-areaEstudio`} required={required}>Área de Estudio</FieldLabel>
          <FeedbackHighlight state={feedback["meta_area"]}>
            <TextInput
              id={`${idPrefix}-areaEstudio`}
              value={form.areaEstudio}
              onChange={(v) => update("areaEstudio", v, "meta_area")}
              placeholder="Ej: Ciencias Naturales"
              disabled={disabled}
              required={required}
              error={errors.areaEstudio}
            />
          </FeedbackHighlight>
        </div>
        <div>
          <FieldLabel htmlFor={`${idPrefix}-numUnidad`} required={required}>N° de Unidad</FieldLabel>
          <FeedbackHighlight state={feedback["meta_unidad"]}>
            <TextInput
              id={`${idPrefix}-numUnidad`}
              value={form.numUnidad}
              onChange={(v) => update("numUnidad", v, "meta_unidad")}
              maxLength={20}
              placeholder="Ej: 1"
              disabled={disabled}
              required={required}
              error={errors.numUnidad}
            />
          </FeedbackHighlight>
        </div>
        <div>
          <FieldLabel htmlFor={`${idPrefix}-titulo`} required={required}>Título de la Unidad</FieldLabel>
          <FeedbackHighlight state={feedback["meta_unidad"]}>
            <TextInput
              id={`${idPrefix}-titulo`}
              value={form.titulo}
              onChange={(v) => update("titulo", v, "meta_unidad")}
              placeholder="Título de la unidad microcurricular"
              disabled={disabled}
              required={required}
              error={errors.titulo}
            />
          </FeedbackHighlight>
        </div>
      </div>
    </section>
  );
}
