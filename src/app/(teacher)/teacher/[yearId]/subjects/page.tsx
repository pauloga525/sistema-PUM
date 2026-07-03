import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { planificationService } from "@/modules/planification/planification.service";
import { prisma } from "@/lib/prisma/client";
import { ROUTES } from "@/constants/routes";
import { BreadcrumbPUM } from "@/components/layout/BreadcrumbPUM";
import Link from "next/link";
import type { DisplayStatus } from "@/modules/planification/planification.types";

export const metadata = { title: "Mis materias — PUM Web" };

// ── Server Action ─────────────────────────────────────────────────────────────

async function openPlanification(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session) redirect("/login");

  const yearId    = formData.get("yearId")    as string;
  const periodId  = formData.get("periodId")  as string;
  const subjectId = formData.get("subjectId") as string;
  const levelId   = formData.get("levelId")   as string;

  if (!yearId || !periodId || !subjectId || !levelId) redirect("/teacher/year");

  const { planId } = await planificationService.getOrCreatePlanification(
    session.user.id, yearId, periodId, subjectId, levelId
  );

  redirect(ROUTES.TEACHER.planification(yearId, periodId, planId));
}

// ── Badges ────────────────────────────────────────────────────────────────────

const STATUS: Record<DisplayStatus, { label: string; bg: string; color: string; dot: string }> = {
  NOT_STARTED:       { label: "Sin comenzar",      bg: "#EEF1F8", color: "#5A6A82", dot: "#B8C4D6" },
  DRAFT:             { label: "En progreso",        bg: "#dce8ff", color: "#002753", dot: "#003d7a" },
  FINALIZED:         { label: "Finalizado",         bg: "#e0f5ee", color: "#0d8a5e", dot: "#0d8a5e" },
  OVERDUE:           { label: "Vencido",            bg: "#fdecea", color: "#c62828", dot: "#c62828" },
  FEEDBACK_RECEIVED: { label: "Con observaciones", bg: "#fff7ed", color: "#b45309", dot: "#f97316" },
  APPROVED:          { label: "Aprobado",           bg: "#f0fdf4", color: "#166534", dot: "#16a34a" },
};

function StatusBadge({ status }: { status: DisplayStatus }) {
  const s = STATUS[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default async function SubjectsYearPage({
  params,
}: {
  params: Promise<{ yearId: string }>;
}) {
  const { yearId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const year = await prisma.academicYear.findUnique({ where: { id: yearId } });
  if (!year) notFound();

  const subjects = await planificationService.getSubjectsForYear(session.user.id, yearId);

  // Progreso global
  const totalSlots     = subjects.reduce((s, sub) => s + sub.periods.length, 0);
  const finalizedSlots = subjects.reduce(
    (s, sub) => s + sub.periods.filter((p) => ["FINALIZED", "FEEDBACK_RECEIVED", "APPROVED"].includes(p.displayStatus)).length,
    0
  );

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-4xl mx-auto w-full">

      {/* Breadcrumb */}
      <div className="mb-6">
        <BreadcrumbPUM
          items={[
            { label: "Años lectivos", href: ROUTES.TEACHER.YEAR },
            { label: year.label },
          ]}
        />
      </div>

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-pum-text">{year.label}</h1>
          <p className="text-sm text-pum-text-muted mt-1">
            {subjects.length} {subjects.length === 1 ? "materia asignada" : "materias asignadas"}
          </p>
        </div>
        {totalSlots > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full self-start sm:self-auto"
            style={{ background: "#e0f5ee", border: "1px solid rgba(13,138,94,0.15)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-pum-success" />
            <p className="text-xs font-medium" style={{ color: "#0d8a5e" }}>
              {finalizedSlots} de {totalSlots} PUMs finalizados
            </p>
          </div>
        )}
      </div>

      {/* Sin materias */}
      {subjects.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <p className="text-pum-text-muted text-sm">
              No tienes materias asignadas para este año lectivo.
            </p>
            <Link
              href={ROUTES.TEACHER.YEAR}
              className="text-sm font-medium text-pum-primary hover:underline underline-offset-2 mt-3 inline-block"
            >
              ← Volver al inicio
            </Link>
          </div>
        </div>
      )}

      {/* Sin periodos configurados */}
      {subjects.length > 0 && subjects[0].periods.length === 0 && (
        <div
          className="rounded-xl px-5 py-4"
          style={{ background: "#fff8e1", border: "1px solid rgba(117,91,0,0.22)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#755b00" }}>
            El administrador aún no ha configurado los periodos (trimestres) para este año lectivo.
          </p>
        </div>
      )}

      {/* Tarjetas de materias */}
      <div className="flex flex-col gap-4">
        {subjects.map((sub) => (
          <div
            key={`${sub.subjectId}-${sub.levelId}`}
            style={{
              background:            "rgba(255,255,255,0.88)",
              backdropFilter:        "blur(10px)",
              WebkitBackdropFilter:  "blur(10px)",
              border:                "1px solid rgba(224,230,240,0.85)",
              borderRadius:          "1rem",
              boxShadow:             "0 2px 10px rgba(0,39,83,0.05), inset 0 1px 0 rgba(255,255,255,0.90)",
              overflow:              "hidden",
            }}
          >
            {/* Encabezado de la tarjeta */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "rgba(0,39,83,0.07)", background: "rgba(0,39,83,0.025)" }}
            >
              <div>
                <p className="font-semibold text-base text-pum-text">{sub.subjectName}</p>
                <p className="text-xs text-pum-text-muted mt-0.5">{sub.levelName}</p>
              </div>
            </div>

            {/* Filas de trimestres */}
            {sub.periods.length === 0 ? (
              <p className="px-5 py-4 text-xs text-pum-text-muted">Sin trimestres configurados.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(0,39,83,0.05)" }}>
                {sub.periods.map((period, idx) => (
                  <div
                    key={period.periodId}
                    className="flex items-center justify-between px-5 py-3.5 gap-4"
                    style={{ background: idx % 2 !== 0 ? "rgba(0,39,83,0.012)" : "transparent" }}
                  >
                    {/* Nombre del trimestre */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                        style={{ background: "#002753", color: "#fccc38" }}
                      >
                        {period.periodNumber}
                      </span>
                      <span className="text-sm text-pum-text font-medium truncate">
                        {period.periodName}
                      </span>
                    </div>

                    {/* Estado */}
                    <StatusBadge status={period.displayStatus} />

                    {/* Acción */}
                    <div className="flex-shrink-0">
                      {period.displayStatus === "NOT_STARTED" ? (
                        <form action={openPlanification}>
                          <input type="hidden" name="yearId"    value={yearId} />
                          <input type="hidden" name="periodId"  value={period.periodId} />
                          <input type="hidden" name="subjectId" value={sub.subjectId} />
                          <input type="hidden" name="levelId"   value={sub.levelId} />
                          <button
                            type="submit"
                            className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg cursor-pointer bg-pum-primary hover:bg-pum-primary-hover whitespace-nowrap"
                          >
                            Crear PUM
                          </button>
                        </form>
                      ) : (
                        <Link
                          href={ROUTES.TEACHER.planification(yearId, period.periodId, period.planId!)}
                          className="text-xs font-semibold text-pum-primary hover:underline underline-offset-2 whitespace-nowrap"
                        >
                          {["FINALIZED", "APPROVED"].includes(period.displayStatus) ? "Ver PUM" : "Editar PUM"}
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
