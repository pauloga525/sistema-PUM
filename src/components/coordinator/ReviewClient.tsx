"use client";

import { useOptimistic, useState, useTransition } from "react";
import { REVIEW_SECTION_KEYS, type AnySectionKey, type SectionState, type SectionStates, type ReviewStatus } from "@/constants/review";
import type { PlanMetadata, PumRowData } from "@/modules/planification/planification.types";
import type { AuditHistoryItem, SignatureBlockData } from "@/modules/audit/audit.service";
import { SignatureBlock } from "@/components/planification/SignatureBlock";
import { PlanDocument, type PlanDocumentReview } from "@/components/plan-document/PlanDocument";
import { SectionControl } from "./review/SectionControl";
import { CoordinatorReviewBar, ReviewProgress } from "./review/CoordinatorReviewBar";
import { AdminSignBar } from "./review/AdminSignBar";
import { AuditHistoryModal } from "./review/AuditHistoryModal";

// ── Tipos de props ─────────────────────────────────────────────────────────────

interface PlanRow {
  id: string;
  rowIndex: number;
  data: PumRowData;
}

interface ReviewClientProps {
  planId: string;
  reviewId: string;
  initialSectionStates: SectionStates;
  initialStatus: ReviewStatus;
  plan: {
    teacherName: string | null;
    subjectName: string;
    levelName:   string;
    levelCode:   string;
    levelTrack:  string;
    periodName:  string;
    yearLabel:   string;
    metadata:    PlanMetadata | null;
    rows:        PlanRow[];
  };
  appConfig: { institutionName: string };
  logos: { left: boolean; right: boolean };
  onUpdateSection?: (reviewId: string, key: string, approved: boolean, comment: string | null) => Promise<{ success: boolean }>;
  onSendFeedback?:  (reviewId: string, planId: string) => Promise<{ success: boolean }>;
  onApprovePlan?:   (reviewId: string, planId: string) => Promise<{ success: boolean }>;
  onGetAuditHistory?: (planId: string) => Promise<{ success: boolean; data?: AuditHistoryItem[] }>;
  /** Solo admin: muestra Firmar/Rechazar y oculta los controles del coordinador */
  adminMode?: boolean;
  onSignPlan?:   () => Promise<{ success: boolean }>;
  onRejectPlan?: (comment: string) => Promise<{ success: boolean }>;
  signatureBlock?: SignatureBlockData | null;
}

type SectionUpdate = { key: AnySectionKey; value: SectionState };

// Secciones de cabecera/metadatos con control de revisión (las pum_* no se muestran)
const ACTIVE_SECTION_KEYS = REVIEW_SECTION_KEYS.filter((k) => !k.startsWith("pum_"));

// ── Componente principal ────────────────────────────────────────────────────────

