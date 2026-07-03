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
  p1Pautas: string[];
  p2Pautas: string[];
  p3Pautas: string[];
}

// ── Tipos del editor PUM ───────────────────────────────────────────────────────

/** ID de uno de los 10 ejes transversales institucionales. */
export type EjeTransversalId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** Icono de principio pedagógico: P1–P3 con una o varias pautas seleccionadas. */
export interface PrincipioIcon {
  principio: 1 | 2 | 3;
  numeros: number[]; // indices 1-based de las pautas seleccionadas dentro del principio
}

/** Un ítem de la columna "¿Cómo van a aprender?" con su principio opcional. */
export interface MethodologySubItem {
  text: string;
  principle: PrincipioIcon | null;
}

/** Estructura de datos de una fila PUM (guardada como JSON en la BD). */
export interface PumRowData {
  dcd: string;
  ejeTransversales: EjeTransversalId[];
  indicators: string[];
  methodologyItems: MethodologySubItem[];
  resources: string[];
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
