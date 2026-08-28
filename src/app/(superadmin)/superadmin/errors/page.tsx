import Link from "next/link";
import { errorMonitorService } from "@/modules/monitoring/error-monitor.service";
import { ROUTES } from "@/constants/routes";

export const metadata = { title: "Errores del Sistema — SuperAdmin PUM" };

const LEVEL_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  ERROR: { label: "Error",     bg: "#fee2e2", color: "#991b1b" },
  WARN:  { label: "Aviso",     bg: "#fef3c7", color: "#92400e" },
  INFO:  { label: "Info",      bg: "#dbeafe", color: "#1e40af" },
};

function formatDT(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function pageUrl(
  base: string,
  params: Record<string, string>,
  overrides: Record<string, string>,
) {
  const p = new URLSearchParams({ ...params, ...overrides });
  for (const [k, v] of [...p.entries()]) {
    if (!v || (k === "page" && v === "1")) p.delete(k);
  }
  const s = p.toString();
  return base + (s ? `?${s}` : "");
}

export default async function ErrorsPage({
  searchParams,
}: {
  searchParams: Promise<{
    level?: string; resolved?: string; source?: string;
    from?: string; to?: string; page?: string;
  }>;
}) {
  const sp       = await searchParams;
  const level    = sp.level    ?? "";
  const resolved = sp.resolved ?? "";
  const source   = sp.source   ?? "";
  const from     = sp.from     ?? "";
  const to       = sp.to       ?? "";
  const page     = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const base    = ROUTES.SUPERADMIN.ERRORS;
  const current = { level, resolved, source, from, to, page: String(page) };

  const [{ rows, total, pages }, stats, sourceOptions] = await Promise.all([
    errorMonitorService.getErrors({
      level:    level    || undefined,
      resolved: resolved || undefined,
      source:   source   || undefined,
      from:     from     || undefined,
      to:       to       || undefined,
      page,
    }),
    errorMonitorService.getStats(),
    errorMonitorService.getSourceOptions(),
  ]);

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-pum-text">Errores del Sistema</h1>
        <p className="text-sm text-pum-text-muted mt-1">
          Monitoreo de excepciones y fallos capturados en producción.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Total",         value: stats.total,      color: "#374151" },
          { label: "Errores",       value: stats.errors,     color: "#991b1b" },
          { label: "Avisos",        value: stats.warnings,   color: "#92400e" },
          { label: "Info",          value: stats.infos,      color: "#1e40af" },
          { label: "Sin resolver",  value: stats.unresolved, color: "#7c3aed" },
          { label: "Resueltos",     value: stats.resolved,   color: "#166534" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-pum-border bg-white p-4 text-center">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs text-pum-text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <form method="GET" className="flex flex-wrap gap-3 mb-6">
        <select
          name="level"
          defaultValue={level}
          className="border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="">Todos los niveles</option>
          <option value="ERROR">Error</option>
          <option value="WARN">Aviso</option>
          <option value="INFO">Info</option>
        </select>
        <select
          name="resolved"
          defaultValue={resolved}
          className="border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="">Todos</option>
          <option value="false">Sin resolver</option>
          <option value="true">Resueltos</option>
        </select>
        {sourceOptions.length > 0 && (
          <select
            name="source"
            defaultValue={source}
            className="border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            <option value="">Todos los módulos</option>
            {sourceOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
        <input
          type="date" name="from" defaultValue={from} title="Desde"
          className="border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        <input
          type="date" name="to" defaultValue={to} title="Hasta"
          className="border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "#4c1d95" }}
        >
          Filtrar
        </button>
        {(level || resolved || source || from || to) && (
          <Link
            href={base}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-pum-border text-pum-text hover:bg-pum-bg/50 transition-colors"
          >
            Limpiar
          </Link>
        )}
      </form>

      <p className="text-xs text-pum-text-muted mb-3">
        {total.toLocaleString("es-EC")} error{total !== 1 ? "es" : ""} encontrado{total !== 1 ? "s" : ""}
        {pages > 1 ? ` · Página ${page} de ${pages}` : ""}
      </p>

      {/* Tabla */}
      <div className="rounded-xl border border-pum-border overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background: "#f5f0ff" }}>
              {["Fecha", "Nivel", "Módulo / Fuente", "Mensaje", "Estado", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-pum-text-muted first:pl-5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-pum-text-muted">
                  {stats.total === 0
                    ? "No se han registrado errores en el sistema."
                    : "No se encontraron errores con esos filtros."}
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const badge = LEVEL_BADGE[r.level] ?? { label: r.level, bg: "#f3f4f6", color: "#374151" };
              return (
                <tr key={r.id} className="border-t border-pum-border hover:bg-pum-bg/20 transition-colors">
                  <td className="px-4 pl-5 py-3 text-xs text-pum-text-muted whitespace-nowrap">
                    {formatDT(r.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-pum-bg px-1.5 py-0.5 rounded text-pum-text">{r.source}</code>
                  </td>
                  <td className="px-4 py-3 max-w-[300px]">
                    <p className="text-sm text-pum-text line-clamp-2" title={r.message}>{r.message}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={
                        r.resolved
                          ? { background: "#dcfce7", color: "#166534" }
                          : { background: "#fee2e2", color: "#991b1b" }
                      }
                    >
                      {r.resolved ? "Resuelto" : "Pendiente"}
                    </span>
                  </td>
                  <td className="px-4 pr-5 py-3 text-right">
                    <Link
                      href={ROUTES.SUPERADMIN.error(r.id)}
                      className="text-xs font-medium text-violet-700 hover:underline underline-offset-2"
                    >
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {page > 1 && (
            <Link
              href={pageUrl(base, current, { page: String(page - 1) })}
              className="px-3 py-1.5 text-sm rounded-lg border border-pum-border hover:bg-pum-bg/50 transition-colors"
            >
              ← Anterior
            </Link>
          )}
          <span className="text-sm text-pum-text-muted">Página {page} de {pages}</span>
          {page < pages && (
            <Link
              href={pageUrl(base, current, { page: String(page + 1) })}
              className="px-3 py-1.5 text-sm rounded-lg border border-pum-border hover:bg-pum-bg/50 transition-colors"
            >
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