export function ReviewClient({
  planId,
  reviewId,
  initialSectionStates,
  initialStatus,
  plan,
  appConfig,
  logos,
  onUpdateSection,
  onSendFeedback,
  onApprovePlan,
  onGetAuditHistory,
  adminMode = false,
  onSignPlan,
  onRejectPlan,
  signatureBlock,
}: ReviewClientProps) {
  // Estado confirmado por el servidor + capa optimista que se revierte si el guardado falla
  const [savedStates, setSavedStates] = useState<SectionStates>(initialSectionStates);
  const [states, applyOptimistic] = useOptimistic(
    savedStates,
    (current, { key, value }: SectionUpdate) => ({ ...current, [key]: value }),
  );
  const [status, setStatus] = useState<ReviewStatus>(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  // Historial de auditoría
  const [showHistory, setShowHistory]       = useState(false);
  const [history, setHistory]               = useState<AuditHistoryItem[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isApproved     = status === "APPROVED";
  const isFeedbackSent = status === "FEEDBACK_SENT";
  const isLocked       = isApproved || isFeedbackSent;

  // Secciones revisables: cabecera/metadatos + una por fila PUM
  const rowKeys = plan.rows.map((_, i) => `row_${i}` as const);
  const allSectionKeys: AnySectionKey[] = [...ACTIVE_SECTION_KEYS, ...rowKeys];
  const totalSections = allSectionKeys.length;

  // "Revisada" = aprobada o con comentario no vacío
  const isReviewed = (key: AnySectionKey) =>
    states[key]?.approved === true || !!(states[key]?.comment?.trim());
  const reviewedCount = allSectionKeys.filter(isReviewed).length;

  // "Aprobar PUM completo" exige que TODAS las secciones estén aprobadas
  const allApproved = allSectionKeys.every((k) => states[k]?.approved === true);

  /** Guarda una sección con actualización optimista; si falla, la UI vuelve al estado guardado. */
  const saveSection = (key: AnySectionKey, value: SectionState) => {
    if (!onUpdateSection) return;
    setSaveError(null);
    startTransition(async () => {
      applyOptimistic({ key, value });
      let ok = false;
      try {
        ok = (await onUpdateSection(reviewId, key, value.approved, value.comment)).success;
      } catch {
        ok = false;
      }
      startTransition(() => {
        if (ok) setSavedStates((prev) => ({ ...prev, [key]: value }));
        else setSaveError("No se pudo guardar la revisión de la sección. Intenta nuevamente.");
      });
    });
  };

  const handleApprove = (key: AnySectionKey, current: boolean) => {
    const approved = !current;
    saveSection(key, { approved, comment: approved ? null : (states[key]?.comment ?? null) });
  };

  const handleSaveComment = (key: AnySectionKey, comment: string) => {
    const hasComment = !!comment.trim();
    saveSection(key, {
      approved: hasComment ? false : (states[key]?.approved ?? false),
      comment:  comment || null,
    });
  };

  const handleOpenHistory = async () => {
    setShowHistory(true);
    if (history !== null) return;
    if (!onGetAuditHistory) return;
    setHistoryLoading(true);
    const result = await onGetAuditHistory(planId);
    setHistory(result.data ?? []);
    setHistoryLoading(false);
  };

  const review: PlanDocumentReview = {
    renderControl: (key, options) => (
      <SectionControl
        sectionKey={key}
        states={states}
        disabled={isLocked}
        onApprove={handleApprove}
        onSaveComment={handleSaveComment}
        darkBg={options?.darkBg}
        showInlineComment={options?.showInlineComment}
      />
    ),
    rowComment: (key) => states[key]?.comment,
  };

  return (
    <>
      {/* Barra sticky: progreso, historial y acciones */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 gap-4 flex-wrap"
        style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(0,39,83,0.07)" }}
      >
        <ReviewProgress
          isApproved={isApproved}
          isFeedbackSent={isFeedbackSent}
          allApproved={allApproved}
          reviewedCount={reviewedCount}
          totalSections={totalSections}
        />

        {saveError && <span className="text-xs text-red-600" role="alert">{saveError}</span>}

        {onGetAuditHistory && (
          <button
            type="button"
            onClick={handleOpenHistory}
            className="text-sm font-medium px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            style={{ background: "rgba(0,39,83,0.07)", color: "#002753", border: "1px solid rgba(0,39,83,0.15)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Historial
          </button>
        )}

        <CoordinatorReviewBar
          planId={planId}
          reviewId={reviewId}
          isLocked={isLocked}
          isFeedbackSent={isFeedbackSent}
          allApproved={allApproved}
          busy={isPending}
          onSendFeedback={onSendFeedback}
          onApprovePlan={onApprovePlan}
          onFeedbackSent={() => setStatus("FEEDBACK_SENT")}
        />

        {adminMode && <AdminSignBar onSignPlan={onSignPlan} onRejectPlan={onRejectPlan} />}
      </div>

      <PlanDocument
        institutionName={appConfig.institutionName}
        logos={logos}
        plan={{
          subjectName:  plan.subjectName,
          levelName:    plan.levelName,
          levelTrack:   plan.levelTrack,
          yearLabel:    plan.yearLabel,
          teacherNames: plan.teacherName ?? "—",
          metadata:     plan.metadata,
          rows:         plan.rows,
        }}
        review={review}
      >
        {signatureBlock && <SignatureBlock data={signatureBlock} />}
      </PlanDocument>

      <AuditHistoryModal
        open={showHistory}
        onOpenChange={setShowHistory}
        subtitle={`${plan.subjectName} · ${plan.levelCode} · ${plan.teacherName ?? "—"}`}
        loading={historyLoading}
        history={history}
      />
    </>
  );
}
