import { ZipArchive } from "archiver";
import { Readable } from "node:stream";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";
import { logger } from "@/lib/logger/logger";
import { prisma } from "@/lib/prisma/client";
import { planificationService } from "@/modules/planification/planification.service";
import { auditService } from "@/modules/audit/audit.service";
import { docxBuilder } from "./docx-builder";
import { buildPdfBuffer } from "./pdf-builder";
import { appConfig } from "@/config/app.config";
import type { ExportRequest, ExportResult, BulkExportFilter } from "./export.types";

const log = logger.child("ExportService");

export class ExportService {
  /** Genera un DOCX/PDF para una planificación. bypassOwnershipCheck omite verificación de pertenencia (para admin/coordinator). */
  async build(request: ExportRequest, userId: string, bypassOwnershipCheck = false): Promise<ExportResult> {
    log.info("build", { planId: request.planificationId, format: request.format });

    if (!["docx", "pdf"].includes(request.format)) {
      throw new AppError(
        ErrorCode.EXPORT_FORMAT_UNSUPPORTED,
        `Formato "${request.format}" no soportado. Usa: docx, pdf.`
      );
    }

    const plan = bypassOwnershipCheck
      ? await planificationService.getByIdUnchecked(request.planificationId)
      : await planificationService.getById(request.planificationId, userId);

    const [subject, level, year, period] = await Promise.all([
      prisma.subject.findUnique({ where: { id: plan.subjectId } }),
      prisma.level.findUnique({ where: { id: plan.levelId } }),
      prisma.academicYear.findUnique({ where: { id: plan.academicYearId } }),
      prisma.period.findUnique({ where: { id: plan.periodId } }),
    ]);

    if (!subject || !level || !year || !period) {
      throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "Datos académicos incompletos");
    }

    const teacherNames = plan.teachers.map((t) => t.name ?? "Docente").join(", ");

    const ctx = {
      institutionName:  appConfig.institutionName,
      teacherName:      teacherNames,
      subjectName:      subject.name,
      levelName:        level.name,
      levelTrack:       level.track,
      levelOrderIndex:  level.orderIndex,
      yearLabel:        year.label,
      periodName:       period.name,
      metadata:         plan.metadata,
    };

