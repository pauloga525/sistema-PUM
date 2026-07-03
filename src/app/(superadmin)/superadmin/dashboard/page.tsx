import Link from "next/link";
import { dashboardService } from "@/modules/superadmin/dashboard.service";
import { ROUTES } from "@/constants/routes";

export const metadata = { title: "Dashboard — SuperAdmin PUM" };

function formatDT(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function MetricCard({
  label, value, color, href, sub,
}: {
  label: string; value: number | string; color: string; href?: string; sub?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-pum-border bg-white p-5 h-full">
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-pum-text-muted mt-1 leading-snug">{label}</p>
      {sub && <p className="text-xs mt-1" style={{ color }}>{sub}</p>}
    </div>
  );
  return href
    ? <Link href={href} className="block hover:shadow-sm transition-shadow">{inner}</Link>
    : inner;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-pum-text mb-3">{children}</h2>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SuperAdminDashboardPage() {
  const d = await dashboardService.getData();

  const planAttention = d.plans.finalized + d.plans.feedbackReceived + d.plans.pendingSignature;

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full gap-8">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-pum-text">Dashboard del sistema</h1>
          <p className="text-sm text-pum-text-muted mt-1">
            Vista consolidada de usuarios, PUMs, auditoría y salud del sistema
            {d.activeYear && <> · Año lectivo activo: <strong>{d.activeYear}</strong></>}
          </p>
        </div>
        <Link
          href={ROUTES.ADMIN.DASHBOARD}
          className="text-sm font-medium px-4 py-2 rounded-lg border border-pum-border text-pum-text hover:shadow-sm transition-shadow"
        >
          Panel Administrativo ↗
        </Link>
      </div>

      {/* ── Fila 1: Usuarios ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Usuarios</SectionTitle>
          <Link href={ROUTES.SUPERADMIN.USERS} className="text-xs text-violet-700 hover:underline underline-offset-2">
            Ver todos →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <MetricCard label="Total"         value={d.users.total}                      color="#374151" href={ROUTES.SUPERADMIN.USERS} />
          <MetricCard label="Activos"        value={d.users.active}                     color="#166534" />
          <MetricCard label="Inactivos"      value={d.users.inactive}                   color="#991b1b" />
          <MetricCard label="Docentes"       value={d.users.byRole["TEACHER"]    ?? 0}  color="#1e40af" />
          <MetricCard label="Coordinadores"  value={d.users.byRole["COORDINATOR"] ?? 0} color="#92400e" />
          <MetricCard label="Admins"         value={d.users.byRole["ADMIN"]      ?? 0}  color="#166534" />
          <MetricCard label="SuperAdmins"    value={d.users.byRole["SUPERADMIN"] ?? 0}  color="#4c1d95" />
        </div>
      </section>

      {/* ── Fila 2: PUMs ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>
            PUMs del sistema
            {planAttention > 0 && (
              <span
                className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: "#fef3c7", color: "#92400e" }}
              >
                {planAttention} requieren atención
              </span>
            )}
          </SectionTitle>
          <Link href={ROUTES.SUPERADMIN.PLANS} className="text-xs text-violet-700 hover:underline underline-offset-2">
            Ver todos →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <MetricCard label="Total PUMs"          value={d.plans.total}            color="#374151" href={ROUTES.SUPERADMIN.PLANS} />
          <MetricCard label="Borradores"           value={d.plans.draft}            color="#6b7280" />
          <MetricCard label="En revisión"          value={d.plans.finalized}        color="#1e40af" />
          <MetricCard label="Con observaciones"    value={d.plans.feedbackReceived} color="#92400e" />
          <MetricCard label="Aprobados"            value={d.plans.approved}         color="#166534" />
          <MetricCard label="Pend. de firma"       value={d.plans.pendingSignature} color="#9d174d" />
          <MetricCard label="Firmados"             value={d.plans.signed}           color="#4c1d95" />
          <MetricCard label="Rechazados"           value={d.plans.adminRejected}    color="#991b1b" />
        </div>
      </section>

      {/* ── Fila 3: Salud del sistema ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Salud del sistema</SectionTitle>
          <Link href={ROUTES.SUPERADMIN.ERRORS} className="text-xs text-violet-700 hover:underline underline-offset-2">
            Ver errores →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            label="Errores sin resolver"
            value={d.errors.unresolved}
            color={d.errors.unresolved > 0 ? "#991b1b" : "#166534"}
            href={d.errors.unresolved > 0 ? `${ROUTES.SUPERADMIN.ERRORS}?resolved=false` : undefined}
            sub={d.errors.unresolved > 0 ? "Requieren atención" : "Sin pendientes"}
          />
          <MetricCard label="Errores activos (ERROR)" value={d.errors.errors}   color="#991b1b" />
          <MetricCard label="Avisos activos (WARN)"   value={d.errors.warnings} color="#92400e" />
          <MetricCard label="Total registros"          value={d.errors.total}    color="#374151" href={ROUTES.SUPERADMIN.ERRORS} />
        </div>
      </section>

      {/* ── Fila 4: Actividad reciente ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Últimos eventos de PUM */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>Últimos eventos de PUM</SectionTitle>
            <Link href={ROUTES.SUPERADMIN.AUDIT} className="text-xs text-violet-700 hover:underline underline-offset-2">
              Ver auditoría →
            </Link>
          </div>
          <div className="rounded-xl border border-pum-border bg-white overflow-hidden">
            {d.recentPlanEvents.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-pum-text-muted italic">Sin actividad registrada.</p>
            ) : (
              <ul className="divide-y divide-pum-border">
                {d.recentPlanEvents.map((ev) => (
                  <li key={ev.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-pum-text truncate">{ev.eventLabel}</p>
                      <p className="text-xs text-pum-text-muted truncate">
                        {ev.subjectName}
                        {ev.actorName && <> · {ev.actorName}{ev.actorRoleLabel ? ` (${ev.actorRoleLabel})` : ""}</>}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs text-pum-text-muted">{formatDT(ev.createdAt)}</p>
                      <Link
                        href={ROUTES.SUPERADMIN.plan(ev.planId)}
                        className="text-xs text-violet-700 hover:underline underline-offset-2"
                      >
                        Ver →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Últimos eventos de usuarios */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>Últimos eventos de usuarios</SectionTitle>
            <Link
              href={`${ROUTES.SUPERADMIN.AUDIT}?tab=users`}
              className="text-xs text-violet-700 hover:underline underline-offset-2"
            >
              Ver auditoría →
            </Link>
          </div>
          <div className="rounded-xl border border-pum-border bg-white overflow-hidden">
            {d.recentUserEvents.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-pum-text-muted italic">Sin actividad registrada.</p>
            ) : (
              <ul className="divide-y divide-pum-border">
                {d.recentUserEvents.map((ev) => (
                  <li key={ev.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-pum-text">{ev.eventLabel}</p>
                      <p className="text-xs text-pum-text-muted truncate">
                        {ev.actorEmail ?? "—"}
                        {ev.actorRole && <> · {ev.actorRole}</>}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs text-pum-text-muted">{formatDT(ev.createdAt)}</p>
                      <span
                        className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                        style={
                          ev.result === "SUCCESS"
                            ? { background: "#dcfce7", color: "#166534" }
                            : { background: "#fee2e2", color: "#991b1b" }
                        }
                      >
                        {ev.result === "SUCCESS" ? "OK" : "FAIL"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* ── Accesos rápidos ── */}
      <section>
        <SectionTitle>Accesos rápidos</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { href: ROUTES.SUPERADMIN.USERS,  label: "Usuarios",    icon: "👥", desc: "CRUD de cuentas" },
            { href: ROUTES.SUPERADMIN.PLANS,  label: "PUMs",        icon: "📄", desc: "Gestión global" },
            { href: ROUTES.SUPERADMIN.AUDIT,  label: "Auditoría",   icon: "🔍", desc: "Trazabilidad" },
            { href: ROUTES.SUPERADMIN.ERRORS, label: "Errores",     icon: "⚠️", desc: "Monitoreo" },
            { href: ROUTES.ADMIN.DASHBOARD,   label: "Admin Panel",  icon: "🏛️", desc: "Vicerrectorado" },
          ].map(({ href, label, icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl border border-pum-border bg-white p-4 hover:shadow-sm transition-shadow text-center"
            >
              <span className="text-2xl block mb-1">{icon}</span>
              <p className="text-sm font-semibold text-pum-text">{label}</p>
              <p className="text-xs text-pum-text-muted mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
