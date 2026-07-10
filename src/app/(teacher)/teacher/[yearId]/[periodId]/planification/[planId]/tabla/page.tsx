import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { planificationService } from "@/modules/planification/planification.service";
import { coordinatorService } from "@/modules/coordinator/coordinator.service";
import { ROUTES } from "@/constants/routes";
import { BreadcrumbPUM } from "@/components/layout/BreadcrumbPUM";
import { PlanificationTable } from "@/components/planification/PlanificationTable";
import { ExportMenu } from "@/components/planification/ExportMenu";
import { StepIndicator } from "@/components/planification/StepIndicator";
import { PlanLifecycleBar } from "@/components/planification/PlanLifecycleBar";
import { saveRowsAction, finalizeAction, clearCoordinatorFeedbackAction } from "../actions";
import type { SectionState } from "@/constants/review";
import Link from "next/link";

export const metadata = { title: "Plan de Unidad — PUM" };

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:             { label: "Borrador",             bg: "#edeeef", color: "#434750" },
  FINALIZED:         { label: "Finalizado",            bg: "#e0f5ee", color: "#0d8a5e" },
  OVERDUE:           { label: "Plazo vencido",         bg: "#ffdad6", color: "#ba1a1a" },
  FEEDBACK_RECEIVED: { label: "Con observaciones",    bg: "#fff7ed", color: "#b45309" },
  APPROVED:          { label: "Aprobado",              bg: "#dcfce7", color: "#166534" },
  PENDING_SIGNATURE: { label: "Pendiente de firma",   bg: "#dce8ff", color: "#003d7a" },
  SIGNED:            { label: "Firmado y aprobado",   bg: "#ccfbf1", color: "#0f766e" },
  ADMIN_REJECTED:    { label: "Rechazado por Admin",  bg: "#ffdad6", color: "#ba1a1a" },
};

function isMetadataComplete(meta: {
  areaEstudio?: string;
  numUnidad?: string;
  titulo?: string;
  objetivos?: string[];
  criterios?: string[];
  nPeriodos?: string;
  fechInicio?: string;
  fechFin?: string;
  ejesTransversales?: string;
} | null): boolean {
  if (!meta) return false;
  return !!(
    meta.areaEstudio?.trim() &&
    meta.numUnidad?.trim() &&
    meta.titulo?.trim() &&
    (meta.objetivos ?? []).some((o) => o.trim()) &&
    (meta.criterios ?? []).some((c) => c.trim()) &&
    meta.nPeriodos?.trim() &&
    meta.fechInicio?.trim() &&
    meta.fechFin?.trim() &&
    meta.ejesTransversales?.trim()
  );
}

