import Link from "next/link";
import {
  globalAuditService,
  USER_AUDIT_LABELS,
} from "@/modules/audit/global-audit.service";
import { AUDIT_EVENT_LABELS } from "@/modules/audit/audit.service";
import { PlanHistoryModal } from "@/components/superadmin/PlanHistoryModal";
import { ROUTES } from "@/constants/routes";

export const metadata = { title: "Auditoría — SuperAdmin PUM" };

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:             { label: "Borrador",           bg: "#f3f4f6", color: "#374151" },
  FINALIZED:         { label: "En revisión",         bg: "#dbeafe", color: "#1e40af" },
  FEEDBACK_RECEIVED: { label: "Con observaciones",   bg: "#fef3c7", color: "#92400e" },
  APPROVED:          { label: "Aprobado",            bg: "#dcfce7", color: "#166534" },
  PENDING_SIGNATURE: { label: "Pend. de firma",      bg: "#fce7f3", color: "#9d174d" },
  SIGNED:            { label: "Firmado",             bg: "#ede9fe", color: "#4c1d95" },
  ADMIN_REJECTED:    { label: "Rechazado",           bg: "#fee2e2", color: "#991b1b" },
};

const ROLE_LABEL: Record<string, string> = {
  TEACHER: "Docente", COORDINATOR: "Coordinador",
  ADMIN: "Administrador", SUPERADMIN: "Super Admin", SYSTEM: "Sistema",
};

