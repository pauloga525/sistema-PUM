import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { adminService } from "@/modules/admin/admin.service";
import { CreateTeacherPanel } from "@/components/admin/CreateTeacherPanel";
import { TeachersTable } from "@/components/admin/TeachersTable";
import { ROUTES } from "@/constants/routes";

export const metadata = { title: "Docentes — Admin PUM" };

export default async function AdminTeachersPage() {
  const session = await auth();
  if (!session) redirect(ROUTES.LOGIN);

  const teachers = await adminService.getTeachers();

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">

      {/* ── Encabezado ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-pum-text">Docentes</h1>
          <p className="text-sm text-pum-text-muted mt-0.5">
            Crea y administra las cuentas de los docentes institucionales.
          </p>
        </div>
        <CreateTeacherPanel />
      </div>

      {/* ── Lista de docentes ── */}
      {teachers.length === 0 ? (
        <div
          className="rounded-2xl px-8 py-12 flex flex-col items-center text-center"
          style={{
            background: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(195,198,210,0.70)",
            boxShadow: "0 2px 12px rgba(0,39,83,0.05)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(0,39,83,0.06)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#737781" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <p className="text-base font-semibold text-pum-text mb-1">Sin docentes registrados</p>
          <p className="text-sm text-pum-text-muted max-w-xs">
            Agrega el primer docente usando el botón <strong>Nuevo docente</strong> en la parte superior.
          </p>
        </div>
      ) : (
        <TeachersTable teachers={teachers} />
      )}
    </div>
  );
}
