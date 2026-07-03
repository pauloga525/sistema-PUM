import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { coordinatorService } from "@/modules/coordinator/coordinator.service";
import { TeacherAssignmentPanel } from "@/components/coordinator/TeacherAssignmentPanel";
import { ROUTES } from "@/constants/routes";

export const metadata = { title: "Docentes — Coordinador PUM" };

export default async function CoordinatorDocentesPage() {
  const session = await auth();
  if (!session) redirect(ROUTES.LOGIN);

  const [teachers, catalog] = await Promise.all([
    coordinatorService.getAssignedTeachers(session.user.id),
    coordinatorService.getCatalogForAssignments(session.user.id),
  ]);

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-5xl mx-auto w-full">

      {/* Encabezado */}
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-pum-text">Docentes asignados</h1>
        <p className="text-sm text-pum-text-muted mt-0.5">
          Gestiona las asignaciones de materia y nivel de cada docente a tu cargo.
        </p>
      </div>

      {/* Sin docentes */}
      {teachers.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div
            className="text-center rounded-2xl px-10 py-12 max-w-sm"
            style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(195,198,210,0.70)" }}
          >
            <p className="text-lg font-semibold text-pum-text mb-2">Sin docentes asignados</p>
            <p className="text-sm text-pum-text-muted">
              El administrador aún no te ha asignado docentes a supervisar.
            </p>
          </div>
        </div>
      )}

      {/* Panel interactivo */}
      {teachers.length > 0 && (
        <TeacherAssignmentPanel teachers={teachers} catalog={catalog} coordinatorId={session.user.id} />
      )}
    </div>
  );
}