    const safeName = [subject.name, level.code, year.label, period.number]
      .join("_")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9_\-]/g, "");

    const signatureBlock = plan.status === "SIGNED"
      ? await auditService.getSignatureBlock(request.planificationId)
      : null;

    if (request.format === "pdf") {
      const buffer = await buildPdfBuffer(plan, ctx, signatureBlock);
      return {
        buffer,
        filename: `PUM_${safeName}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: buffer.byteLength,
      };
    }

    const buffer = await docxBuilder.build(plan, ctx, signatureBlock);
    return {
      buffer,
      filename: `PUM_${safeName}.docx`,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: buffer.byteLength,
    };
  }

  /**
   * Prepara un ZIP con los DOCX de las planificaciones que coincidan con el
   * filtro. Los errores de validación (sin resultados, demasiados PUM) se
   * lanzan aquí, antes de empezar a responder; los documentos se generan de a
   * uno mientras el ZIP se envía, sin acumular el archivo completo en memoria.
   */
  async streamZip(filter: BulkExportFilter): Promise<ZipStreamResult> {
    log.info("streamZip", { yearId: filter.academicYearId, periodId: filter.periodId, status: filter.status });

    const where = filter.planIds?.length
      ? { id: { in: filter.planIds } }
      : {
          status: filter.status ?? "FINALIZED",
          ...(filter.academicYearId && { academicYearId: filter.academicYearId }),
          ...(filter.periodId       && { periodId:       filter.periodId }),
          ...(filter.subjectId      && { subjectId:      filter.subjectId }),
          ...(filter.levelId        && { levelId:        filter.levelId }),
        };

    const rawPlans = await prisma.planification.findMany({
      where,
      select: { id: true, subjectId: true, levelId: true, academicYearId: true, periodId: true },
      take: MAX_ZIP_PLANS + 1,
    });

    if (rawPlans.length === 0) {
      throw new AppError(
        ErrorCode.DB_RECORD_NOT_FOUND,
        "No hay planificaciones finalizadas para exportar con los filtros indicados."
      );
    }
    if (rawPlans.length > MAX_ZIP_PLANS) {
      throw new AppError(
        ErrorCode.VAL_INVALID_INPUT,
        `Demasiadas planificaciones para un solo ZIP (máximo ${MAX_ZIP_PLANS}). Filtra por periodo o selecciona menos.`
      );
    }

    // Carga contexto académico en paralelo (una sola ronda de queries)
    const [years, periods, subjects, levels] = await Promise.all([
      prisma.academicYear.findMany({ where: { id: { in: [...new Set(rawPlans.map(p => p.academicYearId))] } } }),
      prisma.period.findMany({ where: { id: { in: [...new Set(rawPlans.map(p => p.periodId))] } } }),
      prisma.subject.findMany({ where: { id: { in: [...new Set(rawPlans.map(p => p.subjectId))] } } }),
      prisma.level.findMany({ where: { id: { in: [...new Set(rawPlans.map(p => p.levelId))] } } }),
    ]);

    const yearMap    = new Map(years.map(y => [y.id, y]));
    const periodMap  = new Map(periods.map(p => [p.id, p]));
    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    const levelMap   = new Map(levels.map(l => [l.id, l]));

    const selectedYear   = filter.academicYearId ? yearMap.get(filter.academicYearId) : undefined;
    const selectedPeriod = filter.periodId ? periodMap.get(filter.periodId) : undefined;
    const filename = ["PUMs", selectedYear?.label, selectedPeriod?.name]
      .filter(Boolean)
      .join("_")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9_\-]/g, "") + ".zip";

    const arc = new ZipArchive({ zlib: { level: 6 } });
    const usedNames = new Set<string>();

    const fill = async () => {
      let count = 0;
      // De a 20 PUM por consulta: acota la memoria de filas cargadas
      for (let i = 0; i < rawPlans.length; i += ZIP_BATCH_SIZE) {
        const batch = rawPlans.slice(i, i + ZIP_BATCH_SIZE);
        const fullPlans = await planificationService.getManyByIdUnchecked(batch.map(p => p.id));
        const planMap = new Map(fullPlans.map(p => [p.id, p]));

        for (const raw of batch) {
          const year    = yearMap.get(raw.academicYearId);
          const period  = periodMap.get(raw.periodId);
          const subject = subjectMap.get(raw.subjectId);
          const level   = levelMap.get(raw.levelId);
          const plan    = planMap.get(raw.id);

          if (!year || !period || !subject || !level || !plan) {
            log.warn("streamZip: contexto académico incompleto, plan omitido", { planId: raw.id });
            continue;
          }

          const buffer = await docxBuilder.build(plan, {
            institutionName:  appConfig.institutionName,
            teacherName:      plan.teachers.map((t) => t.name ?? "Docente").join(", "),
            subjectName:      subject.name,
            levelName:        level.name,
            levelTrack:       level.track,
            levelOrderIndex:  level.orderIndex,
            yearLabel:        year.label,
            periodName:       period.name,
            metadata:         plan.metadata,
          });

          // Materia+nivel se repite entre periodos y años: el nombre los incluye
          const base = `PUM_${subject.code}_${level.code}_P${period.number}_${year.label}`
            .replace(/[^a-zA-Z0-9_\-]/g, "");
          arc.append(buffer, { name: uniqueName(base, usedNames) + ".docx" });
          count++;
        }
      }
      if (count === 0) throw new AppError(ErrorCode.EXPORT_BUILD_FAILED, "No se pudo generar ningún documento.");
      await arc.finalize();
      log.info("streamZip complete", { count });
    };

    fill().catch((e) => {
      log.error("streamZip falló a mitad de la generación", { error: String(e) });
      arc.destroy(e instanceof Error ? e : new Error(String(e)));
    });

    return {
      stream:   Readable.toWeb(arc) as ReadableStream<Uint8Array>,
      filename,
      mimeType: "application/zip",
    };
  }
}

const MAX_ZIP_PLANS  = 300;
const ZIP_BATCH_SIZE = 20;

/** Agrega un sufijo (_2, _3…) si el nombre ya se usó en el ZIP. */
function uniqueName(base: string, used: Set<string>): string {
  let name = base;
  for (let n = 2; used.has(name); n++) name = `${base}_${n}`;
  used.add(name);
  return name;
}

export interface ZipStreamResult {
  stream:   ReadableStream<Uint8Array>;
  filename: string;
  mimeType: string;
}

export const exportService = new ExportService();
