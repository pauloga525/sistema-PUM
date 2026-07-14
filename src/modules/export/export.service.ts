import { ZipArchive } from "archiver";
import { Writable } from "stream";
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

  /** Genera un ZIP con los DOCX de todas las planificaciones que coincidan con el filtro. */
  async buildZip(filter: BulkExportFilter): Promise<ExportResult> {
    log.info("buildZip", { yearId: filter.academicYearId, periodId: filter.periodId, status: filter.status });

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
      select: {
        id:             true,
        subjectId:      true,
        levelId:        true,
        academicYearId: true,
        periodId:       true,
      },
    });

    if (rawPlans.length === 0) {
      throw new AppError(
        ErrorCode.DB_RECORD_NOT_FOUND,
        "No hay planificaciones finalizadas para exportar con los filtros indicados."
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

    // Genera un DOCX por planificación (secuencial para no saturar memoria)
    const entries: Array<{ name: string; data: Buffer }> = [];

    for (const raw of rawPlans) {
      const year    = yearMap.get(raw.academicYearId);
      const period  = periodMap.get(raw.periodId);
      const subject = subjectMap.get(raw.subjectId);
      const level   = levelMap.get(raw.levelId);

      if (!year || !period || !subject || !level) {
        log.warn("buildZip: contexto académico incompleto, plan omitido", { planId: raw.id });
        continue;
      }

      const plan = await planificationService.getByIdUnchecked(raw.id);
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

      const buffer = await docxBuilder.build(plan, ctx);

      const safeName = `${subject.code}_${level.code}`
        .replace(/[^a-zA-Z0-9_\-]/g, "");

      entries.push({ name: `PUM_${safeName}.docx`, data: buffer });
    }

    if (entries.length === 0) {
      throw new AppError(ErrorCode.EXPORT_BUILD_FAILED, "No se pudo generar ningún documento.");
    }

    const zipBuffer = await this._zipToBuffer(entries);

    const selectedYear   = filter.academicYearId ? yearMap.get(filter.academicYearId) : undefined;
    const selectedPeriod = filter.periodId ? periodMap.get(filter.periodId) : undefined;
    const zipFilename = ["PUMs", selectedYear?.label, selectedPeriod?.name]
      .filter(Boolean)
      .join("_")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9_\-]/g, "") + ".zip";

    log.info("buildZip complete", { count: entries.length, sizeBytes: zipBuffer.byteLength });

    return {
      buffer: zipBuffer,
      filename: zipFilename,
      mimeType: "application/zip",
      sizeBytes: zipBuffer.byteLength,
    };
  }

  private _zipToBuffer(entries: Array<{ name: string; data: Buffer }>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      const sink = new Writable({
        write(chunk: Buffer, _enc: BufferEncoding, cb: (err?: Error | null) => void) {
          chunks.push(Buffer.from(chunk));
          cb();
        },
      });
      sink.on("finish", () => resolve(Buffer.concat(chunks)));
      sink.on("error", reject);

      const arc = new ZipArchive({ zlib: { level: 6 } });
      arc.on("error", reject);
      arc.pipe(sink);

      for (const { name, data } of entries) {
        arc.append(data, { name });
      }

      arc.finalize();
    });
  }
}

export const exportService = new ExportService();
