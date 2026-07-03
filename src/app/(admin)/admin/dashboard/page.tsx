import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { adminService } from "@/modules/admin/admin.service";
import { ROUTES } from "@/constants/routes";
import { SignatureTable } from "./SignatureTable";
import { ExcelDownloadButton } from "@/components/admin/ExcelDownloadButton";

export const metadata = { title: "Dashboard — Admin PUM" };

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  accentBg,
  icon,
}: {
  label: string;
  value: number;
  accentBg: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex items-start gap-4"
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(195,198,210,0.70)",
        boxShadow: "0 2px 12px rgba(0,39,83,0.05), inset 0 1px 0 rgba(255,255,255,0.90)",
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
        style={{ background: accentBg }}
      >
        {icon}
      </div>
      <div>
        <p className="text-3xl font-bold text-pum-text leading-none">{value}</p>
        <p className="text-xs text-pum-text-muted mt-1">{label}</p>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session) redirect(ROUTES.LOGIN);

  const activeYear = await adminService.getActiveYear();

  if (!activeYear) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div
          className="rounded-2xl px-8 py-10 max-w-sm"
          style={{
            background: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(195,198,210,0.70)",
            boxShadow: "0 2px 12px rgba(0,39,83,0.05)",
          }}
        >
          <p className="text-2xl font-semibold text-pum-text mb-2">Sin año activo</p>
          <p className="text-sm text-pum-text-muted">
            No hay un año lectivo marcado como activo. Crea uno desde Catálogo para ver el dashboard.
          </p>
        </div>
      </div>
    );
  }

  const [stats, signatureGroups, coordinatorOverview, allYears] = await Promise.all([
    adminService.getDashboardStats(activeYear.id),
    adminService.getPendingSignaturePlans(),
    adminService.getCoordinatorOverview(),
    adminService.getAllYears(),
  ]);

  const totalPending = signatureGroups.reduce((sum, g) => sum + g.plans.length, 0);

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-7">
        <div>
          <h1 className="text-2xl font-semibold text-pum-text">Dashboard</h1>
          <p className="text-sm text-pum-text-muted mt-0.5">
            Año lectivo activo:{" "}
            <span className="font-medium text-pum-text">{activeYear.label}</span>
            {" · "}
            {activeYear.periods.length} periodo{activeYear.periods.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap self-start sm:self-auto">
          {stats.signed > 0 && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background: "#ccfbf1", border: "1px solid rgba(13,138,94,0.25)" }}
            >
              <span className="text-sm font-semibold" style={{ color: "#0f766e" }}>
                {stats.signed} PUM{stats.signed !== 1 ? "s" : ""} firmado{stats.signed !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          <ExcelDownloadButton
            years={allYears.map((y) => ({ id: y.id, label: y.label, active: y.active }))}
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Docentes activos"
          value={stats.totalTeachers}
          accentBg="rgba(0,39,83,0.10)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002753" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatCard
          label="En elaboración / revisión"
          value={stats.inProgress}
          accentBg="rgba(168,200,255,0.30)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#335f9d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          }
        />
        <StatCard
          label="Pendientes de firma"
          value={stats.pendingSignature}
          accentBg="rgba(124,58,237,0.12)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          }
        />
        <StatCard
          label="Firmados y aprobados"
          value={stats.signed}
          accentBg="rgba(13,138,94,0.12)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d8a5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />
      </div>

      {/* Alerta de rechazados */}
      {stats.adminRejected > 0 && (
        <div
          className="rounded-xl px-4 py-3 mb-6 flex items-center gap-3"
          style={{ background: "#ffdad6", border: "1px solid rgba(186,26,26,0.22)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ba1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-sm font-medium" style={{ color: "#ba1a1a" }}>
            {stats.adminRejected} PUM{stats.adminRejected !== 1 ? "s" : ""} rechazado{stats.adminRejected !== 1 ? "s" : ""} — el coordinador debe revisar y reenviar.
          </p>
        </div>
      )}

      {/* Alerta de vencidos */}
      {stats.overdue > 0 && (
        <div
          className="rounded-xl px-4 py-3 mb-6 flex items-center gap-3"
          style={{ background: "#fff3cd", border: "1px solid rgba(117,91,0,0.22)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#755b00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <p className="text-sm font-medium" style={{ color: "#755b00" }}>
            {stats.overdue} planificación{stats.overdue !== 1 ? "es" : ""} con plazo vencido sin finalizar.
          </p>
        </div>
      )}

      {/* Sección coordinadores */}
      <div
        className="rounded-2xl overflow-hidden mb-6"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(195,198,210,0.70)",
          boxShadow: "0 2px 12px rgba(0,39,83,0.05), inset 0 1px 0 rgba(255,255,255,0.90)",
        }}
      >
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ background: "rgba(0,39,83,0.03)", borderColor: "rgba(0,39,83,0.07)" }}
        >
          <div>
            <h2 className="text-sm font-semibold text-pum-text">Coordinadores</h2>
            <p className="text-[11px] text-pum-text-muted mt-0.5">
              Estado de revisión por coordinador
            </p>
          </div>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: "rgba(0,39,83,0.08)", color: "#002753" }}
          >
            {coordinatorOverview.length} coordinador{coordinatorOverview.length !== 1 ? "es" : ""}
          </span>
        </div>

        {coordinatorOverview.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-pum-text-muted">No hay coordinadores registrados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,39,83,0.08)" }}>
                  {["Coordinador", "Docentes", "En revisión", "Pend. firma", "Rechazados", "Firmados"].map((col) => (
                    <th
                      key={col}
                      className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-pum-text-muted"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coordinatorOverview.map((c, i) => (
                  <tr
                    key={c.coordinatorId}
                    style={{
                      background: i % 2 !== 0 ? "rgba(0,39,83,0.015)" : "transparent",
                      borderBottom: "1px solid rgba(0,39,83,0.04)",
                    }}
                  >
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-pum-text">
                        {c.coordinatorName ?? "—"}
                      </p>
                      <p className="text-[11px] text-pum-text-disabled">{c.coordinatorEmail}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-semibold text-pum-text">{c.teacherCount}</span>
                      <span className="text-xs text-pum-text-muted ml-1">asignado{c.teacherCount !== 1 ? "s" : ""}</span>
                    </td>
                    <td className="px-5 py-3">
                      {c.pendingReview > 0 ? (
                        <span
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                          style={{ background: "#fff7ed", color: "#b45309" }}
                        >
                          {c.pendingReview}
                        </span>
                      ) : (
                        <span className="text-xs text-pum-text-disabled">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {c.pendingSignature > 0 ? (
                        <span
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                          style={{ background: "rgba(124,58,237,0.10)", color: "#6d28d9" }}
                        >
                          {c.pendingSignature}
                        </span>
                      ) : (
                        <span className="text-xs text-pum-text-disabled">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {c.adminRejected > 0 ? (
                        <span
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                          style={{ background: "#ffdad6", color: "#ba1a1a" }}
                        >
                          {c.adminRejected}
                        </span>
                      ) : (
                        <span className="text-xs text-pum-text-disabled">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {c.signed > 0 ? (
                        <span
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                          style={{ background: "#ccfbf1", color: "#0f766e" }}
                        >
                          {c.signed}
                        </span>
                      ) : (
                        <span className="text-xs text-pum-text-disabled">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tabla de PUMs pendientes de firma */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(195,198,210,0.70)",
          boxShadow: "0 2px 12px rgba(0,39,83,0.05), inset 0 1px 0 rgba(255,255,255,0.90)",
        }}
      >
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ background: "rgba(0,39,83,0.03)", borderColor: "rgba(0,39,83,0.07)" }}
        >
          <div>
            <h2 className="text-sm font-semibold text-pum-text">PUMs pendientes de firma</h2>
            <p className="text-[11px] text-pum-text-muted mt-0.5">
              Despliega un coordinador para ver sus PUMs y firmar o rechazar
            </p>
          </div>
          {totalPending > 0 && (
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(124,58,237,0.10)", color: "#6d28d9" }}
            >
              {totalPending} pendiente{totalPending !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <SignatureTable groups={signatureGroups} />
      </div>
    </div>
  );
}