export default async function PlanTablaPage({
  params,
}: {
  params: Promise<{ yearId: string; periodId: string; planId: string }>;
}) {
  const { yearId, periodId, planId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  let plan;
  try {
    plan = await planificationService.getById(planId, session.user.id);
  } catch {
    redirect(ROUTES.TEACHER.subjects(yearId, periodId));
  }

  const [year, period, subject, level] = await Promise.all([
    prisma.academicYear.findUnique({ where: { id: yearId } }),
    prisma.period.findUnique({ where: { id: periodId } }),
    prisma.subject.findUnique({ where: { id: plan!.subjectId } }),
    prisma.level.findUnique({ where: { id: plan!.levelId } }),
  ]);

  if (!year || !period || !subject || !level) {
    redirect(ROUTES.TEACHER.subjects(yearId, periodId));
  }

  const isFeedbackReceived = plan!.status === "FEEDBACK_RECEIVED";
  const isApproved         = plan!.status === "APPROVED";
  const isPendingSignature = plan!.status === "PENDING_SIGNATURE";
  const isSigned           = plan!.status === "SIGNED";
  const isAdminRejected    = plan!.status === "ADMIN_REJECTED";
  // All post-submission states are read-only; only DRAFT and FEEDBACK_RECEIVED are editable
  const isFinalized = ["FINALIZED", "APPROVED", "PENDING_SIGNATURE", "SIGNED", "ADMIN_REJECTED"].includes(plan!.status);
  // Non-editors also get a read-only view
  const isReadOnly = isFinalized || !plan!.isEditor;

  // Guard: metadata must be complete before accessing the tabla (skip for FEEDBACK_RECEIVED since it was already submitted)
  if (!isFinalized && !isFeedbackReceived && !isMetadataComplete(plan!.metadata)) {
    redirect(ROUTES.TEACHER.planification(yearId, periodId, planId));
  }

  const statusConfig = STATUS_BADGE[plan!.status] ?? STATUS_BADGE.DRAFT;
  const metaPath = ROUTES.TEACHER.planification(yearId, periodId, plan!.id);

  // Load review data if there's coordinator feedback or plan was reviewed
  const review = (isFeedbackReceived || isApproved || isPendingSignature || isSigned || isAdminRejected)
    ? await coordinatorService.getReviewForTeacher(planId)
    : null;

  // Extract per-row feedback (row_0, row_1, ...) from sectionStates
  const rowFeedback: Record<number, SectionState> = {};
  if (review?.sectionStates) {
    for (const [key, state] of Object.entries(review.sectionStates)) {
      const match = /^row_(\d+)$/.exec(key);
      if (match && state) rowFeedback[parseInt(match[1])] = state;
    }
  }

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 w-full">
      {/* Breadcrumb */}
      <div className="mb-6">
        <BreadcrumbPUM
          items={[
            { label: "Años lectivos", href: ROUTES.TEACHER.YEAR },
            { label: year.label, href: ROUTES.TEACHER.period(yearId) },
            { label: period.name, href: ROUTES.TEACHER.subjects(yearId, periodId) },
            { label: subject.name },
          ]}
        />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-pum-text">{subject.name}</h1>
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: statusConfig.bg, color: statusConfig.color }}
            >
              {statusConfig.label}
            </span>
          </div>
          <p className="text-sm text-pum-text-muted mt-1">
            {level.name} · {period.name} · {year.label}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start flex-wrap">
          <Link
            href={ROUTES.TEACHER.preview(yearId, periodId, plan!.id)}
            className="text-xs font-semibold rounded-full px-3.5 py-1.5 transition-all duration-150"
            style={{
              background: "rgba(255,255,255,0.82)",
              border: "1px solid rgba(26,47,90,0.20)",
              color: "#1a2f5a",
              boxShadow: "0 1px 4px rgba(26,47,90,0.06), inset 0 1px 0 rgba(255,255,255,0.90)",
            }}
          >
            Vista previa
          </Link>
          <ExportMenu planId={plan!.id} />
        </div>
      </div>

      {/* Lifecycle status bar */}
      <PlanLifecycleBar status={plan!.status} />

      {/* Step indicator */}
      <StepIndicator activeStep={2} step1Href={metaPath} />

      {/* Approved notice */}
      {isApproved && (
        <div
          className="rounded-xl px-4 py-3 mb-6"
          style={{ background: "#dcfce7", border: "1px solid rgba(22,163,74,0.25)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#166634" }}>
            ✓ Este PUM fue aprobado por el coordinador y está en modo de solo lectura.
          </p>
        </div>
      )}

      {/* Pending signature notice */}
      {isPendingSignature && (
        <div
          className="rounded-xl px-4 py-3 mb-6"
          style={{ background: "#dce8ff", border: "1px solid rgba(0,61,122,0.22)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#003d7a" }}>
            Este PUM está pendiente de firma por el administrador. Solo lectura.
          </p>
        </div>
      )}

      {/* Signed notice */}
      {isSigned && (
        <div
          className="rounded-xl px-4 py-3 mb-6"
          style={{ background: "#ccfbf1", border: "1px solid rgba(13,138,94,0.25)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#0f766e" }}>
            ✓ Este PUM fue firmado y aprobado por el administrador. Solo lectura.
          </p>
        </div>
      )}

      {/* Admin rejected notice */}
      {isAdminRejected && (
        <div
          className="rounded-xl px-4 py-3 mb-6"
          style={{ background: "#ffdad6", border: "1px solid rgba(186,26,26,0.22)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#ba1a1a" }}>
            Este PUM fue rechazado por el administrador. El coordinador debe revisarlo. Solo lectura.
          </p>
        </div>
      )}

      {/* Finalized notice (waiting for review) */}
      {plan!.status === "FINALIZED" && (
        <div
          className="rounded-xl px-4 py-3 mb-6"
          style={{ background: "#e0f5ee", border: "1px solid rgba(13,138,94,0.20)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#0d8a5e" }}>
            Esta planificación fue finalizada el{" "}
            {plan!.finalizedAt?.toLocaleDateString("es-EC", {
              day: "2-digit", month: "long", year: "numeric",
            }) ?? "—"}{" "}
            y está en modo de solo lectura.
          </p>
        </div>
      )}

      {/* Feedback received notice */}
      {isFeedbackReceived && (
        <div
          className="rounded-xl px-4 py-3 mb-4"
          style={{ background: "#fff7ed", border: "1px solid rgba(249,115,22,0.30)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#b45309" }}>
            Tu coordinador revisó el PUM y dejó observaciones. Revisa los comentarios de cada fila, realiza las correcciones y finaliza de nuevo.
          </p>
        </div>
      )}

      {/* Editor / viewer notice */}
      {!plan!.isEditor && plan!.editorName && !isFinalized && (
        <div
          className="rounded-xl px-4 py-3 mb-6 flex items-start gap-3"
          style={{ background: "#f1f5f9", border: "1px solid rgba(0,39,83,0.12)" }}
        >
          <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a6a82" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <p className="text-sm" style={{ color: "#334155" }}>
            El docente <strong>{plan!.editorName}</strong> se ha encargado de realizar este PUM.
            Puedes consultarlo en modo de solo lectura.
          </p>
        </div>
      )}

      {/* Deadline notice */}
      {!isFinalized && !isFeedbackReceived && plan!.editDeadlineAt && (
        <div
          className="rounded-xl px-4 py-3 mb-6"
          style={{ background: "#fff8e1", border: "1px solid rgba(117,91,0,0.22)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#755b00" }}>
            Plazo de entrega:{" "}
            {plan!.editDeadlineAt.toLocaleDateString("es-EC", {
              day: "2-digit", month: "long", year: "numeric",
            })}
          </p>
        </div>
      )}

      {/* PUM table */}
      <PlanificationTable
        planId={plan!.id}
        initialRows={plan!.rows}
        isFinalized={isReadOnly}
        onSave={saveRowsAction}
        onFinalize={finalizeAction}
        onClearFeedback={clearCoordinatorFeedbackAction}
        rowFeedback={Object.keys(rowFeedback).length > 0 ? rowFeedback : undefined}
        />

      {/* Row count hint */}
      {!isFinalized && (
        <p className="text-xs text-pum-text-disabled mt-3 text-right">
          Máximo 50 filas por planificación · Los cambios no se guardan automáticamente
        </p>
      )}
    </div>
  );
}
