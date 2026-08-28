import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { exportService } from "@/modules/export/export.service";
import { rateLimitService } from "@/modules/security/rate-limit.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger/logger";

const log = logger.child("API:export/zip");

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return new NextResponse("No autenticado", { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return new NextResponse("Acceso denegado", { status: 403 });
  }

  // ZIP exports are expensive — 3 per 5 minutes per admin
  const rl = await rateLimitService.check(`export:zip:${session.user.id}`, 3, 5 * 60_000);
  if (!rl.allowed) {
    return new NextResponse("Demasiadas exportaciones ZIP. Intenta en unos minutos.", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000)) },
    });
  }

  const { searchParams } = request.nextUrl;
  const yearId      = searchParams.get("yearId")   ?? undefined;
  const periodId    = searchParams.get("periodId") ?? undefined;
  const status      = (searchParams.get("status") as "FINALIZED" | "DRAFT" | undefined) ?? "FINALIZED";
  const planIdsRaw  = searchParams.get("planIds");
  const planIds     = planIdsRaw ? planIdsRaw.split(",").filter(Boolean) : undefined;

  log.info("zip export request", { yearId, periodId, status, planCount: planIds?.length, adminId: session.user.id });

  try {
    const result = await exportService.buildZip({ academicYearId: yearId, periodId, status, planIds });

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
        "Content-Length": String(result.sizeBytes),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof AppError) {
      log.warn("zip export AppError", { code: e.code, message: e.message });
      return new NextResponse(e.message, { status: e.httpStatus });
    }
    log.error("zip export unexpected error", { error: String(e), stack: e instanceof Error ? e.stack : undefined });
    return new NextResponse("Error interno al generar el ZIP", { status: 500 });
  }
}
