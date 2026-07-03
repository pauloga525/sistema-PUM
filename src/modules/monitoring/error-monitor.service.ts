import { prisma } from "@/lib/prisma/client";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-codes";
import { Prisma } from "@prisma/client";

export type ErrorLevel = "ERROR" | "WARN" | "INFO";

export interface LogErrorInput {
  level:    ErrorLevel;
  source:   string;
  message:  string;
  stack?:   string | null;
  metadata?: Prisma.InputJsonValue | null;
}

export interface ErrorListItem {
  id:         string;
  createdAt:  string;
  level:      string;
  source:     string;
  message:    string;
  resolved:   boolean;
  resolvedAt: string | null;
}

export interface ErrorDetail extends ErrorListItem {
  stack:       string | null;
  metadata:    unknown;
  resolvedBy:  string | null;
  resolveNote: string | null;
}

export interface ErrorFilters {
  level?:    string;
  resolved?: string;  // "true" | "false" | ""
  source?:   string;
  from?:     string;
  to?:       string;
  page?:     number;
}

export interface ErrorStats {
  total:      number;
  errors:     number;
  warnings:   number;
  infos:      number;
  unresolved: number;
  resolved:   number;
}

const PAGE_SIZE = 25;

export const errorMonitorService = {
  async logError(data: LogErrorInput): Promise<void> {
    try {
      await prisma.systemErrorLog.create({
        data: {
          level:    data.level,
          source:   data.source,
          message:  data.message,
          stack:    data.stack ?? null,
          metadata: data.metadata ?? Prisma.JsonNull,
        },
      });
    } catch {
      // Never break the caller — monitoring must be transparent
    }
  },

  async getErrors(
    filters: ErrorFilters = {},
  ): Promise<{ rows: ErrorListItem[]; total: number; pages: number }> {
    const page = Math.max(1, filters.page ?? 1);
    const skip = (page - 1) * PAGE_SIZE;

    const where: Prisma.SystemErrorLogWhereInput = {};
    if (filters.level)  where.level  = filters.level;
    if (filters.source) where.source = { contains: filters.source.trim(), mode: "insensitive" };
    if (filters.resolved === "true")  where.resolved = true;
    if (filters.resolved === "false") where.resolved = false;

    if (filters.from || filters.to) {
      const range: Prisma.DateTimeFilter = {};
      if (filters.from) range.gte = new Date(filters.from);
      if (filters.to) {
        const d = new Date(filters.to);
        d.setHours(23, 59, 59, 999);
        range.lte = d;
      }
      where.createdAt = range;
    }

    const [total, rows] = await Promise.all([
      prisma.systemErrorLog.count({ where }),
      prisma.systemErrorLog.findMany({
        where,
        skip,
        take:    PAGE_SIZE,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, createdAt: true, level: true, source: true,
          message: true, resolved: true, resolvedAt: true,
        },
      }),
    ]);

    return {
      total,
      pages: Math.ceil(total / PAGE_SIZE),
      rows: rows.map((r) => ({
        id:         r.id,
        createdAt:  r.createdAt.toISOString(),
        level:      r.level,
        source:     r.source,
        message:    r.message,
        resolved:   r.resolved,
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
      })),
    };
  },

  async getErrorById(id: string): Promise<ErrorDetail> {
    const r = await prisma.systemErrorLog.findUnique({ where: { id } });
    if (!r) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "Error no encontrado");
    return {
      id:          r.id,
      createdAt:   r.createdAt.toISOString(),
      level:       r.level,
      source:      r.source,
      message:     r.message,
      stack:       r.stack,
      metadata:    r.metadata,
      resolved:    r.resolved,
      resolvedAt:  r.resolvedAt?.toISOString() ?? null,
      resolvedBy:  r.resolvedBy,
      resolveNote: r.resolveNote,
    };
  },

  async resolveError(resolvedBy: string, errorId: string, note?: string): Promise<void> {
    const err = await prisma.systemErrorLog.findUnique({
      where:  { id: errorId },
      select: { id: true, resolved: true },
    });
    if (!err) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "Error no encontrado");
    if (err.resolved) throw new AppError(ErrorCode.VAL_INVALID_INPUT, "El error ya estaba resuelto");

    await prisma.systemErrorLog.update({
      where: { id: errorId },
      data: {
        resolved:    true,
        resolvedAt:  new Date(),
        resolvedBy,
        resolveNote: note?.trim() || null,
      },
    });
  },

  async reopenError(errorId: string): Promise<void> {
    const err = await prisma.systemErrorLog.findUnique({
      where:  { id: errorId },
      select: { id: true },
    });
    if (!err) throw new AppError(ErrorCode.DB_RECORD_NOT_FOUND, "Error no encontrado");

    await prisma.systemErrorLog.update({
      where: { id: errorId },
      data: {
        resolved:    false,
        resolvedAt:  null,
        resolvedBy:  null,
        resolveNote: null,
      },
    });
  },

  async getStats(): Promise<ErrorStats> {
    const [total, errors, warnings, infos, unresolved] = await Promise.all([
      prisma.systemErrorLog.count(),
      prisma.systemErrorLog.count({ where: { level: "ERROR" } }),
      prisma.systemErrorLog.count({ where: { level: "WARN" } }),
      prisma.systemErrorLog.count({ where: { level: "INFO" } }),
      prisma.systemErrorLog.count({ where: { resolved: false } }),
    ]);
    return { total, errors, warnings, infos, unresolved, resolved: total - unresolved };
  },

  async getSourceOptions(): Promise<string[]> {
    const raw = await prisma.systemErrorLog.findMany({
      distinct: ["source"],
      select:   { source: true },
      orderBy:  { source: "asc" },
    });
    return raw.map((r) => r.source);
  },
};
