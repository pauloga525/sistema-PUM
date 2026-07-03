import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { coordinatorService } from "@/modules/coordinator/coordinator.service";
import { ROUTES } from "@/constants/routes";
import Link from "next/link";
import { SendForSignatureButton } from "@/components/coordinator/SendForSignatureButton";
import type { FinalizedPlanEntry } from "@/modules/coordinator/coordinator.types";

export const metadata = { title: "Retroalimentación — Coordinador PUM" };

type Filter = "in-review" | "feedback-sent" | "approved" | undefined;

// ── Badges ─────────────────────────────────────────────────────────────────────

function ReviewBadge({ status }: { status: "IN_REVIEW" | "FEEDBACK_SENT" | "APPROVED" }) {
  if (status === "APPROVED") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: "#dcfce7", color: "#166534" }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#16a34a" }} />
        Aprobado
      </span>
    );
  }
  if (status === "FEEDBACK_SENT") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: "#dbeafe", color: "#1e40af" }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#2563eb" }} />
        Retroalimentación enviada
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: "#fef9c3", color: "#713f12" }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#ca8a04" }} />
      En revisión
    </span>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const color = pct === 100 ? "#16a34a" : pct >= 50 ? "#002753" : "#ca8a04";
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 rounded-full overflow-hidden flex-1"
        style={{ background: "rgba(0,39,83,0.08)", minWidth: "60px" }}
      >
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-semibold" style={{ color }}>
        {done}/{total}
      </span>
    </div>
  );
}

// ── Fila de plan ───────────────────────────────────────────────────────────────

