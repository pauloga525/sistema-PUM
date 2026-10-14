"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { ROUTES } from "@/constants/routes";

// ── Progreso de la revisión ────────────────────────────────────────────────────

interface ReviewProgressProps {
  isApproved: boolean;
  isFeedbackSent: boolean;
  allApproved: boolean;
  reviewedCount: number;
  totalSections: number;
}

/** Badge de estado y barra de avance de secciones revisadas. */
export function ReviewProgress({ isApproved, isFeedbackSent, allApproved, reviewedCount, totalSections }: ReviewProgressProps) {
  const badgeText = isApproved
    ? "✓ PUM Aprobado"
    : isFeedbackSent
    ? "↑ Retroalimentación enviada"
    : `${reviewedCount} / ${totalSections} secciones revisadas`;

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

  const percent = Math.round((reviewedCount / Math.max(totalSections, 1)) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={badgeStyle} aria-live="polite">
        {badgeText}
      </div>
      <div
        role="progressbar"
        aria-label="Secciones revisadas"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        style={{ width: "120px", height: "6px", background: "rgba(0,39,83,0.08)", borderRadius: "999px", overflow: "hidden" }}
      >
        <div style={{ height: "100%", borderRadius: "999px", background: barColor, width: `${percent}%`, transition: "width 300ms" }} />
      </div>
    </div>
  );
}

// ── Acciones del coordinador ───────────────────────────────────────────────────

interface CoordinatorReviewBarProps {
  planId: string;
  reviewId: string;
  isLocked: boolean;
  isFeedbackSent: boolean;
  allApproved: boolean;
  /** Hay guardados de secciones en curso. */
  busy: boolean;
  onSendFeedback?: (reviewId: string, planId: string) => Promise<{ success: boolean }>;
  onApprovePlan?:  (reviewId: string, planId: string) => Promise<{ success: boolean }>;
  onFeedbackSent: () => void;
}

/** Enviar retroalimentación / Aprobar PUM completo, con sus confirmaciones. */
export function CoordinatorReviewBar({
  planId,
  reviewId,
  isLocked,
  isFeedbackSent,
  allApproved,
  busy,
  onSendFeedback,
  onApprovePlan,
  onFeedbackSent,
}: CoordinatorReviewBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"feedback" | "approve" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const disabled = busy || isPending;

  const closeDialog = () => { setDialog(null); setError(null); };

  const handleSendFeedback = () => {
    if (!onSendFeedback) return;
    setError(null);
    startTransition(async () => {
      const result = await onSendFeedback(reviewId, planId);
      if (result.success) {
        onFeedbackSent();
        setDialog(null);
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
        setDialog(null);
        router.push(ROUTES.COORDINATOR.FEEDBACK);
      } else {
        setError("No se pudo aprobar el PUM. Intenta nuevamente.");
      }
    });
  };

  return (
    <>
      {!isLocked && (
        <div className="flex items-center gap-2">
          {/* Enviar retroalimentación: mientras no estén todas aprobadas */}
          {!allApproved && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setDialog("feedback")}
              className="text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #b45309 0%, #d97706 100%)", color: "white" }}
              title="Enviar retroalimentación al docente"
            >
              Enviar retroalimentación
            </button>
          )}

          {/* Aprobar PUM: todas las secciones aprobadas */}
          {allApproved && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setDialog("approve")}
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

      <ConfirmDialog
        open={dialog === "feedback"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
        title="Enviar retroalimentación"
        description={
          <>
            Estás a punto de enviar la retroalimentación al docente. El PUM volverá a modo de edición
            para que el docente pueda corregir las observaciones indicadas.
            <br /><br />
            El docente verá todos los comentarios que dejaste en cada sección.
          </>
        }
        confirmLabel="Confirmar envío"
        onConfirm={handleSendFeedback}
        pending={isPending}
        error={error}
      />

      <ConfirmDialog
        open={dialog === "approve"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
        title="Aprobar PUM"
        description={
          <>
            Estás a punto de marcar este PUM como <strong>Aprobado</strong>. Una vez aprobado,
            ya no podrás dejar comentarios ni modificar el estado de las secciones.
            <br /><br />
            <span className="font-semibold text-red-600">Esta acción no se puede deshacer.</span>
          </>
        }
        confirmLabel="Confirmar aprobación"
        onConfirm={handleApprovePlan}
        pending={isPending}
        error={error}
      />
    </>
  );
}
