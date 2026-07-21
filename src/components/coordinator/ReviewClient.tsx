"use client";

import { useState, useTransition, Fragment } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { REVIEW_SECTION_KEYS, BLOCKING_REVIEW_KEYS, type ReviewSectionKey, type AnySectionKey, type SectionStates, type ReviewStatus } from "@/constants/review";
import { ALL_EJES, PRINCIPIO_COLORS, DUA_PRINCIPIOS } from "@/constants/planification";
import type { PlanMetadata, MethodologySubItem, DcdItem } from "@/modules/planification/planification.types";
import { formatPrincipioLabel } from "@/modules/planification/planification.types";
import type { AuditHistoryItem, SignatureBlockData } from "@/modules/audit/audit.service";
import { SignatureBlock } from "@/components/planification/SignatureBlock";

// ── Tipos de props ─────────────────────────────────────────────────────────────

interface PlanRowData {
  dcdItems: DcdItem[];
  indicators: string[];
  methodologyItems: MethodologySubItem[];
  resources: MethodologySubItem[];
  evaluations: string[];
}

interface PlanRow {
  id: string;
  rowIndex: number;
  data: PlanRowData;
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
  /** Admin-only: shows Sign/Reject buttons, hides coordinator controls */
  adminMode?: boolean;
  onSignPlan?:   () => Promise<{ success: boolean }>;
  onRejectPlan?: (comment: string) => Promise<{ success: boolean }>;
  signatureBlock?: SignatureBlockData | null;
}

// ── Control de sección ─────────────────────────────────────────────────────────

function SectionControl({
  sectionKey,
  states,
  disabled,
  onApprove,
  onSaveComment,
  darkBg = false,
  showInlineComment = true,
}: {
  sectionKey: AnySectionKey;
  states: SectionStates;
  disabled: boolean;
  onApprove: (key: AnySectionKey, current: boolean) => void;
  onSaveComment: (key: AnySectionKey, comment: string) => void;
  darkBg?: boolean;
  showInlineComment?: boolean;
}) {
  const state = states[sectionKey];
  const [showInput, setShowInput] = useState(false);
  const [commentText, setCommentText] = useState(state?.comment ?? "");

  if (disabled) {
    return state?.approved ? (
      <span
        className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
        style={darkBg
          ? { background: "rgba(255,255,255,0.25)", color: "white" }
          : { background: "#dcfce7", color: "#166534" }}
      >
        ✓ Aprobado
      </span>
    ) : state?.comment ? (
      <span
        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
        style={darkBg
          ? { background: "rgba(255,255,255,0.20)", color: "rgba(255,255,255,0.9)" }
          : { background: "#fef9c3", color: "#713f12" }}
        title={state.comment}
      >
        💬 Comentado
      </span>
    ) : null;
  }

  return (
    <div className="flex flex-col items-end gap-1" style={{ marginLeft: "auto", position: "relative" }}>
      <div className="flex items-center gap-1">
        {/* Botón comentar */}
        <button
          type="button"
          title={state?.comment ? "Editar comentario" : "Agregar comentario"}
          onClick={() => { setShowInput((v) => !v); setCommentText(state?.comment ?? ""); }}
          className="w-6 h-6 rounded flex items-center justify-center transition-colors flex-shrink-0"
          style={darkBg
            ? { background: state?.comment ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.18)", color: "white" }
            : { background: state?.comment ? "rgba(234,179,8,0.20)" : "rgba(0,39,83,0.10)", color: state?.comment ? "#713f12" : "#002753" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {/* Botón aprobar — deshabilitado si hay comentario pendiente */}
        <button
          type="button"
          disabled={!!state?.comment?.trim()}
          title={
            state?.comment?.trim()
              ? "Hay un comentario pendiente — el docente debe corregir antes de aprobar"
              : state?.approved
              ? "Quitar aprobación"
              : "Aprobar sección"
          }
          onClick={() => onApprove(sectionKey, state?.approved ?? false)}
          className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full transition-all flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
          style={
            state?.approved
              ? { background: "#dcfce7", color: "#166534" }
              : darkBg
                ? { background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.35)" }
                : { background: "rgba(0,39,83,0.10)", color: "#002753", border: "1px solid rgba(0,39,83,0.18)" }
          }
        >
          {state?.approved ? "✓ Aprobado" : "✓ Aprobar"}
        </button>
      </div>

      {/* Input de comentario — portal centrado para no desbordar ninguna celda */}
      {showInput && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.30)", backdropFilter: "blur(2px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowInput(false); }}
        >
          <div
            className="flex flex-col gap-2.5 p-4 rounded-2xl shadow-2xl"
            style={{
              background: "white",
              border: "1px solid rgba(0,39,83,0.14)",
              width: "300px",
              boxShadow: "0 12px 40px rgba(0,39,83,0.22)",
            }}
          >
            <p className="text-xs font-bold text-pum-text">Retroalimentación</p>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escribe tu retroalimentación..."
              rows={4}
              autoFocus
              className="text-xs text-pum-text resize-none outline-none leading-snug rounded-xl px-3 py-2"
              style={{ background: "rgba(0,39,83,0.04)", border: "1px solid rgba(0,39,83,0.12)" }}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowInput(false)}
                className="text-[11px] px-3 py-1.5 rounded-xl text-pum-text-muted hover:text-pum-text"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { onSaveComment(sectionKey, commentText); setShowInput(false); }}
                className="text-[11px] font-bold px-4 py-1.5 rounded-xl text-white"
                style={{ background: "#002753" }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Comentario guardado — solo visible en secciones de cabecera/metadatos */}
      {!showInput && showInlineComment && state?.comment && (
        <p
          className="text-[10px] max-w-[180px] text-right"
          style={{
            color: darkBg ? "rgba(255,255,255,0.85)" : "#713f12",
            wordBreak: "break-word",
            whiteSpace: "normal",
            lineHeight: "1.3",
          }}
          title={state.comment}
        >
          💬 {state.comment}
        </p>
      )}
    </div>
  );
}

