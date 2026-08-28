import Link from "next/link";
import { notFound } from "next/navigation";
import { errorMonitorService } from "@/modules/monitoring/error-monitor.service";
import { ErrorResolveAction } from "@/components/superadmin/ErrorResolveAction";
import { ROUTES } from "@/constants/routes";
import { prisma } from "@/lib/prisma/client";

export const metadata = { title: "Detalle de error — SuperAdmin PUM" };

const LEVEL_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  ERROR: { label: "Error",  bg: "#fee2e2", color: "#991b1b" },
  WARN:  { label: "Aviso",  bg: "#fef3c7", color: "#92400e" },
  INFO:  { label: "Info",   bg: "#dbeafe", color: "#1e40af" },
};

function formatDT(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default async function ErrorDetailPage({
  params,
}: {
  params: Promise<{ errorId: string }>;
}) {
  const { errorId } = await params;

  let error;
  try {
    error = await errorMonitorService.getErrorById(errorId);
  } catch {
    notFound();
  }

  const resolverName = error.resolvedBy
    ? (await prisma.user.findUnique({
        where:  { id: error.resolvedBy },
        select: { name: true, email: true },
      }).then((u) => u?.name ?? u?.email ?? error.resolvedBy))
    : null;

  const badge = LEVEL_BADGE[error.level] ?? { label: error.level, bg: "#f3f4f6", color: "#374151" };

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-pum-text-muted">
        <Link href={ROUTES.SUPERADMIN.ERRORS} className="hover:text-pum-text hover:underline underline-offset-2">
          Errores del Sistema
        </Link>
        <span>/</span>
        <span className="text-pum-text font-mono text-xs">{errorId.slice(0, 8)}…</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: badge.bg, color: badge.color }}
            >
              {badge.label}
            </span>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={
                error.resolved
                  ? { background: "#dcfce7", color: "#166534" }
                  : { background: "#fee2e2", color: "#991b1b" }
              }
            >
              {error.resolved ? "Resuelto" : "Pendiente"}
            </span>
          </div>
          <h1 className="text-xl font-semibold text-pum-text mt-2 break-words">{error.message}</h1>
          <p className="text-sm text-pum-text-muted mt-1">
            Módulo: <code className="bg-pum-bg px-1.5 py-0.5 rounded text-xs">{error.source}</code>
            {" · "}
            {formatDT(error.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal — stack trace + metadata */}
        <div className="lg:col-span-2 space-y-5">
          {error.stack && (
            <div className="rounded-xl border border-pum-border bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-pum-border">
                <h2 className="text-sm font-semibold text-pum-text">Stack trace</h2>
              </div>
              <pre className="px-5 py-4 text-xs font-mono text-red-700 bg-red-50 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed max-h-96 overflow-y-auto">
                {error.stack}
              </pre>
            </div>
          )}

          {error.metadata !== null && error.metadata !== undefined && (
            <div className="rounded-xl border border-pum-border bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-pum-border">
                <h2 className="text-sm font-semibold text-pum-text">Contexto adicional</h2>
              </div>
              <pre className="px-5 py-4 text-xs font-mono text-pum-text bg-pum-bg/50 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed max-h-64 overflow-y-auto">
                {JSON.stringify(error.metadata, null, 2)}
              </pre>
            </div>
          )}

          {error.resolved && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
              <h2 className="text-sm font-semibold text-green-800 mb-2">Información de resolución</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex gap-4">
                  <dt className="text-green-700 w-32 flex-shrink-0">Resuelto por</dt>
                  <dd className="text-green-900">{resolverName ?? error.resolvedBy ?? "—"}</dd>
                </div>
                <div className="flex gap-4">
                  <dt className="text-green-700 w-32 flex-shrink-0">Fecha</dt>
                  <dd className="text-green-900">{error.resolvedAt ? formatDT(error.resolvedAt) : "—"}</dd>
                </div>
                {error.resolveNote && (
                  <div className="flex gap-4">
                    <dt className="text-green-700 w-32 flex-shrink-0">Nota</dt>
                    <dd className="text-green-900 italic">&ldquo;{error.resolveNote}&rdquo;</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* Columna lateral — acciones */}
        <div className="space-y-5">
          <ErrorResolveAction errorId={errorId} resolved={error.resolved} />

          <div className="rounded-xl border border-pum-border bg-white p-5">
            <h3 className="text-sm font-semibold text-pum-text mb-3">Identificador</h3>
            <p className="font-mono text-xs text-pum-text-muted break-all">{errorId}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
