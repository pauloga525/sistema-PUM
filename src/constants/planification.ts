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
] as const;

/** Iconos ERE — Valores sociales (7) */
export const ERE_SOCIAL = [
  { id: 11 as const, label: "Poner a la persona en el centro",     file: "1. Poner a la persona en el centro.png",     abbr: "PC" },
  { id: 12 as const, label: "Escuchar a las jóvenes generaciones", file: "2. Esuchar a las jóvenes generaciones.png",  abbr: "EJ" },
  { id: 13 as const, label: "Promover a la mujer",                 file: "3. Promover a la mujer.png",                 abbr: "PM" },
  { id: 14 as const, label: "Responsabilizar a la familia",        file: "4. Responsabilizar a la familia.png",        abbr: "RF" },
  { id: 15 as const, label: "Abrirse a la acogida",                file: "5. Abrirse a la acogida.png",                abbr: "AA" },
  { id: 16 as const, label: "Renovar la economía y la política",   file: "6. Renovar la economía y la política.png",   abbr: "RE" },
  { id: 17 as const, label: "Cuidar la Casa Común",                file: "7. Cuidar la Casa Común.png",                abbr: "CC" },
] as const;

/** Iconos ERE — Objetivos de Desarrollo Sostenible (17) */
export const ERE_ODS = [
  { id: 18 as const, label: "Fin de la pobreza",                       file: "1. Fin de la pobreza.png",                       abbr: "FP" },
  { id: 19 as const, label: "Hambre cero",                             file: "2. Hambre cero.png",                             abbr: "HC" },
  { id: 20 as const, label: "Salud y Bienestar",                       file: "3. Salud y Bienestar.png",                       abbr: "SB" },
  { id: 21 as const, label: "Educación de Calidad",                    file: "4. Educación de Calidad.png",                    abbr: "EC" },
  { id: 22 as const, label: "Igualdad de género",                      file: "5. Igualdad de género.png",                      abbr: "IG" },
  { id: 23 as const, label: "Agua limpia y saneamiento",               file: "6. Agua limpia y sanamiento.png",                abbr: "AL" },
  { id: 24 as const, label: "Energía asequible y no contaminante",     file: "7. Energía asequible y no contaminante.png",     abbr: "EN" },
  { id: 25 as const, label: "Trabajo decente",                         file: "8. Trabajo decente.png",                         abbr: "TD" },
  { id: 26 as const, label: "Industria e innovación",                  file: "9. Industria e innovación.png",                  abbr: "II" },
  { id: 27 as const, label: "Reducción de las desigualdades",          file: "10. Reducción de las desigualdades.png",         abbr: "RD" },
  { id: 28 as const, label: "Ciudades y comunidades sostenibles",      file: "11. Ciudades y comunidades sostenibles.png",     abbr: "CS" },
  { id: 29 as const, label: "Producción y consumo responsable",        file: "12. Producción y consumismo responsable.png",    abbr: "PR" },
  { id: 30 as const, label: "Acción por el clima",                     file: "13. Acción por el clima.png",                    abbr: "AC" },
  { id: 31 as const, label: "Vida submarina",                          file: "14. Vida submarina.png",                         abbr: "VS" },
  { id: 32 as const, label: "Vida de ecosistemas terrestres",          file: "15. Vida de ecosistemas terrestres.png",         abbr: "VE" },
  { id: 33 as const, label: "Paz - Justicia",                          file: "16. Paz - Justicia.png",                         abbr: "PJ" },
  { id: 34 as const, label: "Alianzas para lograr objetivos",          file: "17. Alianzas para lograr objetivos.png",         abbr: "AP" },
] as const;

/** Todos los ejes (principales + ERE) — usar para lookups por ID */
export const ALL_EJES = [...EJES_TRANSVERSALES, ...ERE_SOCIAL, ...ERE_ODS] as const;

export const EJES_TRANSVERSALES_PATH = "/icons/ejes-transversales/";

// ── Diseño Universal del Aprendizaje (DUA) ───────────────────────────────────