function formatDT(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
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

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string; search?: string; eventType?: string; result?: string;
    status?: string; yearId?: string; from?: string; to?: string; page?: string;
  }>;
}) {
  const sp        = await searchParams;
  const tab       = sp.tab === "users" ? "users" : "plans";
  const search    = sp.search?.trim()    ?? "";
  const eventType = sp.eventType?.trim() ?? "";
  const result    = sp.result            ?? "";
  const status    = sp.status            ?? "";
  const yearId    = sp.yearId            ?? "";
  const from      = sp.from              ?? "";
  const to        = sp.to                ?? "";
  const page      = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const base    = ROUTES.SUPERADMIN.AUDIT;
  const tabUrl  = (t: string) => pageUrl(base, {}, { tab: t });
  const current = { tab, search, eventType, result, status, yearId, from, to, page: String(page) };

  // ── Datos según tab activo ────────────────────────────────────────────────
  const [planData, years] = tab === "plans"
    ? await Promise.all([
        globalAuditService.getPlanSummaries({
          search:  search  || undefined,
          yearId:  yearId  || undefined,
          status:  status  || undefined,
          page,
        }),
        globalAuditService.getYears(),
      ])
    : [null, [] as { id: string; label: string }[]];

  const [userData, userEventTypes] = tab === "users"
    ? await Promise.all([
        globalAuditService.getUserEvents({
          search:    search    || undefined,
          eventType: eventType || undefined,
          result:    result    || undefined,
          from:      from      || undefined,
          to:        to        || undefined,
          page,
        }),
        globalAuditService.getUserEventTypeOptions(),
      ])
    : [null, [] as string[]];

  const total = planData?.total ?? userData?.total ?? 0;
  const pages = planData?.pages ?? userData?.pages ?? 1;

  const hasFilter = !!(search || eventType || result || status || yearId || from || to);

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-pum-text">Auditoría del Sistema</h1>
        <p className="text-sm text-pum-text-muted mt-1">
          Trazabilidad completa de eventos de PUM y acciones sobre usuarios.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-pum-bg rounded-lg p-1 w-fit border border-pum-border">
        {[
          { key: "plans", label: "PUM" },
          { key: "users", label: "Usuarios" },
        ].map(({ key, label }) => (
          <Link
            key={key}
            href={tabUrl(key)}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={tab === key ? { background: "#4c1d95", color: "#fff" } : { color: "#6b7280" }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* ── Tab PUM — una fila por PUM ── */}
      {tab === "plans" && planData && (
        <>
          {/* Filtros */}
          <form method="GET" className="flex flex-wrap gap-3 mb-6">
            <input type="hidden" name="tab" value="plans" />
            <input
              name="search" defaultValue={search}
              placeholder="Buscar docente o materia…"
              className="border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text placeholder-pum-text-muted focus:outline-none focus:ring-2 focus:ring-violet-400 min-w-[220px]"
            />
            <select
              name="yearId" defaultValue={yearId}
              className="border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="">Todos los años</option>
              {years.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
            </select>
            <select
              name="status" defaultValue={status}
              className="border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_BADGE).map(([v, { label }]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
            <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#4c1d95" }}>
              Filtrar
            </button>
            {hasFilter && (
              <Link href={tabUrl("plans")} className="px-4 py-2 rounded-lg text-sm font-medium border border-pum-border text-pum-text hover:bg-pum-bg/50 transition-colors">
                Limpiar
              </Link>
            )}
          </form>

          <p className="text-xs text-pum-text-muted mb-3">
            {total.toLocaleString("es-EC")} PUM{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
            {pages > 1 ? ` · Página ${page} de ${pages}` : ""}
          </p>

          <div className="rounded-xl border border-pum-border overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: "#f5f0ff" }}>
                  {["Materia / Nivel", "Docente", "Año · Período", "Estado", "Último evento", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-pum-text-muted first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {planData.plans.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-pum-text-muted">
                      No se encontraron PUMs con esos filtros.
                    </td>
                  </tr>
                )}
                {planData.plans.map((p) => {
                  const badge = STATUS_BADGE[p.status] ?? { label: p.status, bg: "#f3f4f6", color: "#374151" };
                  return (
                    <tr key={p.planId} className="border-t border-pum-border hover:bg-pum-bg/20 transition-colors">
                      <td className="px-4 pl-5 py-3">
                        <p className="font-medium text-pum-text">{p.subjectName}</p>
                        <p className="text-xs text-pum-text-muted">{p.levelName}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-pum-text">{p.teacherName ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-pum-text-muted">
                        {p.yearLabel} · {p.periodName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{ background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        {p.lastEventLabel ? (
                          <>
                            <p className="text-xs text-pum-text truncate">{p.lastEventLabel}</p>
                            <p className="text-xs text-pum-text-muted">
                              {p.lastActorName && `${p.lastActorName} · `}
                              {p.lastEventAt ? formatDT(p.lastEventAt) : "—"}
                            </p>
                          </>
                        ) : (
                          <span className="text-xs text-pum-text-muted italic">Sin eventos</span>
                        )}
                      </td>
                      <td className="px-4 pr-5 py-3 text-right">
                        <PlanHistoryModal
                          planId={p.planId}
                          subjectName={p.subjectName}
                          teacherName={p.teacherName}
                          yearLabel={p.yearLabel}
                          eventCount={p.eventCount}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Tab Usuarios — eventos individuales ── */}
      {tab === "users" && userData && (
        <>
          {/* Filtros */}
          <form method="GET" className="flex flex-wrap gap-3 mb-6">
            <input type="hidden" name="tab" value="users" />
            <input
              name="search" defaultValue={search}
              placeholder="Buscar por email del actor…"
              className="border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text placeholder-pum-text-muted focus:outline-none focus:ring-2 focus:ring-violet-400 min-w-[220px]"
            />
            <select
              name="eventType" defaultValue={eventType}
              className="border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="">Todos los eventos</option>
              {userEventTypes.map((et) => (
                <option key={et} value={et}>{USER_AUDIT_LABELS[et] ?? et}</option>
              ))}
            </select>
            <select
              name="result" defaultValue={result}
              className="border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="">Todos los resultados</option>
              <option value="SUCCESS">Exitoso</option>
              <option value="FAILURE">Fallido</option>
            </select>
            <input type="date" name="from" defaultValue={from} title="Desde"
              className="border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text focus:outline-none focus:ring-2 focus:ring-violet-400" />
            <input type="date" name="to" defaultValue={to} title="Hasta"
              className="border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text focus:outline-none focus:ring-2 focus:ring-violet-400" />
            <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#4c1d95" }}>
              Filtrar
            </button>
            {hasFilter && (
              <Link href={tabUrl("users")} className="px-4 py-2 rounded-lg text-sm font-medium border border-pum-border text-pum-text hover:bg-pum-bg/50 transition-colors">
                Limpiar
              </Link>
            )}
          </form>

          <p className="text-xs text-pum-text-muted mb-3">
            {total.toLocaleString("es-EC")} evento{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
            {pages > 1 ? ` · Página ${page} de ${pages}` : ""}
          </p>

          <div className="rounded-xl border border-pum-border overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: "#f5f0ff" }}>
                  {["Fecha", "Evento", "Actor", "Afectado", "IP", "Resultado"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-pum-text-muted first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {userData.rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-pum-text-muted">
                      No se encontraron eventos con esos filtros.
                    </td>
                  </tr>
                )}
                {userData.rows.map((ev) => (
                  <tr key={ev.id} className="border-t border-pum-border hover:bg-pum-bg/20 transition-colors">
                    <td className="px-4 pl-5 py-3 text-xs text-pum-text-muted whitespace-nowrap">{formatDT(ev.createdAt)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-pum-text">{ev.eventLabel}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-pum-text">{ev.actorEmail ?? "—"}</p>
                      {ev.actorRole && <p className="text-xs text-pum-text-muted">{ROLE_LABEL[ev.actorRole] ?? ev.actorRole}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {ev.targetEmail && ev.targetEmail !== ev.actorEmail ? (
                        <>
                          <p className="text-sm text-pum-text">{ev.targetEmail}</p>
                          {ev.targetRole && <p className="text-xs text-pum-text-muted">{ROLE_LABEL[ev.targetRole] ?? ev.targetRole}</p>}
                        </>
                      ) : <span className="text-xs text-pum-text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-pum-text-muted">{ev.actorIp ?? "—"}</td>
                    <td className="px-4 pr-5 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={ev.result === "SUCCESS" ? { background: "#dcfce7", color: "#166534" } : { background: "#fee2e2", color: "#991b1b" }}>
                        {ev.result === "SUCCESS" ? "Exitoso" : "Fallido"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Paginación */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {page > 1 && (
            <Link href={pageUrl(base, current, { page: String(page - 1) })}
              className="px-3 py-1.5 text-sm rounded-lg border border-pum-border hover:bg-pum-bg/50 transition-colors">
              ← Anterior
            </Link>
          )}
          <span className="text-sm text-pum-text-muted">Página {page} de {pages}</span>
          {page < pages && (
            <Link href={pageUrl(base, current, { page: String(page + 1) })}
              className="px-3 py-1.5 text-sm rounded-lg border border-pum-border hover:bg-pum-bg/50 transition-colors">
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
