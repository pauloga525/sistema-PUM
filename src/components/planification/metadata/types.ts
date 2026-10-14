import type { PlanMetadata } from "@/modules/planification/planification.types";
import type { SectionStates } from "@/constants/review";
import type { MetadataErrors } from "./validation";

/** Clave de revisión del coordinador asociada a un bloque del formulario. */
export type FeedbackKey = keyof SectionStates;

/** Actualiza un campo y limpia la observación del coordinador de ese bloque. */
export type UpdateField = <K extends keyof PlanMetadata>(
  key: K,
  value: PlanMetadata[K],
  feedbackKey: FeedbackKey,
) => void;

/** Props comunes de las secciones del formulario. */
export interface SectionProps {
  form: PlanMetadata;
  update: UpdateField;
  errors: MetadataErrors;
  feedback: SectionStates;
  disabled: boolean;
  /** Marca los campos obligatorios para continuar (solo cuando hay paso siguiente). */
  required: boolean;
  /** Prefijo único para los ids de los campos (useId). */
  idPrefix: string;
}
