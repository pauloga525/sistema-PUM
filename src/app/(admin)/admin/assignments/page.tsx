import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { adminService } from "@/modules/admin/admin.service";
import { ROUTES } from "@/constants/routes";
import { YearSelector } from "@/components/admin/YearSelector";
import { AssignmentsClient } from "@/components/admin/AssignmentsClient";

export const metadata = { title: "Asignaciones — Admin PUM" };

export default async function AdminAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ yearId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect(ROUTES.LOGIN);

  const { yearId: rawYearId } = await searchParams;

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
            Crea al menos un año lectivo en Catálogo para ver las asignaciones.
          </p>
        </div>
      </div>
    );
  }

  const activeYear   = years.find((y) => y.active) ?? years[0];
  const yearId       = rawYearId && years.find((y) => y.id === rawYearId) ? rawYearId : activeYear.id;
  const selectedYear = years.find((y) => y.id === yearId)!;

  const assignments = await adminService.getAssignments(yearId);

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">

      {/* ── Encabezado ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-semibold text-pum-text">Asignaciones</h1>
          <p className="text-sm text-pum-text-muted mt-0.5">
            Vista de las asignaciones docente → materia + nivel. Los coordinadores gestionan las asignaciones desde su panel.
          </p>
        </div>
        <YearSelector
          years={years.map((y) => ({ id: y.id, label: y.label, active: y.active }))}
          currentYearId={yearId}
        />
      </div>

      {/* ── Tabla ── */}
      <AssignmentsClient
        assignments={assignments}
        yearLabel={selectedYear.label}
      />
    </div>
  );
}
