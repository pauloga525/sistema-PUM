import Link from "next/link";
import { notFound } from "next/navigation";
import { superAdminPlanService } from "@/modules/superadmin/superadmin-plan.service";
import { auditService } from "@/modules/audit/audit.service";
import { PlanAdminActions } from "@/components/superadmin/PlanAdminActions";
import { ROUTES } from "@/constants/routes";

export const metadata = { title: "Gestión de PUM — SuperAdmin" };

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:             { label: "Borrador",               bg: "#f3f4f6", color: "#374151" },
  FINALIZED:         { label: "Enviado a revisión",     bg: "#dbeafe", color: "#1e40af" },
  FEEDBACK_RECEIVED: { label: "Con observaciones",      bg: "#fef3c7", color: "#92400e" },
  APPROVED:          { label: "Aprobado",               bg: "#dcfce7", color: "#166534" },
  PENDING_SIGNATURE: { label: "Pendiente de firma",     bg: "#fce7f3", color: "#9d174d" },
  SIGNED:            { label: "Firmado",                bg: "#ede9fe", color: "#4c1d95" },
  ADMIN_REJECTED:    { label: "Rechazado",              bg: "#fee2e2", color: "#991b1b" },
};

const EVENT_ICON: Record<string, string> = {
  PLAN_CREATED:           "📄",
  FINALIZED:              "📤",
  TEACHER_RESUBMITTED:    "🔄",
  REVIEW_STARTED:         "🔍",
  SECTION_COMMENTED:      "💬",
  SECTION_APPROVED:       "✅",
  SECTION_APPROVAL_REMOVED: "↩️",
  FEEDBACK_SENT:          "📩",
  PLAN_APPROVED:          "🎉",
  SENT_FOR_SIGNATURE:     "✍️",
  SIGNED:                 "📋",
  ADMIN_REJECTED:         "❌",
  STATE_CORRECTED:        "🛠️",
  COORDINATOR_REASSIGNED: "🔀",
};

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  let plan;
  try {
    plan = await superAdminPlanService.getPlanDetail(planId);
  } catch {
    notFound();
  }

  const [history, coordinators] = await Promise.all([
    auditService.getHistory(planId),
    superAdminPlanService.getAvailableCoordinators(),
  ]);

  const badge = STATUS_BADGE[plan.status] ?? { label: plan.status, bg: "#f3f4f6", color: "#374151" };

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-pum-text-muted">
        <Link href={ROUTES.SUPERADMIN.PLANS} className="hover:text-pum-text hover:underline underline-offset-2">
          PUM del Sistema
        </Link>
        <span>/</span>
        <span className="text-pum-text">{plan.subjectName}</span>
      </div>

      {/* Header del plan */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-xl font-semibold text-pum-text">{plan.subjectName}</h1>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: badge.bg, color: badge.color }}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-pum-text-muted">
            {plan.levelName} · {plan.yearLabel} · {plan.periodName}
          </p>
          <p className="text-sm text-pum-text-muted mt-0.5">
            Docente: <span className="text-pum-text">{plan.teacherName ?? plan.teacherEmail}</span>
          </p>
          {plan.coordinatorName && (
            <p className="text-sm text-pum-text-muted mt-0.5">
              Coordinador: <span className="text-pum-text">{plan.coordinatorName}</span>
            </p>
          )}
        </div>
        <Link
          href={ROUTES.SUPERADMIN.pumPreview(planId)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-pum-border text-sm font-medium text-pum-text hover:shadow-sm transition-shadow"
        >
          Ver contenido del PUM ↗
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Acciones administrativas */}
        <div>
          <h2 className="text-sm font-semibold text-pum-text mb-4">Acciones administrativas</h2>
          <PlanAdminActions
            planId={planId}
            currentStatus={plan.status}
            coordinators={coordinators}
            currentCoordinatorId={plan.coordinatorId}
          />
        </div>

        {/* Historial de auditoría */}
        <div>
          <h2 className="text-sm font-semibold text-pum-text mb-4">
            Historial ({history.length} eventos)
          </h2>
          <div className="rounded-xl border border-pum-border bg-white overflow-hidden">
            {history.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-pum-text-muted italic">
                Sin eventos registrados.
              </p>
            ) : (
              <ul className="divide-y divide-pum-border max-h-[600px] overflow-y-auto">
                {history.map((ev) => (
                  <li key={ev.id} className="px-4 py-3 text-sm">
                    <div className="flex items-start gap-3">
                      <span className="text-base flex-shrink-0 mt-0.5">{EVENT_ICON[ev.eventType] ?? "•"}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-pum-text leading-snug">{ev.eventLabel}</p>
                        {ev.actorName && (
                          <p className="text-xs text-pum-text-muted mt-0.5">
                            {ev.actorRoleLabel ?? ev.actorRole}: {ev.actorName}
                          </p>
                        )}
                        {ev.sectionLabel && (
                          <p className="text-xs text-pum-text-muted">Sección: {ev.sectionLabel}</p>
                        )}
                        {ev.comment && (
                          <p className="text-xs text-pum-text-muted mt-1 italic line-clamp-2">
                            &ldquo;{ev.comment}&rdquo;
                          </p>
                        )}
                        <p className="text-xs text-pum-text-muted mt-1">
                          {new Date(ev.createdAt).toLocaleString("es-EC", {
                            day: "2-digit", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
