"use client";

import { DatePickerInput } from "./DatePickerInput";
import { FeedbackHighlight } from "./FeedbackHighlight";
import { FieldLabel, SectionTitle, TextInput } from "./fields";
import type { SectionProps } from "./types";

/** Periodos, fechas de inicio/fin y ejes transversales. */
export function PlanificacionTemporalSection({ form, update, errors, feedback, disabled, required, idPrefix }: SectionProps) {
  const titleId = `${idPrefix}-temporal-title`;
  return (
    <section aria-labelledby={titleId}>
      <SectionTitle id={titleId}>Planificación temporal</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <FieldLabel htmlFor={`${idPrefix}-nPeriodos`} required={required}>N° de Periodos</FieldLabel>
          <FeedbackHighlight state={feedback["plan_periodos"]}>
            <TextInput
              id={`${idPrefix}-nPeriodos`}
              value={form.nPeriodos}
              onChange={(v) => update("nPeriodos", v, "plan_periodos")}
              placeholder="Ej: 12"
              disabled={disabled}
              required={required}
              error={errors.nPeriodos}
            />
          </FeedbackHighlight>
        </div>
        <div>
          <FieldLabel htmlFor={`${idPrefix}-fechInicio`} required={required}>Fecha de inicio</FieldLabel>
          <FeedbackHighlight state={feedback["plan_periodos"]}>
            <DatePickerInput
              id={`${idPrefix}-fechInicio`}
              value={form.fechInicio}
              onChange={(v) => update("fechInicio", v, "plan_periodos")}
              disabled={disabled}
              required={required}
              error={errors.fechInicio}
            />
          </FeedbackHighlight>
        </div>
        <div>
          <FieldLabel htmlFor={`${idPrefix}-fechFin`} required={required}>Fecha de finalización</FieldLabel>
          <FeedbackHighlight state={feedback["plan_periodos"]}>
            <DatePickerInput
              id={`${idPrefix}-fechFin`}
              value={form.fechFin}
              onChange={(v) => update("fechFin", v, "plan_periodos")}
              disabled={disabled}
              required={required}
              error={errors.fechFin}
            />
          </FeedbackHighlight>
        </div>
        <div>
          <FieldLabel htmlFor={`${idPrefix}-ejes`} required={required}>Ejes Transversales</FieldLabel>
          <FeedbackHighlight state={feedback["plan_ejes"]}>
            <TextInput
              id={`${idPrefix}-ejes`}
              value={form.ejesTransversales}
              onChange={(v) => update("ejesTransversales", v, "plan_ejes")}
              placeholder="Ej: Educación Socioemocional"
              disabled={disabled}
              required={required}
              error={errors.ejesTransversales}
            />
          </FeedbackHighlight>
        </div>
      </div>
    </section>
  );
}
