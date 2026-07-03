import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { planificationService } from "@/modules/planification/planification.service";
import { ROUTES } from "@/constants/routes";
import Link from "next/link";
import { OnboardingBanner } from "@/components/teacher/OnboardingBanner";

export const metadata = { title: "Años lectivos — PUM Web" };

export default async function YearPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const showOnboarding = !cookieStore.has("pum_onboarded");

  const years = await planificationService.getYearsForTeacher(session.user.id);

  if (years.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div
          className="w-full max-w-md text-center px-10 py-12"
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.55)",
            borderRadius: "1.25rem",
            boxShadow: "0 4px 24px rgba(0,39,83,0.08), inset 0 1px 0 rgba(255,255,255,0.80)",
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "#fef5e0", border: "1px solid rgba(192,119,0,0.18)" }}
          >
            <span className="text-pum-warning text-xl font-bold" aria-hidden="true">!</span>
          </div>
          <h1 className="text-lg font-semibold text-pum-text mb-2">Sin asignaciones</h1>
          <p className="text-sm text-pum-text-muted leading-relaxed">
            No tienes materias asignadas para el año lectivo actual.
            Contacta al administrador para configurar tus asignaciones.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl">

        {showOnboarding && <OnboardingBanner />}

        {/* Encabezado de sección */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-pum-text">Planificaciones PUM</h1>
          <p className="text-sm text-pum-text-muted mt-1">
            Selecciona el año lectivo para continuar
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {years.map((year) => (
            <Link key={year.id} href={ROUTES.TEACHER.subjectsYear(year.id)} className="group block">
              <div className="pum-glass-card flex items-center justify-between px-6 py-5 cursor-pointer">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-pum-text group-hover:text-pum-primary transition-colors">
                      {year.label}
                    </h2>
                    {year.active && (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ background: "#fccc38", color: "#6f5600" }}
                      >
                        Activo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-pum-text-muted mt-0.5">
                    {year.assignmentCount}{" "}
                    {year.assignmentCount === 1 ? "materia asignada" : "materias asignadas"}
                  </p>
                </div>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-pum-text-disabled group-hover:text-pum-primary transition-all flex-shrink-0"
                  style={{ background: "rgba(0,39,83,0.05)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