export const DUA_PRINCIPIOS = [
  {
    key:   "p1" as const,
    num:   1 as const,
    label: "P I: PROVEER MÚLTIPLES FORMAS DE REPRESENTACIÓN",
    pautas: [
      {
        num:   1,
        label: "Pauta 1: Proporcionar opciones de percepción",
        subPautas: [
          { num: 1, label: "Personalizar la visualización de la información" },
          { num: 2, label: "Proveer alternativas de información auditiva" },
          { num: 3, label: "Proveer alternativas de información visual" },
        ],
      },
      {
        num:   2,
        label: "Pauta 2: Proporcionar las opciones de lenguaje y los símbolos",
        subPautas: [
          { num: 1, label: "Definir el vocabulario y los símbolos" },
          { num: 2, label: "Clarificar la sintaxis y la estructura" },
          { num: 3, label: "Decodificar el texto y notaciones matemáticas" },
          { num: 4, label: "Promover entendimientos más allá de las diferentes lenguas en el aula" },
          { num: 5, label: "Ilustrar conceptos claves no lingüísticos" },
        ],
      },
      {
        num:   3,
        label: "Pauta 3: Proporcionar las opciones de la comprensión",
        subPautas: [
          { num: 1, label: "Proveer o activar conocimiento anterior" },
          { num: 2, label: "Remarcar conceptos, ideas y relaciones importantes" },
          { num: 3, label: "Guiar el proceso de la información" },
          { num: 4, label: "Apoyar la memoria y transferencias" },
        ],
      },
    ],
  },
  {
    key:   "p2" as const,
    num:   2 as const,
    label: "P II: OFRECER MÚLTIPLES MEDIOS PARA LA ACCIÓN Y EXPRESIÓN",
    pautas: [
      {
        num:   1,
        label: "Pauta 1: Proporcionar opciones para la acción física",
        subPautas: [
          { num: 1, label: "Proveer diferentes maneras de responder" },
          { num: 2, label: "Proveer diferentes maneras de interactuar con el material" },
          { num: 3, label: "Integrar asistencia de tecnología" },
        ],
      },
      {
        num:   2,
        label: "Pauta 2: Proporcionar opciones de habilidades expresivas y la fluidez",
        subPautas: [
          { num: 1, label: "Permitir opciones de formas de comunicación" },
          { num: 2, label: "Proveer herramientas para la composición y resolución de problemas" },
          { num: 3, label: "Proveer formas de andamio y desempeño" },
        ],
      },
      {
        num:   3,
        label: "Pauta 3: Proporcionar opciones para las funciones ejecutivas",
        subPautas: [
          { num: 1, label: "Guiar las metas efectivamente" },
          { num: 2, label: "Dar sustento a planes y estrategias que se están formando" },
          { num: 3, label: "Facilitar el manejo de información y recursos" },
          { num: 4, label: "Mejorar la capacidad para el proceso del monitoreo" },
        ],
      },
    ],
  },
  {
    key:   "p3" as const,
    num:   3 as const,
    label: "P III: PROPORCIONAR MÚLTIPLES MEDIOS PARA LA MOTIVACIÓN E IMPLICACIÓN EN EL APRENDIZAJE",
    pautas: [
      {
        num:   1,
        label: "Pauta 1: Ofrecer opciones para reclutar el interés",
        subPautas: [
          { num: 1, label: "Aumentar las opciones individuales y de autonomía" },
          { num: 2, label: "Mejorar la importancia, valor, y autenticidad" },
          { num: 3, label: "Reducir las amenazas y distracciones" },
        ],
      },
      {
        num:   2,
        label: "Pauta 2: Proporcionar opciones para mantener el esfuerzo y la persistencia",
        subPautas: [
          { num: 1, label: "Aumentar la prominencia de metas y objetivos" },
          { num: 2, label: "Variar los niveles de dificultad y apoyo" },
          { num: 3, label: "Proporcionar colaboración y comunicación" },
          { num: 4, label: "Incrementar el dominio de la retroalimentación orientada" },
        ],
      },
      {
        num:   3,
        label: "Pauta 3: Proporcionar opciones para la autorregulación",
        subPautas: [
          { num: 1, label: "Guiar metas personales y expectaciones" },
          { num: 2, label: "Habilidades de afrontamiento y estrategias de andamios" },
          { num: 3, label: "Crear evaluaciones propias y reflexión" },
        ],
      },
    ],
  },
] as const;

export type DuaPrincipio = (typeof DUA_PRINCIPIOS)[number];
export type DuaPauta     = DuaPrincipio["pautas"][number];

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
