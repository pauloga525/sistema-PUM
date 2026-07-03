"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import type { CoordinatorSignatureGroup, PendingSignaturePlan } from "@/modules/admin/admin.service";
import { signPlanAction, rejectPlanAction } from "./actions";
import { useToast } from "@/components/ui/Toast";

// ── Reject Modal ───────────────────────────────────────────────────────────────

function RejectModal({
  plan,
  onClose,
}: {
  plan: PendingSignaturePlan;
  onClose: () => void;
}) {
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const handleSubmit = () => {
    if (!comment.trim()) { setError("Escribe un motivo de rechazo."); return; }
    setError(null);
    startTransition(async () => {
      const result = await rejectPlanAction(plan.planId, comment);
      if (result.success) {
        addToast("PUM rechazado. El coordinador fue notificado.", "error");
        onClose();
      } else {
        setError("No se pudo rechazar. Intenta nuevamente.");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4"
        style={{
          background: "rgba(255,255,255,0.97)",
          border: "1px solid rgba(195,198,210,0.70)",
          boxShadow: "0 20px 60px rgba(0,39,83,0.18)",
        }}
      >
        <div>
          <h3 className="text-base font-semibold text-pum-text">Rechazar PUM</h3>
          <p className="text-xs text-pum-text-muted mt-0.5">
            {plan.subjectName} — {plan.levelCode} · {plan.teacherName ?? plan.teacherEmail}
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-pum-text mb-1.5">
            Motivo de rechazo <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full text-sm rounded-xl border px-3 py-2 resize-none outline-none transition-colors"
            style={{
              border: error ? "1.5px solid #ba1a1a" : "1.5px solid rgba(0,39,83,0.18)",
              minHeight: "100px",
              background: "rgba(0,39,83,0.02)",
            }}
            placeholder="Describe qué debe corregir el coordinador o docente..."
            value={comment}
            onChange={(e) => { setComment(e.target.value); setError(null); }}
          />
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-sm px-4 py-2 rounded-xl font-medium text-pum-text-muted transition-colors"
            style={{ background: "rgba(0,39,83,0.06)" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !comment.trim()}
            className="text-sm px-4 py-2 rounded-xl font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: "#ba1a1a" }}
          >
            {isPending ? "Rechazando..." : "Rechazar PUM"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Sign Modal ─────────────────────────────────────────────────────────

function ConfirmSignModal({
  plan,
  onConfirm,
  onClose,
  isPending,
}: {
  plan: PendingSignaturePlan;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !isPending) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4"
        style={{
          background: "rgba(255,255,255,0.97)",
          border: "1px solid rgba(195,198,210,0.70)",
          boxShadow: "0 20px 60px rgba(0,39,83,0.18)",
        }}
      >
        <div>
          <h3 className="text-base font-semibold text-pum-text">Firmar y aprobar PUM</h3>
          <p className="text-xs text-pum-text-muted mt-0.5">
            {plan.subjectName} — {plan.levelCode} · {plan.teacherName ?? plan.teacherEmail}
          </p>
        </div>

        <p className="text-sm text-pum-text-muted leading-relaxed">
          Al firmar, el PUM quedará{" "}
          <strong className="text-pum-text">aprobado definitivamente</strong>. El coordinador y el
          docente serán notificados. Esta acción no se puede deshacer.
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-sm px-4 py-2 rounded-xl font-medium text-pum-text-muted transition-colors disabled:opacity-50"
            style={{ background: "rgba(0,39,83,0.06)" }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="text-sm px-4 py-2 rounded-xl font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: "#0d8a5e" }}
          >
            {isPending ? "Firmando…" : "Sí, firmar y aprobar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Plan row (dentro de coordinator expandido) ─────────────────────────────────

function PlanItem({ plan }: { plan: PendingSignaturePlan }) {
  const [rejectTarget, setRejectTarget] = useState<PendingSignaturePlan | null>(null);
  const [signTarget,   setSignTarget]   = useState<PendingSignaturePlan | null>(null);
  const [isPending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState(plan.planStatus);
  const { addToast } = useToast();

  const isSigned = localStatus === "SIGNED";

  function handleConfirmSign() {
    startTransition(async () => {
      const result = await signPlanAction(plan.planId);
      if (result.success) {
        setSignTarget(null);
        setLocalStatus("SIGNED");
        addToast("PUM firmado y aprobado correctamente", "success");
      } else {
        addToast("No se pudo firmar el PUM. Intenta nuevamente.", "error");
      }
    });
  }

  return (
    <>
      {rejectTarget && (
        <RejectModal plan={rejectTarget} onClose={() => setRejectTarget(null)} />
      )}
      {signTarget && (
        <ConfirmSignModal
          plan={signTarget}
          onConfirm={handleConfirmSign}
          onClose={() => setSignTarget(null)}
          isPending={isPending}
        />
      )}
      <div
        className="flex items-center gap-3 py-2.5 px-4 flex-wrap"
        style={isSigned ? { opacity: 0.7 } : undefined}
      >
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-pum-text truncate">
            {plan.subjectName}
            <span className="text-pum-text-disabled font-normal"> · {plan.levelCode}</span>
          </p>
          <p className="text-[11px] text-pum-text-muted">
            {plan.periodName} · {plan.teacherName ?? plan.teacherEmail}
          </p>
        </div>

        {/* Status badge for signed */}
        {isSigned && (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: "#ccfbf1", color: "#0f766e" }}
          >
            ✓ Firmado y aprobado
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Link
            href={ROUTES.ADMIN.pumPreview(plan.planId)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: "rgba(0,39,83,0.07)", color: "#002753" }}
          >
            Vista previa
          </Link>
          {!isSigned && (
            <>
              <button
                onClick={() => setSignTarget(plan)}
                disabled={isPending}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-50"
                style={{ background: "#0d8a5e" }}
              >
                Firmar
              </button>
              <button
                onClick={() => setRejectTarget(plan)}
                disabled={isPending}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-50"
                style={{ background: "#ba1a1a" }}
              >
                Rechazar
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Coordinator row (expandable) ───────────────────────────────────────────────

function CoordinatorRow({ group }: { group: CoordinatorSignatureGroup }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[rgba(0,39,83,0.02)]"
      >
        <div
          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-transform"
          style={{
            background: "rgba(0,39,83,0.06)",
            transform: open ? "rotate(90deg)" : "none",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#002753" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-pum-text">
            {group.coordinatorName ?? group.coordinatorEmail}
          </p>
          <p className="text-[11px] text-pum-text-muted">{group.coordinatorEmail}</p>
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: "rgba(124,58,237,0.10)", color: "#6d28d9" }}
        >
          {group.plans.length} PUM{group.plans.length !== 1 ? "s" : ""}
        </span>
      </button>

      {/* Expanded plans */}
      {open && (
        <div
          className="border-t divide-y"
          style={{
            borderColor: "rgba(0,39,83,0.07)",
            background: "rgba(0,39,83,0.015)",
          }}
        >
          {group.plans.map((plan) => (
            <PlanItem key={plan.planId} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function SignatureTable({ groups }: { groups: CoordinatorSignatureGroup[] }) {
  if (groups.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-sm text-pum-text-muted">No hay PUMs pendientes de firma.</p>
      </div>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: "rgba(0,39,83,0.07)" }}>
      {groups.map((group) => (
        <CoordinatorRow key={group.coordinatorId} group={group} />
      ))}
    </div>
  );
}
