import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { adminService } from "@/modules/admin/admin.service";
import { ROUTES } from "@/constants/routes";
import { YearSelector } from "@/components/admin/YearSelector";
import { ExportZipClient } from "@/components/admin/ExportZipClient";

export const metadata = { title: "Exportar ZIP — Admin PUM" };

export default async function AdminExportZipPage({
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
            Crea al menos un año lectivo en Catálogo para exportar.
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

  // Load all plans for the period (all statuses)
  const rawPlans = periodId
    ? await adminService.getPlanificationsForPeriod(yearId, periodId)
    : [];

  const plans = rawPlans.map((p) => {
    const editor = p.teachers[0]?.teacher;
    return {
      id:           p.id,
      status:       p.status,
      teacherName:  editor?.name ?? null,
      teacherEmail: editor?.email ?? "",
      subjectId:    p.subjectId,
      subjectName:  p.subject.name,
      levelId:      p.levelId,
      levelName:    p.level.name,
      levelCode:    p.level.code,
    };
  });

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">

      {/* ── Encabezado ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-pum-text">Exportar ZIP</h1>
          <p className="text-sm text-pum-text-muted mt-0.5">
            Descarga planificaciones enviadas de un periodo. Usa los filtros para seleccionar qué exportar.
          </p>
        </div>
        <YearSelector
          years={years.map((y) => ({ id: y.id, label: y.label, active: y.active }))}
          currentYearId={yearId}
          basePath={ROUTES.ADMIN.EXPORT_ZIP}
        />
      </div>

      {/* ── Period tabs ── */}
      {periods.length === 0 ? (
        <div
          className="rounded-xl px-4 py-3 mb-6"
          style={{ background: "#fff8e1", border: "1px solid rgba(117,91,0,0.22)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#755b00" }}>
            Este año lectivo no tiene periodos configurados.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {periods.map((p) => {
            const isActive = p.id === periodId;
            return (
              <Link
                key={p.id}
                href={`${ROUTES.ADMIN.EXPORT_ZIP}?yearId=${yearId}&periodId=${p.id}`}
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
        <ExportZipClient
          plans={plans}
          periodName={selectedPeriod?.name ?? ""}
          yearLabel={selectedYear.label}
        />
      )}
    </div>
  );
}