function PlanRow({ entry, index }: { entry: FinalizedPlanEntry; index: number }) {
  const isFeedbackSent      = entry.review.status === "FEEDBACK_SENT";
  const isPendingSignature  = entry.planStatus === "PENDING_SIGNATURE";
  const canSendForSignature = entry.planStatus === "APPROVED";
  const isAdminRejected     = entry.planStatus === "ADMIN_REJECTED";
  const isSigned            = entry.planStatus === "SIGNED";

  return (
    <tr style={{ background: index % 2 === 0 ? "transparent" : "rgba(0,39,83,0.015)" }}>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-pum-text">{entry.teacherName ?? "—"}</p>
        <p className="text-[11px] text-pum-text-disabled">{entry.teacherEmail}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-pum-text">{entry.subjectName}</p>
        <p className="text-[11px] text-pum-text-disabled">{entry.levelCode}</p>
      </td>
      <td className="px-4 py-3 text-sm text-pum-text-muted">{entry.periodName}</td>
      <td className="px-4 py-3 text-sm text-pum-text-muted">{entry.yearLabel}</td>
      <td className="px-4 py-3 min-w-[120px]">
        <ProgressBar done={entry.review.approvedSections} total={entry.review.totalSections} />
      </td>
      <td className="px-4 py-3">
        {/* Estado de revisión + badge admin si aplica */}
        <div className="flex flex-col gap-1">
          <ReviewBadge status={entry.review.status} />
          {isAdminRejected && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "#ffdad6", color: "#ba1a1a" }}
              title={entry.adminRejectionComment ?? undefined}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#ba1a1a" }} />
              Rechazado por Admin
            </span>
          )}
          {isSigned && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "#ccfbf1", color: "#0f766e" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#0d9488" }} />
              Firmado y aprobado
            </span>
          )}
          {isAdminRejected && entry.adminRejectionComment && (
            <p
              className="text-[10px] max-w-[180px] truncate"
              style={{ color: "#ba1a1a" }}
              title={entry.adminRejectionComment}
            >
              {entry.adminRejectionComment}
            </p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Enviar / re-enviar para firma */}
          {(canSendForSignature || isAdminRejected) && (
            <SendForSignatureButton
              planId={entry.planificationId}
              isRejected={isAdminRejected}
            />
          )}
          {isPendingSignature && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "#f3e8ff", color: "#6b21a8" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#9333ea" }} />
              Pendiente de firma
            </span>
          )}
          {/* Ver / Revisar PUM */}
          {(canSendForSignature || isPendingSignature || isFeedbackSent || isAdminRejected || isSigned) ? (
            <Link
              href={ROUTES.COORDINATOR.review(entry.planificationId)}
              className="text-xs font-medium text-pum-text-muted hover:text-pum-primary underline underline-offset-2 transition-colors"
            >
              Ver PUM
            </Link>
          ) : (
            <Link
              href={ROUTES.COORDINATOR.review(entry.planificationId)}
              className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              style={{ background: "#002753" }}
            >
              Revisar PUM
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────────

export default async function RetroalimentacionPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth();
  if (!session) redirect(ROUTES.LOGIN);

  const { filter: rawFilter } = await searchParams;
  const filter = (["in-review", "feedback-sent", "approved"].includes(rawFilter ?? "")
    ? rawFilter
    : undefined) as Filter;

  const plans = await coordinatorService.getFinalizedPlans(session.user.id);

  const totalPlans        = plans.length;
  const approvedPlans     = plans.filter((p) => p.review.status === "APPROVED").length;
  const feedbackSentPlans = plans.filter((p) => p.review.status === "FEEDBACK_SENT").length;
  const inReview          = totalPlans - approvedPlans - feedbackSentPlans;

  const displayPlans = filter === "in-review"
    ? plans.filter((p) => p.review.status === "IN_REVIEW")
    : filter === "feedback-sent"
    ? plans.filter((p) => p.review.status === "FEEDBACK_SENT")
    : filter === "approved"
    ? plans.filter((p) => p.review.status === "APPROVED")
    : plans;

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-7">
        <div>
          <h1 className="text-2xl font-semibold text-pum-text">Retroalimentación</h1>
          <p className="text-sm text-pum-text-muted mt-0.5">
            Progreso de elaboración y revisión de PUMs de los docentes a tu cargo
          </p>
        </div>
        {totalPlans > 0 && (
          <div
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{
              background: approvedPlans === totalPlans ? "#dcfce7" : "rgba(0,39,83,0.06)",
              border: `1px solid ${approvedPlans === totalPlans ? "rgba(22,163,74,0.25)" : "rgba(0,39,83,0.10)"}`,
            }}
          >
            <span
              className="text-sm font-semibold"
              style={{ color: approvedPlans === totalPlans ? "#166534" : "#002753" }}
            >
              {approvedPlans} de {totalPlans} aprobados
            </span>
          </div>
        )}
      </div>

      {/* Estadísticas */}
      {totalPlans > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
          {([
            { label: "PUMs en ciclo",               value: totalPlans,        color: "#002753", bg: "rgba(0,39,83,0.06)",  filterVal: undefined },
            { label: "Pendientes de revisión",      value: inReview,          color: "#713f12", bg: "#fef9c3",            filterVal: "in-review" },
            { label: "Retroalimentación enviada",   value: feedbackSentPlans, color: "#1e40af", bg: "#dbeafe",            filterVal: "feedback-sent" },
            { label: "Aprobados",                   value: approvedPlans,     color: "#166534", bg: "#dcfce7",            filterVal: "approved" },
          ] as const).map((s) => {
            const isActive = filter === s.filterVal || (s.filterVal === undefined && filter === undefined);
            const href = s.filterVal ? `?filter=${s.filterVal}#plans-table` : "/coordinator/retroalimentacion#plans-table";
            return (
              <Link
                key={s.label}
                href={href}
                className="rounded-2xl p-5 flex items-center gap-4 transition-all"
                style={{
                  background: "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(12px)",
                  border: isActive ? `1.5px solid ${s.color}40` : "1px solid rgba(195,198,210,0.70)",
                  boxShadow: isActive ? `0 2px 12px ${s.color}18` : "0 2px 12px rgba(0,39,83,0.05)",
                  outline: "none",
                }}
              >
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: s.bg }}>
                  <span className="text-xl font-bold" style={{ color: s.color }}>{s.value}</span>
                </div>
                <p className="text-xs text-pum-text-muted">{s.label}</p>
              </Link>
            );
          })}
        </div>
      )}

      {/* Filter active badge */}
      {filter && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-pum-text-muted">Filtrando por:</span>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: "rgba(0,39,83,0.08)", color: "#002753" }}
          >
            {filter === "in-review" ? "Pendientes de revisión" : filter === "feedback-sent" ? "Retroalimentación enviada" : "Aprobados"}
          </span>
          <Link href="/coordinator/retroalimentacion" className="text-xs text-pum-text-muted underline underline-offset-2 hover:text-pum-text">
            Ver todos
          </Link>
        </div>
      )}

      {/* Sin planes */}
      {totalPlans === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div
            className="text-center rounded-2xl px-10 py-12 max-w-sm"
            style={{
              background: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(195,198,210,0.70)",
            }}
          >
            <p className="text-lg font-semibold text-pum-text mb-2">Sin PUMs para revisar</p>
            <p className="text-sm text-pum-text-muted">
              Los docentes a tu cargo aún no han finalizado ningún PUM, o no tienes docentes asignados.
            </p>
          </div>
        </div>
      )}

      {/* Tabla */}
      {totalPlans > 0 && (
        <div
          id="plans-table"
          className="overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(195,198,210,0.70)",
            borderRadius: "1.25rem",
            boxShadow: "0 2px 12px rgba(0,39,83,0.05)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: "rgba(0,39,83,0.04)", borderBottom: "1px solid rgba(0,39,83,0.07)" }}>
                  {["Docente", "Materia / Nivel", "Período", "Año lectivo", "Progreso revisión", "Retroalimentación", "Acciones"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-pum-text-muted whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayPlans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-pum-text-muted italic">
                      No hay PUMs para el filtro seleccionado.
                    </td>
                  </tr>
                ) : (
                  displayPlans.map((entry, i) => (
                    <PlanRow key={entry.planificationId} entry={entry} index={i} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
