import type { ExportFormat } from "@/constants/planification";
import type { PlanificationId } from "@/types";

/**
 * Tipos del módulo de exportación de documentos.
 */

/** Parámetros para solicitar la generación de un documento. */
export interface ExportRequest {
  planificationId: PlanificationId;
  format: ExportFormat;
}

/** Resultado de una exportación: buffer en memoria + metadatos. */
export interface ExportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

/** Parámetros para exportación masiva (ZIP). */
export interface BulkExportFilter {
  academicYearId?: string;
  periodId?: string;
  subjectId?: string;
  levelId?: string;
  status?: "DRAFT" | "FINALIZED";
  planIds?: string[];
}

/** Estado de progreso de un job de exportación masiva. */
export interface ExportJobStatus {
  jobId: string;
  total: number;
  processed: number;
  failed: number;
  status: "PENDING" | "RUNNING" | "DONE" | "FAILED";
}
