/**
 * Constantes del dominio de planificación PUM.
 */

export const PLANIFICATION_STATUS = {
  DRAFT:             "DRAFT",
  PREVIEW:           "PREVIEW",
  FINALIZED:         "FINALIZED",
  OVERDUE:           "OVERDUE",
  FEEDBACK_RECEIVED: "FEEDBACK_RECEIVED",
  APPROVED:          "APPROVED",
  PENDING_SIGNATURE: "PENDING_SIGNATURE",
  SIGNED:            "SIGNED",
  ADMIN_REJECTED:    "ADMIN_REJECTED",
} as const;

export type PlanificationStatus = keyof typeof PLANIFICATION_STATUS;

export const PLANIFICATION_STATUS_LABEL: Record<PlanificationStatus, string> = {
  DRAFT:             "Borrador",
  PREVIEW:           "Vista previa",
  FINALIZED:         "Finalizado",
  OVERDUE:           "Plazo vencido",
  FEEDBACK_RECEIVED: "Con observaciones",
  APPROVED:          "Aprobado",
  PENDING_SIGNATURE: "Pendiente de firma",
  SIGNED:            "Firmado y aprobado",
  ADMIN_REJECTED:    "Rechazado por admin",
};

export const PLANIFICATION_STATUS_COLOR: Record<PlanificationStatus, string> = {
  DRAFT:             "bg-slate-100 text-slate-700",
  PREVIEW:           "bg-blue-100 text-blue-700",
  FINALIZED:         "bg-green-100 text-green-700",
  OVERDUE:           "bg-red-100 text-red-700",
  FEEDBACK_RECEIVED: "bg-orange-50 text-orange-700",
  APPROVED:          "bg-emerald-100 text-emerald-700",
  PENDING_SIGNATURE: "bg-purple-100 text-purple-700",
  SIGNED:            "bg-teal-100 text-teal-700",
  ADMIN_REJECTED:    "bg-red-100 text-red-700",
};

/** Columnas de la tabla PUM con los títulos oficiales. */
export const PUM_COLUMNS = [
  { key: "dcd",          label: "¿Qué van a aprender?",   width: "22%" },
  { key: "indicators",   label: "¿Qué evaluar?",          width: "18%" },
  { key: "methodology",  label: "¿Cómo van a aprender?",  width: "25%" },
  { key: "resources",    label: "Recursos",               width: "13%" },
  { key: "evaluations",  label: "¿Cómo evaluar?",         width: "18%" },
] as const;

export type PumColumnKey = (typeof PUM_COLUMNS)[number]["key"];

export const MAX_PUM_ROWS = 50;

export const EXPORT_FORMATS = ["docx", "pdf"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

// ── Ejes Transversales ────────────────────────────────────────────────────────
// PNGs esperados en: public/icons/ejes-transversales/{file}

export const EJES_TRANSVERSALES = [
  { id: 1  as const, label: "Cívica, Ética e Integridad",     file: "civica-etica-integridad.png",        abbr: "CI" },
  { id: 2  as const, label: "Desarrollo Sostenible",           file: "desarrollo-sostenible.png",           abbr: "DS" },
  { id: 3  as const, label: "Educación Financiera",            file: "educacion-financiera.png",            abbr: "EF" },
  { id: 4  as const, label: "Educación Vial",                  file: "educacion-vial.png",                  abbr: "EV" },
  { id: 5  as const, label: "Educación Socioemocional",        file: "educacion-socioemocional.png",        abbr: "ES" },
  { id: 6  as const, label: "Competencias Comunicacionales",   file: "competencias-comunicacionales.png",   abbr: "CC" },
  { id: 7  as const, label: "Competencias Matemáticas",        file: "competencias-matematicas.png",        abbr: "CM" },
  { id: 8  as const, label: "Competencias Socioemocionales",   file: "competencias-socioemocionales.png",   abbr: "CS" },
  { id: 9  as const, label: "Competencias Digitales",          file: "competencias-digitales.png",          abbr: "CD" },
  { id: 10 as const, label: "Seguridad Integral",              file: "seguridad-integral.png",              abbr: "SI" },
  { id: 11 as const, label: "Poner a la persona en el centro", file: "Poner a la persona en el centro.png",  abbr: "PP" },
  { id: 12 as const, label: "Reducción de las desigualdades",  file: "Reducción de las desigualdades.png",   abbr: "RD" },
] as const;

export const EJES_TRANSVERSALES_PATH = "/icons/ejes-transversales/";

// ── Principios pedagógicos ────────────────────────────────────────────────────
// Cada principio tiene números 1–7 y un color asociado.

export const PRINCIPIO_COLORS: Record<1 | 2 | 3, string> = {
  1: "#059669", // verde
  2: "#7C3AED", // morado
  3: "#0EA5E9", // celeste
};

/** Mismo valor pero sin el # para librerías docx que usan hex crudo. */
export const PRINCIPIO_COLORS_HEX: Record<1 | 2 | 3, string> = {
  1: "059669",
  2: "7C3AED",
  3: "0EA5E9",
};