// ── Header de sección revisable ────────────────────────────────────────────────

function ReviewableHeader({
  children,
  sectionKey,
  states,
  disabled,
  onApprove,
  onSaveComment,
  className,
  style,
  colSpan,
  darkBg = false,
}: {
  children: React.ReactNode;
  sectionKey: AnySectionKey;
  states: SectionStates;
  disabled: boolean;
  onApprove: (key: AnySectionKey, current: boolean) => void;
  onSaveComment: (key: AnySectionKey, comment: string) => void;
  className?: string;
  style?: React.CSSProperties;
  colSpan?: number;
  darkBg?: boolean;
}) {
  return (
    <th className={className} style={style} colSpan={colSpan}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span>{children}</span>
        <SectionControl
          sectionKey={sectionKey}
          states={states}
          disabled={disabled}
          onApprove={onApprove}
          onSaveComment={onSaveComment}
          darkBg={darkBg}
        />
      </div>
    </th>
  );
}

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
  const router = useRouter();
  const [states, setStates]   = useState<SectionStates>(initialSectionStates);
  const [status, setStatus]   = useState<ReviewStatus>(initialStatus);
  const [showApproveModal, setShowApproveModal]   = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError]     = useState<string | null>(null);
  // Admin-mode state
  const [showAdminRejectModal, setShowAdminRejectModal] = useState(false);
  const [adminComment, setAdminComment] = useState("");
  const [adminError, setAdminError]     = useState<string | null>(null);
  const [adminSigned, setAdminSigned]   = useState(false);
  // Audit history modal
  const [showHistory, setShowHistory]       = useState(false);
  const [history, setHistory]               = useState<AuditHistoryItem[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isApproved     = status === "APPROVED";
  const isFeedbackSent = status === "FEEDBACK_SENT";
  const isLocked       = isApproved || isFeedbackSent;

  // Compute row keys from plan rows
  const rowKeys = plan.rows.map((_, i) => `row_${i}` as `row_${number}`);

  // All non-pum_ keys that show coordinator controls in the UI (includes meta_* and plan_* extras)
  const activeSectionKeys = REVIEW_SECTION_KEYS.filter((k) => !k.startsWith("pum_"));

  // Only the 6 blocking sections (aportes_* + dua_*) count toward progress and gate the buttons.
  // meta_* and plan_* controls are optional extras that don't block the workflow.
  const totalSections  = BLOCKING_REVIEW_KEYS.length + rowKeys.length;
  const approvedCount  =
    BLOCKING_REVIEW_KEYS.filter((k) => states[k]?.approved).length +
    rowKeys.filter((k) => states[k]?.approved).length;

  // "Reviewed" = approved OR has a non-empty comment
  const isReviewed = (key: AnySectionKey) =>
    states[key]?.approved === true || !!(states[key]?.comment?.trim());

  // Gate checks use only blocking sections — meta_* and plan_* don't block
  const allApproved = BLOCKING_REVIEW_KEYS.every((k) => states[k]?.approved) &&
                      rowKeys.every((k) => states[k]?.approved);

  const allReviewed = BLOCKING_REVIEW_KEYS.every(isReviewed) &&
                      rowKeys.every(isReviewed);

  const handleApprove = (key: AnySectionKey, current: boolean) => {
    if (!onUpdateSection) return;
    const newApproved = !current;
    const newComment = newApproved ? null : (states[key]?.comment ?? null);
    setStates((prev) => ({ ...prev, [key]: { approved: newApproved, comment: newComment } }));
    startTransition(async () => {
      await onUpdateSection(reviewId, key, newApproved, newComment);
    });
  };

  const handleSaveComment = (key: AnySectionKey, comment: string) => {
    if (!onUpdateSection) return;
    const hasComment = !!comment.trim();
    const newApproved = hasComment ? false : (states[key]?.approved ?? false);
    setStates((prev) => ({ ...prev, [key]: { approved: newApproved, comment: comment || null } }));
    startTransition(async () => {
      await onUpdateSection(reviewId, key, newApproved, comment || null);
    });
  };

  const handleSendFeedback = () => {
    if (!onSendFeedback) return;
    setError(null);
    startTransition(async () => {
      const result = await onSendFeedback(reviewId, planId);
      if (result.success) {
        setStatus("FEEDBACK_SENT");
        setShowFeedbackModal(false);
      } else {
        setError("No se pudo enviar la retroalimentación. Intenta nuevamente.");
      }
    });
  };

  const handleApprovePlan = () => {
    if (!onApprovePlan) return;
    setError(null);
    startTransition(async () => {
      const result = await onApprovePlan(reviewId, planId);
      if (result.success) {
        setShowApproveModal(false);
        router.push("/coordinator/retroalimentacion");
      } else {
        setError("No se pudo aprobar el PUM. Intenta nuevamente.");
      }
    });
  };

  const handleSign = () => {
    if (!onSignPlan) return;
    startTransition(async () => {
      const result = await onSignPlan();
      if (result.success) {
        setAdminSigned(true);
      } else {
        setAdminError("No se pudo firmar el PUM. Intenta nuevamente.");
      }
    });
  };

  const handleAdminReject = () => {
    if (!adminComment.trim()) { setAdminError("Escribe un motivo de rechazo."); return; }
    if (!onRejectPlan) return;
    setAdminError(null);
    startTransition(async () => {
      const result = await onRejectPlan(adminComment.trim());
      if (result.success) {
        router.push("/admin/dashboard");
      } else {
        setAdminError("No se pudo rechazar el PUM. Intenta nuevamente.");
      }
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

  const nivelSub = plan.levelTrack === "BACHILLERATO" ? "Bachillerato"
    : plan.levelTrack === "BASICA" ? "Educación Básica"
    : plan.levelTrack;

  const meta = plan.metadata;

  const PUM_COLS: { label: string; subtitle?: string; width: string; key: ReviewSectionKey }[] = [
    { label: "¿Qué van a aprender?",  subtitle: "Destreza con Criterio de Desempeño / Competencia",                     width: "18%", key: "pum_dcd" },
    { label: "¿Qué evaluar?",         subtitle: "Indicadores de evaluación",                                             width: "16%", key: "pum_indicators" },
    { label: "¿Cómo van a aprender?", subtitle: "Metodologías para los aprendizajes · Estrategias Metodológicas · DUA", width: "23%", key: "pum_methodology" },
    { label: "Recursos",              subtitle: undefined,                                                                width: "12%", key: "pum_resources" },
    { label: "¿Cómo evaluar?",        subtitle: "Actividades de Evaluación / Técnicas / Instrumentos",                   width: "20%", key: "pum_evaluations" },
  ];

  // Badge text and color for the progress indicator
  const badgeText = isApproved
    ? "✓ PUM Aprobado"
    : isFeedbackSent
    ? "↑ Retroalimentación enviada"
    : `${approvedCount} / ${totalSections} secciones revisadas`;

  const badgeStyle = isApproved
    ? { background: "#dcfce7", color: "#166534" }
    : isFeedbackSent
    ? { background: "#dbeafe", color: "#1e40af" }
    : allApproved
    ? { background: "rgba(0,39,83,0.08)", color: "#002753" }
    : { background: "#fef9c3", color: "#713f12" };

  const barColor = isApproved
    ? "#16a34a"
    : isFeedbackSent
    ? "#2563eb"
    : allApproved
    ? "#002753"
    : "#ca8a04";

  return (
    <>
      {/* Barra de progreso sticky */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 gap-4 flex-wrap"
        style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(0,39,83,0.07)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={badgeStyle}
          >
            {badgeText}
          </div>
          <div style={{ width: "120px", height: "6px", background: "rgba(0,39,83,0.08)", borderRadius: "999px", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                borderRadius: "999px",
                background: barColor,
                width: `${Math.round((approvedCount / Math.max(totalSections, 1)) * 100)}%`,
                transition: "width 300ms",
              }}
            />
          </div>
        </div>

        {/* Historial de revisión */}
        {onGetAuditHistory && (
          <button
            type="button"
            onClick={handleOpenHistory}
            className="text-sm font-medium px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            style={{ background: "rgba(0,39,83,0.07)", color: "#002753", border: "1px solid rgba(0,39,83,0.15)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Historial
          </button>
        )}

        {/* Action buttons */}
        {!isLocked && (
          <div className="flex items-center gap-2">
            {/* Enviar retroalimentación: siempre que no estén todos aprobados */}
            {!allApproved && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowFeedbackModal(true)}
                className="text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #b45309 0%, #d97706 100%)", color: "white" }}
                title="Enviar retroalimentación al docente"
              >
                Enviar retroalimentación
              </button>
            )}

            {/* Aprobar PUM: all approved */}
            {allApproved && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowApproveModal(true)}
                className="text-sm font-bold px-4 py-2 rounded-xl text-white disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #166534 0%, #15803d 100%)" }}
                title="Aprobar PUM completo"
              >
                Aprobar PUM completo
              </button>
            )}
          </div>
        )}

        {isFeedbackSent && (
          <span className="text-xs text-pum-text-muted italic">
            El docente recibirá la retroalimentación y podrá editar el PUM.
          </span>
        )}

        {/* Admin actions */}
        {adminMode && !adminSigned && (
          <div className="flex items-center gap-2">
            {adminError && !showAdminRejectModal && (
              <span className="text-xs text-red-600">{adminError}</span>
            )}
            <button
              type="button"
              disabled={isPending}
              onClick={handleSign}
              className="text-sm font-bold px-4 py-2 rounded-xl text-white disabled:opacity-40 transition-all cursor-pointer"
              style={{ background: "linear-gradient(135deg, #0d8a5e 0%, #059669 100%)" }}
            >
              {isPending ? "Firmando..." : "Firmar y aprobar"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => { setShowAdminRejectModal(true); setAdminError(null); }}
              className="text-sm font-bold px-4 py-2 rounded-xl text-white disabled:opacity-40 transition-all cursor-pointer"
              style={{ background: "linear-gradient(135deg, #ba1a1a 0%, #dc2626 100%)" }}
            >
              Rechazar
            </button>
          </div>
        )}
        {adminMode && adminSigned && (
          <span
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "#ccfbf1", color: "#0f766e" }}
          >
            ✓ PUM firmado y aprobado
          </span>
        )}
      </div>

      {/* CSS del documento */}
      <style>{`
        .doc-table { border-collapse: collapse; width: 100%; font-size: 0.72rem; }
        .doc-table td, .doc-table th { border: 1px solid #94A3B8; padding: 3px 5px; vertical-align: top; }
        .lbl { font-weight: 700; color: #1e3a8a; white-space: nowrap; }
        .hdr-blue { background-color: #1E40AF; }
        .hdr-section { background-color: #BFDBFE; }
        .hdr-dua-p1 { background-color: #D1FAE5; }
        .hdr-dua-p2 { background-color: #EDE9FE; }
        .hdr-dua-p3 { background-color: #E0F2FE; }
        .pum-row-odd td { background-color: #F1F5F9; }
        .pum-row-commented td { background-color: rgba(249,115,22,0.09) !important; }
        .pum-row-comment-bar td { background-color: rgba(249,115,22,0.16); border-bottom: 2px solid rgba(249,115,22,0.35); }
        .badge { display: inline-flex; align-items: center; justify-content: center; border-radius: 3px; padding: 1px 4px; font-size: 0.6rem; font-weight: 700; color: white; margin-right: 3px; flex-shrink: 0; }
      `}</style>

      {/* Documento */}
      <div className="flex justify-center py-6 px-4 pb-16">
        <div
          className="bg-white shadow-pum-md rounded-lg w-full border border-gray-100"
          style={{ maxWidth: "1280px", padding: "20px 28px" }}
        >
          {/* Encabezado institucional */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-blue-800">
            <div className="w-20 h-16 flex items-center justify-center">
              {logos.left && <img src="/logos/logo-left.png" alt="Logo" className="max-h-full max-w-full object-contain" />}
            </div>
            <div className="text-center flex-1">
              <p className="font-extrabold text-blue-900 text-sm uppercase tracking-wide">{appConfig.institutionName}</p>
              <span className="inline-block mt-1 px-4 py-0.5 rounded-full text-xs font-bold text-blue-900" style={{ backgroundColor: "#FEF08A" }}>
                {plan.yearLabel}
              </span>
            </div>
            <div className="w-20 h-16 flex items-center justify-center">
              {logos.right && <img src="/logos/logo-right.png" alt="Escudo" className="max-h-full max-w-full object-contain" />}
            </div>
          </div>

          {/* Tabla principal */}
          <table className="doc-table">
            <thead>
              <tr>
                <th colSpan={10} className="hdr-blue text-center text-white font-bold py-1.5" style={{ fontSize: "0.8rem" }}>
                  PLAN DE UNIDAD MICROCURRICULAR
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Datos informativos */}
              <tr><td colSpan={10} className="hdr-section font-bold text-blue-900 py-1">1.&nbsp; DATOS INFORMATIVOS</td></tr>
              <tr>
                <td className="lbl" style={{ width: "13%" }}>NIVEL EDUCATIVO</td>
                <td className="lbl" style={{ width: "7%" }}>Subnivel</td>
                <td style={{ width: "20%" }}>{nivelSub}</td>
                <td className="lbl" style={{ width: "7%" }}>Grados</td>
                <td colSpan={6}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                    <span>{plan.levelName}</span>
                    <SectionControl sectionKey="meta_nivel" states={states} disabled={isLocked} onApprove={handleApprove} onSaveComment={handleSaveComment} />
                  </div>
                </td>
              </tr>
              <tr>
                <td className="lbl">Área de Estudio</td>
                <td colSpan={2}>{meta?.areaEstudio || <span className="text-gray-400">—</span>}</td>
                <td className="lbl">Asignatura</td>
                <td colSpan={6}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                    <span>{plan.subjectName}</span>
                    <SectionControl sectionKey="meta_area" states={states} disabled={isLocked} onApprove={handleApprove} onSaveComment={handleSaveComment} />
                  </div>
                </td>
              </tr>
              <tr>
                <td className="lbl">Docentes</td>
                <td colSpan={9}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                    <span>{plan.teacherName ?? "—"}</span>
                    <SectionControl sectionKey="meta_docentes" states={states} disabled={isLocked} onApprove={handleApprove} onSaveComment={handleSaveComment} />
                  </div>
                </td>
              </tr>
              <tr>
                <td className="lbl" style={{ whiteSpace: "normal" }}>Número de la Unidad Microcurricular</td>
                <td colSpan={2} className="text-center font-semibold">{meta?.numUnidad || <span className="text-gray-400">—</span>}</td>
                <td className="lbl" style={{ whiteSpace: "normal" }}>Título de la Unidad Microcurricular</td>
                <td colSpan={6}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                    <span>{meta?.titulo || <span className="text-gray-400">—</span>}</span>
                    <SectionControl sectionKey="meta_unidad" states={states} disabled={isLocked} onApprove={handleApprove} onSaveComment={handleSaveComment} />
                  </div>
                </td>
              </tr>
              <tr>
                <td className="lbl" style={{ whiteSpace: "normal" }}>Objetivos de la Unidad Microcurricular</td>
                <td colSpan={9}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                    <div>
                      {meta?.objetivos?.filter(Boolean).length ? (
                        <ul className="list-none m-0 p-0 space-y-0.5">{meta.objetivos.filter(Boolean).map((o, i) => <li key={i}>• {o}</li>)}</ul>
                      ) : <span className="text-gray-400">—</span>}
                    </div>
                    <SectionControl sectionKey="meta_objetivos" states={states} disabled={isLocked} onApprove={handleApprove} onSaveComment={handleSaveComment} />
                  </div>
                </td>
              </tr>
              <tr>
                <td className="lbl">Criterios de Evaluación</td>
                <td colSpan={9}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                    <div>
                      {meta?.criterios?.filter(Boolean).length ? (
                        <ul className="list-none m-0 p-0 space-y-0.5">{meta.criterios.filter(Boolean).map((c, i) => <li key={i}>• {c}</li>)}</ul>
                      ) : <span className="text-gray-400">—</span>}
                    </div>
                    <SectionControl sectionKey="meta_criterios" states={states} disabled={isLocked} onApprove={handleApprove} onSaveComment={handleSaveComment} />
                  </div>
                </td>
              </tr>

              {/* Planificación */}
              <tr><td colSpan={10} className="hdr-section font-bold text-blue-900 py-1">2.&nbsp; PLANIFICACIÓN</td></tr>
              <tr>
                <td className="lbl">Número de Periodos</td>
                <td colSpan={2}>{meta?.nPeriodos || <span className="text-gray-400">—</span>}</td>
                <td className="lbl">Fecha de inicio</td>
                <td colSpan={2}>{meta?.fechInicio || <span className="text-gray-400">—</span>}</td>
                <td className="lbl" colSpan={2}>Fecha de finalización</td>
                <td colSpan={2}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                    <span>{meta?.fechFin || <span className="text-gray-400">—</span>}</span>
                    <SectionControl sectionKey="plan_periodos" states={states} disabled={isLocked} onApprove={handleApprove} onSaveComment={handleSaveComment} />
                  </div>
                </td>
              </tr>
              <tr>
                <td className="lbl">Ejes Transversales</td>
                <td colSpan={9}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                    <span>{meta?.ejesTransversales || <span className="text-gray-400">—</span>}</span>
                    <SectionControl sectionKey="plan_ejes" states={states} disabled={isLocked} onApprove={handleApprove} onSaveComment={handleSaveComment} />
                  </div>
                </td>
              </tr>

              {/* Aportes Multimodales */}
              <tr>
                <td colSpan={10} className="hdr-blue text-white font-bold text-center py-1">
                  APORTES MULTIMODALES A DESARROLLAR EN LA UNIDAD
                </td>
              </tr>
              <tr>
                <ReviewableHeader sectionKey="aportes_dim" states={states} disabled={isLocked} onApprove={handleApprove} onSaveComment={handleSaveComment}
                  className="hdr-blue text-white font-semibold text-center" colSpan={3} darkBg>
                  Dimensión y Opción Transversal
                </ReviewableHeader>
                <ReviewableHeader sectionKey="aportes_nivel" states={states} disabled={isLocked} onApprove={handleApprove} onSaveComment={handleSaveComment}
                  className="hdr-blue text-white font-semibold text-center" colSpan={4} darkBg>
                  Aporte Multimodal del Nivel / Subnivel
                </ReviewableHeader>
                <ReviewableHeader sectionKey="aportes_como" states={states} disabled={isLocked} onApprove={handleApprove} onSaveComment={handleSaveComment}
                  className="hdr-blue text-white font-semibold text-center" colSpan={3} darkBg>
                  ¿Cómo van a aprender?
                </ReviewableHeader>
              </tr>
              {(meta?.aportes?.length ? meta.aportes : Array(6).fill({ dim: "", aporte: "", como: "" })).map(
                (ap: { dim: string; aporte: string; como: string }, i: number) => (
                  <tr key={i} className={i % 2 === 1 ? "pum-row-odd" : ""}>
                    <td colSpan={3}>{ap.dim || <span className="text-gray-300">—</span>}</td>
                    <td colSpan={4}>{ap.aporte || <span className="text-gray-300">—</span>}</td>
                    <td colSpan={3}>{ap.como || <span className="text-gray-300">—</span>}</td>
                  </tr>
                )
              )}

              {/* DUA */}
              <tr>
                <td colSpan={10} className="hdr-blue text-white font-bold text-center py-1">DISEÑO UNIVERSAL DEL APRENDIZAJE</td>
              </tr>
              <tr>
                <td colSpan={2} className="hdr-blue text-white font-semibold text-center">Colorimetría</td>
                <td colSpan={5} className="hdr-blue text-white font-semibold text-center">Principio</td>
                <td colSpan={3} className="hdr-blue text-white font-semibold text-center">Pautas</td>
              </tr>
              {([
                { key: "dua_p1" as ReviewSectionKey, color: "hdr-dua-p1", label: "P I:", desc: "PROVEER MÚLTIPLES FORMAS DE REPRESENTACIÓN", sel: meta?.p1 ?? null, pIdx: 0 },
                { key: "dua_p2" as ReviewSectionKey, color: "hdr-dua-p2", label: "P II:", desc: "OFRECER MÚLTIPLES MEDIOS PARA LA ACCIÓN Y EXPRESIÓN", sel: meta?.p2 ?? null, pIdx: 1 },
                { key: "dua_p3" as ReviewSectionKey, color: "hdr-dua-p3", label: "P III:", desc: "PROPORCIONAR MÚLTIPLES MEDIOS PARA LA MOTIVACIÓN E IMPLICACIÓN EN EL APRENDIZAJE", sel: meta?.p3 ?? null, pIdx: 2 },
              ]).map((p) => (
                <tr key={p.key}>
                  <td colSpan={2} className={p.color} style={{ minWidth: "40px" }}>&nbsp;</td>
                  <td colSpan={5}>
                    <span className="font-bold">{p.label}</span> {p.desc}
                  </td>
                  <td colSpan={3}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                      <div>
                        {(() => {
                          const entries = p.sel?.filter((e) => e.subPautas.length > 0).sort((a, b) => a.pauta - b.pauta) ?? [];
                          if (!entries.length) return <span className="text-gray-400">—</span>;
                          return (
                            <ul className="list-none m-0 p-0 space-y-1">
                              {entries.map((entry) => {
                                const pd = DUA_PRINCIPIOS[p.pIdx].pautas.find((x) => x.num === entry.pauta);
                                return (
                                  <li key={entry.pauta}>
                                    • {pd?.label ?? `Pauta ${entry.pauta}`}
                                    {entry.subPautas.map((sn) => {
                                      const sp = pd?.subPautas.find((s) => s.num === sn);
                                      return <div key={sn} className="pl-3">– P{p.pIdx + 1}:{entry.pauta}.{sn} {sp?.label ?? ""}</div>;
                                    })}
                                  </li>
                                );
                              })}
                            </ul>
                          );
                        })()}
                      </div>
                      <SectionControl sectionKey={p.key} states={states} disabled={isLocked} onApprove={handleApprove} onSaveComment={handleSaveComment} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Tabla PUM */}
          <table className="doc-table mt-3">
            <thead>
              <tr>
                <th className="hdr-blue text-white text-center" style={{ width: "3%" }}>#</th>
                {PUM_COLS.map((col) => (
                  <th
                    key={col.key}
                    className="hdr-blue text-white text-left"
                    style={{ width: col.width }}
                  >
                    <span style={{ fontWeight: 700 }}>{col.label}</span>
                    {col.subtitle && (
                      <span style={{ display: "block", marginTop: "2px", fontSize: "0.6rem", fontWeight: 400, fontStyle: "italic", opacity: 0.88 }}>
                        {col.subtitle}
                      </span>
                    )}
                  </th>
                ))}
                {/* Per-row review column */}
                <th className="hdr-blue text-white text-center" style={{ width: "8%", fontSize: "0.65rem" }}>
                  Revisar fila
                </th>
              </tr>
            </thead>
            <tbody>
              {plan.rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 py-6">Sin filas registradas</td>
                </tr>
              ) : (
                plan.rows.map((row, i) => {
                  const isOdd   = i % 2 === 1;
                  const rowKey  = `row_${i}` as `row_${number}`;
                  const hasComment = !!states[rowKey]?.comment;

                  const methodologyEmpty = !row.data.methodologyItems.some((m) => m.text);

                  return (
                    <Fragment key={row.id}>
                      <tr className={hasComment ? "pum-row-commented" : isOdd ? "pum-row-odd" : ""}>
                        <td className="text-center text-gray-500 align-top">{i + 1}</td>
                        <td className="align-top">
                          {row.data.dcdItems.some((d) => d.text) ? (
                            <div className="flex flex-col gap-2">
                              {row.data.dcdItems.filter((d) => d.text).map((dcdItem, j) => {
                                const ejeInfos = dcdItem.ejes
                                  .map((id) => ALL_EJES.find((e) => e.id === id))
                                  .filter(Boolean) as typeof ALL_EJES[number][];
                                return (
                                  <div key={j} className={j > 0 ? "pt-1 border-t border-gray-200" : ""}>
                                    <span className="whitespace-pre-wrap leading-snug">{dcdItem.text}</span>
                                    {ejeInfos.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {ejeInfos.map((eje) => (
                                          <img key={eje.id} src={`/icons/ejes-transversales/${eje.file}`} alt={eje.label} title={eje.label} width={14} height={14} className="w-[14px] h-[14px] object-contain shrink-0" />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="align-top">
                          {row.data.indicators.filter(Boolean).length > 0 ? (
                            <ul className="list-none m-0 p-0 space-y-0.5">
                              {row.data.indicators.filter(Boolean).map((t, j) => <li key={j} className="leading-snug">• {t}</li>)}
                            </ul>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="align-top" style={methodologyEmpty ? { backgroundColor: "#D9D9D9" } : {}}>
                          {row.data.methodologyItems.filter((m) => m.text).length > 0 ? (
                            <ul className="list-none m-0 p-0 space-y-1">
                              {row.data.methodologyItems.filter((m) => m.text).map((item, j) => (
                                <li key={j} className="flex flex-col gap-0.5">
                                  {(item.principles ?? []).length > 0 && (
                                    <span className="flex gap-0.5 flex-wrap">
                                      {(item.principles ?? []).map((p) => (
                                        <span key={p.principio} className="badge" style={{ backgroundColor: PRINCIPIO_COLORS[p.principio as 1|2|3] }}>
                                          {formatPrincipioLabel(p as Parameters<typeof formatPrincipioLabel>[0])}
                                        </span>
                                      ))}
                                    </span>
                                  )}
                                  <span className="leading-snug">{item.text}</span>
                                </li>
                              ))}
                            </ul>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="align-top">
                          {row.data.resources.filter((r) => r.text).length > 0 ? (
                            <ul className="list-none m-0 p-0 space-y-1">
                              {row.data.resources.filter((r) => r.text).map((item, j) => (
                                <li key={j} className="flex flex-col gap-0.5">
                                  {(item.principles ?? []).length > 0 && (
                                    <span className="flex gap-0.5 flex-wrap">
                                      {(item.principles ?? []).map((p) => (
                                        <span key={p.principio} className="badge" style={{ backgroundColor: PRINCIPIO_COLORS[p.principio as 1|2|3] }}>
                                          {formatPrincipioLabel(p as Parameters<typeof formatPrincipioLabel>[0])}
                                        </span>
                                      ))}
                                    </span>
                                  )}
                                  <span className="leading-snug">• {item.text}</span>
                                </li>
                              ))}
                            </ul>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="align-top">
                          {row.data.evaluations.filter(Boolean).length > 0 ? (
                            <ul className="list-none m-0 p-0 space-y-0.5">
                              {row.data.evaluations.filter(Boolean).map((t, j) => <li key={j} className="leading-snug">• {t}</li>)}
                            </ul>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        {/* Per-row SectionControl */}
                        <td className="align-top">
                          <SectionControl
                            sectionKey={rowKey}
                            states={states}
                            disabled={isLocked}
                            onApprove={handleApprove}
                            onSaveComment={handleSaveComment}
                            showInlineComment={false}
                          />
                        </td>
                      </tr>

                      {/* Fila de comentario — aparece debajo de la fila afectada, abarca todo el ancho */}
                      {hasComment && (
                        <tr className="pum-row-comment-bar">
                          <td colSpan={7} style={{ padding: "5px 10px" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                              <span style={{ fontSize: "12px", flexShrink: 0, marginTop: "1px" }}>💬</span>
                              <span style={{ fontSize: "11px", color: "#9a3412", fontStyle: "italic", lineHeight: "1.4" }}>
                                {states[rowKey]?.comment}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>

          {signatureBlock && <SignatureBlock data={signatureBlock} />}
        </div>
      </div>

      {/* Modal: Enviar retroalimentación */}
      {showFeedbackModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: "rgba(255,255,255,0.98)", boxShadow: "0 20px 60px rgba(0,39,83,0.25)" }}
          >
            <div>
              <h2 className="text-lg font-bold text-pum-text mb-1">Enviar retroalimentación</h2>
              <p className="text-sm text-pum-text-muted leading-relaxed">
                Estás a punto de enviar la retroalimentación al docente. El PUM volverá a modo de edición
                para que el docente pueda corregir las observaciones indicadas.
                <br /><br />
                El docente verá todos los comentarios que dejaste en cada sección.
              </p>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowFeedbackModal(false); setError(null); }}
                disabled={isPending}
                className="text-sm font-medium text-pum-text-muted hover:text-pum-text px-4 py-2 rounded-xl disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendFeedback}
                disabled={isPending}
                className="text-sm font-bold text-white px-5 py-2 rounded-xl disabled:opacity-50 transition-all cursor-pointer"
                style={{ background: "linear-gradient(135deg, #b45309 0%, #d97706 100%)" }}
              >
                {isPending ? "Enviando..." : "Confirmar envío"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rechazar (admin) */}
      {showAdminRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdminRejectModal(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: "rgba(255,255,255,0.98)", boxShadow: "0 20px 60px rgba(0,39,83,0.25)" }}
          >
            <div>
              <h2 className="text-lg font-bold text-pum-text mb-1">Rechazar PUM</h2>
              <p className="text-sm text-pum-text-muted leading-relaxed">
                El PUM volverá al coordinador para revisión. Indica el motivo para que puedan corregirlo.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-pum-text mb-1.5">
                Motivo de rechazo <span className="text-red-500">*</span>
              </label>
              <textarea
                value={adminComment}
                onChange={(e) => { setAdminComment(e.target.value); setAdminError(null); }}
                placeholder="Describe qué debe corregir el coordinador o docente..."
                rows={4}
                className="w-full text-sm rounded-xl px-3 py-2 resize-none outline-none transition-colors"
                style={{
                  border: adminError ? "1.5px solid #ba1a1a" : "1.5px solid rgba(0,39,83,0.18)",
                  background: "rgba(0,39,83,0.02)",
                }}
              />
              {adminError && <p className="text-xs text-red-600 mt-1">{adminError}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowAdminRejectModal(false); setAdminError(null); }}
                disabled={isPending}
                className="text-sm font-medium text-pum-text-muted hover:text-pum-text px-4 py-2 rounded-xl disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAdminReject}
                disabled={isPending || !adminComment.trim()}
                className="text-sm font-bold text-white px-5 py-2 rounded-xl disabled:opacity-50 transition-all cursor-pointer"
                style={{ background: "linear-gradient(135deg, #ba1a1a 0%, #dc2626 100%)" }}
              >
                {isPending ? "Rechazando..." : "Confirmar rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Historial de revisión */}
      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowHistory(false); }}
        >
          <div
            className="w-full flex flex-col rounded-2xl"
            style={{
              maxWidth: "860px",
              maxHeight: "85vh",
              background: "rgba(255,255,255,0.99)",
              boxShadow: "0 24px 80px rgba(0,39,83,0.28)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(0,39,83,0.10)" }}>
              <div>
                <h2 className="text-base font-bold text-pum-text">Historial de Revisión</h2>
                <p className="text-xs text-pum-text-muted mt-0.5">
                  {plan.subjectName} · {plan.levelCode} · {plan.teacherName ?? "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "rgba(0,39,83,0.07)", color: "#002753" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <span className="text-sm text-pum-text-muted animate-pulse">Cargando historial…</span>
                </div>
              ) : !history || history.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <span className="text-sm text-pum-text-muted">Sin eventos registrados aún.</span>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#1e3a8a", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>Fecha y hora</th>
                      <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#1e3a8a", borderBottom: "1px solid #e2e8f0" }}>Evento</th>
                      <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#1e3a8a", borderBottom: "1px solid #e2e8f0" }}>Actor</th>
                      <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#1e3a8a", borderBottom: "1px solid #e2e8f0" }}>Campo / Sección</th>
                      <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#1e3a8a", borderBottom: "1px solid #e2e8f0" }}>Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((ev, idx) => {
                      const isOdd = idx % 2 === 1;
                      const dt = new Date(ev.createdAt);
                      const dateStr = dt.toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" });
                      const timeStr = dt.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });

                      const isMilestone = ev.eventType === "SIGNED" || ev.eventType === "PLAN_APPROVED";
                      const isApproval  = ev.eventType === "SECTION_APPROVED" || ev.eventType === "PLAN_APPROVED" || ev.eventType === "SIGNED";
                      const isRejection = ev.eventType === "ADMIN_REJECTED" || ev.eventType === "SECTION_APPROVAL_REMOVED";
                      const isSubmission = ev.eventType === "FINALIZED" || ev.eventType === "TEACHER_RESUBMITTED";

                      const dotColor = isApproval ? "#166534"
                        : isRejection ? "#ba1a1a"
                        : isSubmission ? "#1e40af"
                        : "#64748b";

                      // Milestone rows (SIGNED, PLAN_APPROVED) get a special highlighted background
                      const rowBg = isMilestone
                        ? "linear-gradient(90deg, #dcfce7 0%, #f0fdf4 100%)"
                        : isOdd ? "#f8fafc" : "white";

                      return (
                        <tr key={ev.id} style={{ background: rowBg }}>
                          <td style={{ padding: "7px 10px", verticalAlign: "top", whiteSpace: "nowrap", color: isMilestone ? "#14532d" : "#475569", fontWeight: isMilestone ? 700 : 400, borderLeft: isMilestone ? "4px solid #16a34a" : "4px solid transparent" }}>
                            <span style={{ fontVariantNumeric: "tabular-nums" }}>{dateStr}</span>
                            <br />
                            <span style={{ color: isMilestone ? "#15803d" : "#94a3b8", fontSize: "0.7rem" }}>{timeStr}</span>
                          </td>
                          <td style={{ padding: "7px 10px", verticalAlign: "top" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                              {isMilestone ? (
                                <span style={{ fontSize: "1rem", lineHeight: 1 }}>
                                  {ev.eventType === "SIGNED" ? "🏛️" : "✅"}
                                </span>
                              ) : (
                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0, display: "inline-block" }} />
                              )}
                              <span style={{ fontWeight: isMilestone ? 800 : 600, color: isMilestone ? "#14532d" : dotColor, fontSize: isMilestone ? "0.8rem" : undefined }}>
                                {ev.eventLabel}
                              </span>
                            </span>
                          </td>
                          <td style={{ padding: "7px 10px", verticalAlign: "top", color: isMilestone ? "#14532d" : "#334155", fontWeight: isMilestone ? 600 : 400 }}>
                            {ev.actorName ?? "—"}
                            {ev.actorRoleLabel && (
                              <span style={{ display: "block", color: isMilestone ? "#15803d" : "#94a3b8", fontSize: "0.68rem" }}>{ev.actorRoleLabel}</span>
                            )}
                          </td>
                          <td style={{ padding: "7px 10px", verticalAlign: "top", color: "#475569" }}>
                            {ev.sectionLabel ?? <span style={{ color: "#cbd5e1" }}>—</span>}
                          </td>
                          <td style={{ padding: "7px 10px", verticalAlign: "top", color: "#334155", maxWidth: "200px" }}>
                            {ev.comment
                              ? <span style={{ fontStyle: "italic" }}>"{ev.comment}"</span>
                              : <span style={{ color: "#cbd5e1" }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t flex items-center justify-between" style={{ borderColor: "rgba(0,39,83,0.08)" }}>
              <p className="text-[10px] text-pum-text-disabled">
                Este registro es el respaldo oficial del ciclo de revisión del PUM.
              </p>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="text-sm font-medium px-4 py-1.5 rounded-xl transition-all"
                style={{ background: "rgba(0,39,83,0.07)", color: "#002753" }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Aprobar PUM */}
      {showApproveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: "rgba(255,255,255,0.98)", boxShadow: "0 20px 60px rgba(0,39,83,0.25)" }}
          >
            <div>
              <h2 className="text-lg font-bold text-pum-text mb-1">Aprobar PUM</h2>
              <p className="text-sm text-pum-text-muted leading-relaxed">
                Estás a punto de marcar este PUM como <strong>Aprobado</strong>. Una vez aprobado,
                ya no podrás dejar comentarios ni modificar el estado de las secciones.
                <br /><br />
                <span className="font-semibold text-red-600">Esta acción no se puede deshacer.</span>
              </p>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowApproveModal(false); setError(null); }}
                disabled={isPending}
                className="text-sm font-medium text-pum-text-muted hover:text-pum-text px-4 py-2 rounded-xl disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApprovePlan}
                disabled={isPending}
                className="text-sm font-bold text-white px-5 py-2 rounded-xl disabled:opacity-50 transition-all cursor-pointer"
                style={{ background: "linear-gradient(135deg, #166534 0%, #15803d 100%)" }}
              >
                {isPending ? "Aprobando..." : "Confirmar aprobación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
