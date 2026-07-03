import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { adminService } from "@/modules/admin/admin.service";
import { ROUTES } from "@/constants/routes";
import { YearSelector } from "@/components/admin/YearSelector";
import { setDeadlineAction, setBulkDeadlineAction } from "./actions";

export const metadata = { title: "Plazos — Admin PUM" };

// ── Helpers ────────────────────────────────────────────────────────────────────
function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().split("T")[0];
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "Sin plazo";
  return d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

function displayStatus(plan: { status: string; editDeadlineAt: Date | null }) {
  if (plan.status === "FINALIZED") return "FINALIZED";
  if (plan.editDeadlineAt && plan.editDeadlineAt < new Date()) return "OVERDUE";
  return "DRAFT";
}

const STATUS_BADGE = {
  DRAFT:     { label: "Borrador",      bg: "#edeeef", color: "#434750" },
  FINALIZED: { label: "Finalizado",    bg: "#e0f5ee", color: "#0d8a5e" },
  OVERDUE:   { label: "Plazo vencido", bg: "#ffdad6", color: "#ba1a1a" },
} as const;

// ── Input style shared between date inputs ─────────────────────────────────────
const DATE_INPUT_CLS = "pum-glass-input text-sm px-2.5 py-1.5 rounded-xl";

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function AdminDeadlinesPage({
  searchParams,
}: {
  searchParams: Promise<{ yearId?: string; periodId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect(ROUTES.LOGIN);

  const { yearId: rawYearId, periodId: rawPeriodId } = await searchParams;

  const years = await adminService.getAllYears();

  if (years.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div
          className="rounded-2xl px-8 py-10 max-w-sm text-center"
          style={{
            background: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(195,198,210,0.70)",
            boxShadow: "0 2px 12px rgba(0,39,83,0.05)",
          }}
        >
          <p className="text-lg font-semibold text-pum-text mb-1">Sin años lectivos</p>
          <p className="text-sm text-pum-text-muted">
            Crea al menos un año lectivo en Catálogo para gestionar plazos.
          </p>
        </div>
      </div>
    );
  }

  const activeYear   = years.find((y) => y.active) ?? years[0];
  const yearId       = rawYearId && years.some((y) => y.id === rawYearId) ? rawYearId : activeYear.id;
  const selectedYear = years.find((y) => y.id === yearId)!;
  const periods      = selectedYear.periods;

  const periodId =
    rawPeriodId && periods.some((p) => p.id === rawPeriodId)
      ? rawPeriodId
      : periods[0]?.id ?? "";

  const selectedPeriod = periods.find((p) => p.id === periodId);
  const plans = periodId
    ? await adminService.getPlanificationsForPeriod(yearId, periodId)
    : [];

  const now = new Date();
  const draftCount = plans.filter((p) => p.status !== "FINALIZED").length;

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">

      {/* ── Encabezado ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-pum-text">Plazos</h1>
          <p className="text-sm text-pum-text-muted mt-0.5">
            Define la fecha límite de entrega de las planificaciones.
          </p>
        </div>
        <YearSelector
          years={years.map((y) => ({ id: y.id, label: y.label, active: y.active }))}
          currentYearId={yearId}
          basePath={ROUTES.ADMIN.DEADLINES}
        />
      </div>

      {/* ── Period tabs ── */}
      {periods.length === 0 ? (
        <div
          className="rounded-xl px-4 py-3 mb-6"
          style={{ background: "#fff8e1", border: "1px solid rgba(117,91,0,0.22)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#755b00" }}>
            Este año lectivo no tiene periodos. Agrega periodos desde Catálogo.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {periods.map((p) => {
            const isActive = p.id === periodId;
            return (
              <Link
                key={p.id}
                href={`${ROUTES.ADMIN.DEADLINES}?yearId=${yearId}&periodId=${p.id}`}
                className="text-sm font-medium px-4 py-1.5 rounded-full transition-colors duration-150"
                style={
                  isActive
                    ? { background: "#002753", color: "#ffffff" }
                    : { background: "rgba(0,39,83,0.06)", color: "#434750" }
                }
              >
                {p.name}
              </Link>
            );
          })}
        </div>
      )}

      {periodId && (
        <>
          {/* ── Bulk form ── */}
          <div
            className="rounded-2xl px-5 py-4 mb-5 flex flex-col sm:flex-row sm:items-center gap-3"
            style={{
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(195,198,210,0.70)",
              boxShadow: "0 2px 12px rgba(0,39,83,0.05), inset 0 1px 0 rgba(255,255,255,0.90)",
            }}
          >
            <div className="flex-1">
              <p className="text-sm font-semibold text-pum-text">
                Plazo masivo — {selectedPeriod?.name}
              </p>
              <p className="text-xs text-pum-text-muted mt-0.5">
                Aplica la misma fecha a todos los borradores del periodo ({draftCount}).
                Dejar vacío para quitar todos los plazos.
              </p>
            </div>
            <form action={setBulkDeadlineAction} className="flex items-center gap-2 flex-wrap">
              <input type="hidden" name="yearId" value={yearId} />
              <input type="hidden" name="periodId" value={periodId} />
              <input
                type="date"
                name="deadline"
                className={DATE_INPUT_CLS}
                aria-label="Fecha límite masiva"
              />
              <button
                type="submit"
                className="pum-navy-btn text-sm font-semibold text-white px-4 py-2 rounded-xl cursor-pointer"
              >
                Aplicar a todos
              </button>
            </form>
          </div>

          {/* ── Table ── */}
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
              className="px-5 py-4 flex items-center justify-between border-b border-pum-border/50"
              style={{ background: "rgba(0,39,83,0.03)" }}
            >
              <h2 className="text-sm font-semibold text-pum-text">
                {selectedPeriod?.name ?? "Periodo"} — {selectedYear.label}
              </h2>
              <span className="text-xs text-pum-text-disabled">
                {plans.length} planificación{plans.length !== 1 ? "es" : ""}
              </span>
            </div>

            {plans.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm font-medium text-pum-text mb-1">
                  Sin planificaciones todavía
                </p>
                <p className="text-xs text-pum-text-muted">
                  Aparecerán aquí cuando los docentes creen sus PUMs para este periodo.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(0,39,83,0.08)" }}>
                      {["Docente", "Materia", "Nivel", "Estado", "Plazo actual", "Establecer plazo"].map((col) => (
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
                    {plans.map((plan, i) => {
                      const status  = displayStatus({ status: plan.status, editDeadlineAt: plan.editDeadlineAt });
                      const badge   = STATUS_BADGE[status];
                      const isEditable = status !== "FINALIZED";
                      const deadlineStr = toDateInput(plan.editDeadlineAt);
                      const isOverdue   = status === "OVERDUE";

                      return (
                        <tr
                          key={plan.id}
                          style={{
                            background: i % 2 !== 0 ? "rgba(0,39,83,0.015)" : "transparent",
                            borderBottom: "1px solid rgba(0,39,83,0.04)",
                          }}
                        >
                          {/* Docente */}
                          <td className="px-5 py-3">
                            {(() => {
                              const editor = plan.teachers[0]?.teacher;
                              return editor ? (
                                <>
                                  <p className="text-sm font-medium text-pum-text">
                                    {editor.name ?? editor.email}
                                  </p>
                                  {editor.name && (
                                    <p className="text-[11px] text-pum-text-disabled">{editor.email}</p>
                                  )}
                                </>
                              ) : (
                                <p className="text-sm text-pum-text-disabled">Sin asignar</p>
                              );
                            })()}
                          </td>

                          {/* Materia */}
                          <td className="px-5 py-3">
                            <p className="text-sm text-pum-text">{plan.subject.name}</p>
                            <code
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded mt-0.5 inline-block"
                              style={{ background: "rgba(0,39,83,0.07)", color: "#002753" }}
                            >
                              {plan.subject.code}
                            </code>
                          </td>

                          {/* Nivel */}
                          <td className="px-5 py-3 text-sm text-pum-text">{plan.level.name}</td>

                          {/* Estado */}
                          <td className="px-5 py-3">
                            <span
                              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                              style={{ background: badge.bg, color: badge.color }}
                            >
                              {badge.label}
                            </span>
                          </td>

                          {/* Plazo actual */}
                          <td className="px-5 py-3">
                            <span
                              className="text-sm"
                              style={{ color: isOverdue ? "#ba1a1a" : plan.editDeadlineAt ? "#191c1d" : "#737781" }}
                            >
                              {fmtDate(plan.editDeadlineAt)}
                            </span>
                          </td>

                          {/* Establecer plazo */}
                          <td className="px-5 py-3">
                            {isEditable ? (
                              <form action={setDeadlineAction} className="flex items-center gap-1.5 flex-wrap">
                                <input type="hidden" name="planId" value={plan.id} />
                                <input
                                  type="date"
                                  name="deadline"
                                  defaultValue={deadlineStr}
                                  className={DATE_INPUT_CLS}
                                  aria-label="Nueva fecha límite"
                                />
                                <button
                                  type="submit"
                                  className="text-[12px] font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                                  style={{
                                    background: "rgba(0,39,83,0.08)",
                                    color: "#002753",
                                  }}
                                >
                                  Guardar
                                </button>
                              </form>
                            ) : (
                              <span className="text-xs text-pum-text-disabled">Finalizado</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
