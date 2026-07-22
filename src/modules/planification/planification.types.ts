import type {
  PlanificationId,
  UserId,
  SubjectId,
  LevelId,
  AcademicYearId,
  PeriodId,
} from "@/types";
import type { PlanificationStatus } from "@/constants/planification";

// ── Metadatos de la Unidad Microcurricular ────────────────────────────────────

export interface AporteMultimodal {
  dim: string;    // Dimensión y Opción Transversal
  aporte: string; // Aporte Multimodal del Nivel / Subnivel
  como: string;   // ¿Cómo van a aprender?
}

/** Campos del encabezado del documento PUM (sección Datos Informativos + Planificación). */
export interface PlanMetadata {
  areaEstudio: string;
  numUnidad: string;
  titulo: string;
  objetivos: string[];      // bullets en la celda "Objetivos de la Unidad"
  criterios: string[];      // bullets en la celda "Criterios de Evaluación"
  nPeriodos: string;
  fechInicio: string;
  fechFin: string;
  ejesTransversales: string; // texto libre (e.g., "Educación Socioemocional")
  aportes: AporteMultimodal[]; // máximo 6
  p1: DuaSelection | null;
  p2: DuaSelection | null;
  p3: DuaSelection | null;
  // Override manual del docente cuando el coordinador solicita corrección de nivel
  nivelSubnivelOverride?: string;
  nivelGradoOverride?: string;
}

// ── Tipos del editor PUM ───────────────────────────────────────────────────────

/** ID de uno de los 34 ejes/íconos (10 institucionales + 24 ERE). */
export type EjeTransversalId =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17
  | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27
  | 28 | 29 | 30 | 31 | 32 | 33 | 34;

/** Una entrada de Destreza con Criterio de Desempeño con sus iconos. */
export interface DcdItem {
  text: string;
  ejes: EjeTransversalId[];
}

/** Selección DUA: lista de pautas con sus sub-pautas seleccionadas.
 *  Permite seleccionar sub-pautas de múltiples pautas dentro del mismo principio. */
export type DuaSelection = Array<{ pauta: number; subPautas: number[] }>;

/** Icono de principio pedagógico: P1–P3 con selecciones multi-pauta. */
export interface PrincipioIcon {
  principio: 1 | 2 | 3;
  selections: DuaSelection; // pautas seleccionadas, cada una con sus sub-pautas
}

/** Formatea el código de badge.
 *  Una pauta:      P2:1  |  P2:1(3)  |  P2:1(2,3)
 *  Varias pautas:  P2:{1(2,3)}{2(1,4)}
 */
export function formatPrincipioLabel(p: PrincipioIcon): string {
  const { principio, selections } = p;
  if (!selections || selections.length === 0) return `P${principio}`;
  const sorted = [...selections].sort((a, b) => a.pauta - b.pauta);
  if (sorted.length === 1) {
    const { pauta, subPautas } = sorted[0];
    if (!subPautas || subPautas.length === 0) return `P${principio}:${pauta}`;
    const sub = subPautas.length === 1 ? `${subPautas[0]}` : `(${subPautas.join(",")})`;
    return `P${principio}:${pauta}${sub}`;
  }
  const parts = sorted.map(({ pauta, subPautas }) => {
    if (!subPautas || subPautas.length === 0) return `{${pauta}}`;
    return `{${pauta}(${subPautas.join(",")})}`;
  });
  return `P${principio}:${parts.join("")}`;
}

/** Un ítem de la columna "¿Cómo van a aprender?" con sus principios DUA opcionales. */
export interface MethodologySubItem {
  text: string;
  principles: PrincipioIcon[]; // hasta 3 (uno por P1/P2/P3)
}

/** Estructura de datos de una fila PUM (guardada como JSON en la BD). */
export interface PumRowData {
  dcdItems: DcdItem[];
  indicators: string[];
  methodologyItems: MethodologySubItem[];
  resources: MethodologySubItem[];
  evaluations: string[];
}

/** Una fila de la tabla PUM. */
export interface PlanificationRow {
  id: string;
  rowIndex: number;
  data: PumRowData;
}

/** Docente vinculado a una planificación. */
export interface PlanTeacher {
  id: string;
  name: string | null;
  isEditor: boolean;
}

/** Planificación PUM completa con metadatos y filas. */
export interface Planification {
  id: PlanificationId;
  academicYearId: AcademicYearId;
  periodId: PeriodId;
  subjectId: SubjectId;
  levelId: LevelId;
  status: PlanificationStatus;
  rows: PlanificationRow[];
  metadata: PlanMetadata | null;
  editDeadlineAt: Date | null;
  finalizedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Docentes vinculados; incluido el editor. */
  teachers: PlanTeacher[];
  /** True si el usuario que solicitó getById es el editor del plan. */
  isEditor: boolean;
  /** Nombre del docente que creó/edita el plan. */
  editorName: string | null;
}

/** Resumen de planificación para listas. */
export interface PlanificationSummary {
  id: PlanificationId;
  subjectName: string;
  levelName: string;
  status: PlanificationStatus;
  editDeadlineAt: Date | null;
  finalizedAt: Date | null;
  rowCount: number;
}

/** Año lectivo con conteo de asignaciones del docente. */
export interface YearSummary {
  id: string;
  label: string;
  yearStart: number;
  active: boolean;
  assignmentCount: number;
}

/** Período dentro de un año con progreso de planificaciones. */
export interface PeriodSummary {
  id: string;
  name: string;
  number: number;
  finalizedCount: number;
  totalCount: number;
}

/** Estado visual calculado en UI (OVERDUE no existe en BD). */
export type DisplayStatus = "NOT_STARTED" | "DRAFT" | "FINALIZED" | "OVERDUE" | "FEEDBACK_RECEIVED" | "APPROVED";

/** Asignación del docente con el estado de su planificación para un período. */
export interface SubjectWithStatus {
  assignmentId: string;
  subject: { id: string; name: string; code: string };
  level: { id: string; name: string; code: string; track: string; orderIndex: number };
  planification: {
    id: string;
    status: PlanificationStatus;
    editDeadlineAt: Date | null;
    finalizedAt: Date | null;
  } | null;
  displayStatus: DisplayStatus;
}

/** Estado de planificación de una materia para un trimestre concreto. */
export interface PeriodPlanStatus {
  periodId:       string;
  periodName:     string;
  periodNumber:   number;
  planId:         string | null;
  planStatus:     "DRAFT" | "FINALIZED" | "FEEDBACK_RECEIVED" | "APPROVED" | "PENDING_SIGNATURE" | "SIGNED" | "ADMIN_REJECTED" | null;
  editDeadlineAt: Date | null;
  displayStatus:  DisplayStatus;
}

/** Vista anual de una materia: muestra todos los trimestres en una sola tarjeta. */
export interface SubjectYearSummary {
  subjectId:       string;
  subjectName:     string;
  subjectCode:     string;
  levelId:         string;
  levelName:       string;
  levelCode:       string;
  levelOrderIndex: number;
  periods:         PeriodPlanStatus[];
}
