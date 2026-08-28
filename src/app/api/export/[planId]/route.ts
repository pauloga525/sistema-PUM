import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { exportService } from "@/modules/export/export.service";
import { rateLimitService } from "@/modules/security/rate-limit.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger/logger";
import type { ExportFormat } from "@/constants/planification";

const log = logger.child("API:export");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;

  const session = await auth();
  if (!session) {
    return new NextResponse("No autenticado", { status: 401 });
  }

  const rl = await rateLimitService.check(`export:single:${session.user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return new NextResponse("Demasiadas solicitudes de exportación. Intenta más tarde.", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000)) },
    });
  }

  const format = request.nextUrl.searchParams.get("format") as ExportFormat | null;
  if (!format || !["docx", "pdf"].includes(format)) {
    return new NextResponse('Parámetro "format" inválido. Usa: docx', { status: 400 });
  }

  try {
    log.info("export request", { planId, format, userId: session.user.id });

    const bypassOwnershipCheck = ["ADMIN", "COORDINATOR", "SUPERADMIN"].includes(session.user.role ?? "");

    const result = await exportService.build(
      { planificationId: planId, format },
      session.user.id,
      bypassOwnershipCheck
    );

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
      log.warn("export AppError", { code: e.code, message: e.message });
      return new NextResponse(e.message, { status: e.httpStatus });
    }
    log.error("export unexpected error", { error: String(e), stack: e instanceof Error ? e.stack : undefined });
    return new NextResponse("Error interno al generar el documento", { status: 500 });
  }
}
