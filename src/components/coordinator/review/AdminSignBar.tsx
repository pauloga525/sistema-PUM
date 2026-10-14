"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { ROUTES } from "@/constants/routes";

interface AdminSignBarProps {
  onSignPlan?:   () => Promise<{ success: boolean }>;
  onRejectPlan?: (comment: string) => Promise<{ success: boolean }>;
}

/** Acciones del admin sobre un PUM pendiente de firma: firmar o rechazar con motivo. */
export function AdminSignBar({ onSignPlan, onRejectPlan }: AdminSignBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [signed, setSigned]         = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [comment, setComment]       = useState("");
  const [error, setError]           = useState<string | null>(null);

  const handleSign = () => {
    if (!onSignPlan) return;
    startTransition(async () => {
      const result = await onSignPlan();
      if (result.success) {
        setSigned(true);
      } else {
        setError("No se pudo firmar el PUM. Intenta nuevamente.");
      }
    });
  };

  const handleReject = () => {
    if (!comment.trim()) { setError("Escribe un motivo de rechazo."); return; }
    if (!onRejectPlan) return;
    setError(null);
    startTransition(async () => {
      const result = await onRejectPlan(comment.trim());
      if (result.success) {
        router.push(ROUTES.ADMIN.DASHBOARD);
      } else {
        setError("No se pudo rechazar el PUM. Intenta nuevamente.");
      }
    });
  };

  if (signed) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full"
        style={{ background: "#ccfbf1", color: "#0f766e" }}
        role="status"
      >
        ✓ PUM firmado y aprobado
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && !showReject && (
        <span className="text-xs text-red-600" role="alert">{error}</span>
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
        onClick={() => { setShowReject(true); setError(null); }}
        className="text-sm font-bold px-4 py-2 rounded-xl text-white disabled:opacity-40 transition-all cursor-pointer"
        style={{ background: "linear-gradient(135deg, #ba1a1a 0%, #dc2626 100%)" }}
      >
        Rechazar
      </button>

      <ConfirmDialog
        open={showReject}
        onOpenChange={(open) => { setShowReject(open); if (!open) setError(null); }}
        title="Rechazar PUM"
        description="El PUM volverá al coordinador para revisión. Indica el motivo para que puedan corregirlo."
        confirmLabel="Confirmar rechazo"
        tone="danger"
        onConfirm={handleReject}
        confirmDisabled={!comment.trim()}
        pending={isPending}
        error={error}
      >
        <label htmlFor="admin-reject-reason" className="block text-xs font-medium text-pum-text mb-1.5">
          Motivo de rechazo <span className="text-red-500">*</span>
        </label>
        <textarea
          id="admin-reject-reason"
          value={comment}
          onChange={(e) => { setComment(e.target.value); setError(null); }}
          placeholder="Describe qué debe corregir el coordinador o docente..."
          rows={4}
          aria-invalid={!!error}
          className="w-full text-sm rounded-xl px-3 py-2 resize-none outline-none transition-colors"
          style={{
            border: error ? "1.5px solid #ba1a1a" : "1.5px solid rgba(0,39,83,0.18)",
            background: "rgba(0,39,83,0.02)",
          }}
        />
      </ConfirmDialog>
    </div>
  );
}
