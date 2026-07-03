import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { planificationService } from "@/modules/planification/planification.service";
import { prisma } from "@/lib/prisma/client";
import { ROUTES } from "@/constants/routes";
import { BreadcrumbPUM } from "@/components/layout/BreadcrumbPUM";
import { CreatePlanButton } from "@/components/teacher/CreatePlanButton";
import Link from "next/link";
import type { DisplayStatus } from "@/modules/planification/planification.types";

export const metadata = { title: "Mis materias — PUM Web" };


// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<DisplayStatus, { label: string; bg: string; color: string; dot: string }> = {
  NOT_STARTED:       { label: "Sin comenzar",      bg: "#EEF1F8", color: "#5A6A82", dot: "#B8C4D6" },
  DRAFT:             { label: "En progreso",        bg: "#dce8ff", color: "#002753", dot: "#003d7a" },
  FINALIZED:         { label: "Finalizado",         bg: "#e0f5ee", color: "#0d8a5e", dot: "#0d8a5e" },
  OVERDUE:           { label: "Vencido",            bg: "#fdecea", color: "#c62828", dot: "#c62828" },
  FEEDBACK_RECEIVED: { label: "Con observaciones", bg: "#fff7ed", color: "#b45309", dot: "#f97316" },
  APPROVED:          { label: "Aprobado",           bg: "#f0fdf4", color: "#166534", dot: "#16a34a" },
};

function StatusBadge({ status }: { status: DisplayStatus }) {
  const { label, bg, color, dot } = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: bg, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
      {label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function SubjectsPage({
  params,
}: {
  params: Promise<{ yearId: string; periodId: string }>;
}) {
  const { yearId, periodId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const [year, period, subjects] = await Promise.all([
    prisma.academicYear.findUnique({ where: { id: yearId } }),
    prisma.period.findUnique({ where: { id: periodId } }),
    planificationService.getSubjectsWithStatus(session.user.id, yearId, periodId),
  ]);

  if (!year || !period) notFound();

  const finalized = subjects.filter((s) => ["FINALIZED", "FEEDBACK_RECEIVED", "APPROVED"].includes(s.displayStatus)).length;

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-4xl mx-auto w-full">

      {/* Breadcrumb */}
      <div className="mb-6">
        <BreadcrumbPUM
          items={[
            { label: "Años lectivos", href: ROUTES.TEACHER.YEAR },
            { label: year.label, href: ROUTES.TEACHER.period(yearId) },
            { label: period.name },
          ]}
        />
      </div>

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-pum-text">{period.name}</h1>
          <p className="text-sm text-pum-text-muted mt-1">
            {year.label} · {subjects.length}{" "}
            {subjects.length === 1 ? "materia asignada" : "materias asignadas"}
          </p>
        </div>
        {subjects.length > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full self-start sm:self-auto"
            style={{ background: "#e0f5ee", border: "1px solid rgba(13,138,94,0.15)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-pum-success" />
            <p className="text-xs font-medium" style={{ color: "#0d8a5e" }}>
              {finalized} de {subjects.length} finalizadas
            </p>
          </div>
        )}
      </div>

      {/* Lista de materias */}
      {subjects.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <p className="text-pum-text-muted text-sm">
              No tienes materias asignadas para este período.
            </p>
            <Link
              href={ROUTES.TEACHER.YEAR}
              className="text-sm font-medium text-pum-primary hover:underline underline-offset-2 mt-3 inline-block"
            >
              ← Volver al inicio
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Cabecera de columnas */}
          <div className="hidden sm:grid grid-cols-[1fr_160px_140px_110px] gap-4 px-5 pb-2">
            <span className="text-[11px] font-semibold text-pum-text-disabled uppercase tracking-wider">Materia</span>
            <span className="text-[11px] font-semibold text-pum-text-disabled uppercase tracking-wider">Nivel</span>
            <span className="text-[11px] font-semibold text-pum-text-disabled uppercase tracking-wider">Estado</span>
            <span className="sr-only">Acciones</span>
          </div>

          {subjects.map((s) => (
            <div
              key={s.assignmentId}
              className="flex flex-col sm:grid sm:grid-cols-[1fr_160px_140px_110px] sm:items-center gap-3 px-5 py-4 transition-all duration-150"
              style={{
                background:         "rgba(255,255,255,0.82)",
                backdropFilter:     "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border:             "1px solid rgba(224,230,240,0.80)",
                borderRadius:       "0.875rem",
                boxShadow:          "0 1px 6px rgba(0,39,83,0.04), inset 0 1px 0 rgba(255,255,255,0.90)",
              }}
            >
              {/* Materia */}
              <div>
                <p className="font-semibold text-sm text-pum-text">{s.subject.name}</p>
                <p className="text-xs text-pum-text-muted sm:hidden mt-0.5">{s.level.name}</p>
              </div>

              {/* Nivel */}
              <p className="hidden sm:block text-sm text-pum-text-muted">{s.level.name}</p>

              {/* Estado */}
              <StatusBadge status={s.displayStatus} />

              {/* Acción */}
              {s.displayStatus === "NOT_STARTED" ? (
                <CreatePlanButton
                  subjectName={s.subject.name}
                  levelName={s.level.name}
                  onCreate={async () => {
                    "use server";
                    const s2 = await auth();
                    if (!s2) redirect("/login");
                    const { planId } = await planificationService.getOrCreatePlanification(
                      s2.user.id, yearId, periodId, s.subject.id, s.level.id
                    );
                    redirect(ROUTES.TEACHER.planification(yearId, periodId, planId));
                  }}
                />
              ) : (
                <Link
                  href={ROUTES.TEACHER.planification(yearId, periodId, s.planification!.id)}
                  className="text-xs font-semibold text-pum-primary hover:text-pum-primary-hover hover:underline underline-offset-2 transition-colors whitespace-nowrap"
                >
                  {s.displayStatus === "FINALIZED"        ? "Ver PUM"
                    : s.displayStatus === "APPROVED"      ? "Ver PUM"
                    : s.displayStatus === "FEEDBACK_RECEIVED" ? "Corregir PUM"
                    : "Editar PUM"}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
