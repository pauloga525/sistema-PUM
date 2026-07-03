import Link from "next/link";
import { superAdminPlanService } from "@/modules/superadmin/superadmin-plan.service";
import { ROUTES } from "@/constants/routes";

export const metadata = { title: "PUM del Sistema — SuperAdmin" };

export const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:              { label: "Borrador",               bg: "#f3f4f6", color: "#374151" },
  FINALIZED:          { label: "Enviado a revisión",     bg: "#dbeafe", color: "#1e40af" },
  FEEDBACK_RECEIVED:  { label: "Con observaciones",      bg: "#fef3c7", color: "#92400e" },
  APPROVED:           { label: "Aprobado",               bg: "#dcfce7", color: "#166534" },
  PENDING_SIGNATURE:  { label: "Pendiente de firma",     bg: "#fce7f3", color: "#9d174d" },
  SIGNED:             { label: "Firmado",                bg: "#ede9fe", color: "#4c1d95" },
  ADMIN_REJECTED:     { label: "Rechazado",              bg: "#fee2e2", color: "#991b1b" },
};

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; yearId?: string; page?: string }>;
}) {
  const sp      = await searchParams;
  const search  = sp.search?.trim() ?? "";
  const status  = sp.status ?? "";
  const yearId  = sp.yearId ?? "";
  const page    = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [{ plans, total, pages }, years] = await Promise.all([
    superAdminPlanService.getAllPlans({ search: search || undefined, status: status || undefined, yearId: yearId || undefined, page }),
    superAdminPlanService.getYears(),
  ]);

  const filterUrl = (overrides: Record<string, string>) => {
    const params = new URLSearchParams({ search, status, yearId, page: String(page), ...overrides });
    // Remove empty params
    for (const [k, v] of [...params.entries()]) if (!v || v === "1") params.delete(k);
    const s = params.toString();
    return ROUTES.SUPERADMIN.PLANS + (s ? `?${s}` : "");
  };

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-pum-text">PUM del Sistema</h1>
        <p className="text-sm text-pum-text-muted mt-1">
          {total} planificación{total !== 1 ? "es" : ""} en total
        </p>
      </div>

      {/* Filtros */}
      <form method="GET" className="flex flex-wrap gap-3 mb-6">
        <input
          name="search"
          defaultValue={search}
          placeholder="Buscar docente, email o materia…"
          className="border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text placeholder-pum-text-muted focus:outline-none focus:ring-2 focus:ring-violet-400 min-w-[240px]"
        />
        <select
          name="status"
          defaultValue={status}
          className="border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        <select
          name="yearId"
          defaultValue={yearId}
          className="border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="">Todos los años</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>{y.label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "#4c1d95" }}
        >
          Filtrar
        </button>
        {(search || status || yearId) && (
          <Link
            href={ROUTES.SUPERADMIN.PLANS}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-pum-border text-pum-text hover:bg-pum-bg/50 transition-colors"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Tabla */}
      <div className="rounded-xl border border-pum-border overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background: "#f5f0ff" }}>
              {["Docente", "Materia / Nivel", "Año / Período", "Estado", "Coordinador", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-pum-text-muted first:pl-5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-pum-text-muted">
                  No se encontraron planificaciones con esos filtros.
                </td>
              </tr>
            )}
            {plans.map((p) => {
              const badge = STATUS_LABEL[p.status] ?? { label: p.status, bg: "#f3f4f6", color: "#374151" };
              return (
                <tr key={p.id} className="border-t border-pum-border hover:bg-pum-bg/30 transition-colors">
                  <td className="px-4 pl-5 py-3">
                    <p className="font-medium text-pum-text">{p.teacherName ?? "—"}</p>
                    <p className="text-xs text-pum-text-muted">{p.teacherEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-pum-text">{p.subjectName}</p>
                    <p className="text-xs text-pum-text-muted">{p.levelName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-pum-text">{p.yearLabel}</p>
                    <p className="text-xs text-pum-text-muted">{p.periodName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-pum-text-muted">
                    {p.coordinatorName ?? <span className="italic">Sin asignar</span>}
                  </td>
                  <td className="px-4 pr-5 py-3 text-right">
                    <Link
                      href={ROUTES.SUPERADMIN.plan(p.id)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-pum-border hover:shadow-sm transition-shadow text-pum-text"
                    >
                      Gestionar
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
              href={filterUrl({ page: String(page - 1) })}
              className="px-3 py-1.5 text-sm rounded-lg border border-pum-border hover:bg-pum-bg/50 transition-colors"
            >
              ← Anterior
            </Link>
          )}
          <span className="text-sm text-pum-text-muted">Página {page} de {pages}</span>
          {page < pages && (
            <Link
              href={filterUrl({ page: String(page + 1) })}
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
