"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { correctPlanStatusAction, reassignCoordinatorAction } from "@/app/(superadmin)/superadmin/plans/actions";
import { PLAN_STATUSES } from "@/modules/superadmin/superadmin.schema";

const STATUS_LABEL: Record<string, string> = {
  DRAFT:             "Borrador",
  FINALIZED:         "Enviado a revisión",
  FEEDBACK_RECEIVED: "Con observaciones",
  APPROVED:          "Aprobado por coordinador",
  PENDING_SIGNATURE: "Pendiente de firma",
  SIGNED:            "Firmado y aprobado",
  ADMIN_REJECTED:    "Rechazado por administrador",
};

interface Coordinator {
  id:    string;
  name:  string | null;
  email: string;
  area:  string | null;
}

interface PlanAdminActionsProps {
  planId:           string;
  currentStatus:    string;
  coordinators:     Coordinator[];
  currentCoordinatorId: string | null;
}

export function PlanAdminActions({
  planId,
  currentStatus,
  coordinators,
  currentCoordinatorId,
}: PlanAdminActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [statusValue,    setStatusValue]    = useState(currentStatus);
  const [reason,         setReason]         = useState("");
  const [coordinatorId,  setCoordinatorId]  = useState(currentCoordinatorId ?? "");

  const [statusMsg,  setStatusMsg]  = useState<{ ok: boolean; text: string } | null>(null);
  const [coordMsg,   setCoordMsg]   = useState<{ ok: boolean; text: string } | null>(null);

  function handleCorrectStatus() {
    if (!reason.trim()) { setStatusMsg({ ok: false, text: "El motivo es obligatorio" }); return; }
    startTransition(async () => {
      const res = await correctPlanStatusAction(planId, { newStatus: statusValue as typeof PLAN_STATUSES[number], reason });
      if (res.success) {
        setStatusMsg({ ok: true, text: "Estado actualizado correctamente" });
        setReason("");
        router.refresh();
      } else {
        setStatusMsg({ ok: false, text: res.error ?? "Error al actualizar" });
      }
    });
  }

  function handleReassign() {
    if (!coordinatorId) { setCoordMsg({ ok: false, text: "Selecciona un coordinador" }); return; }
    startTransition(async () => {
      const res = await reassignCoordinatorAction(planId, { coordinatorId });
      if (res.success) {
        setCoordMsg({ ok: true, text: "Coordinador reasignado correctamente" });
        router.refresh();
      } else {
        setCoordMsg({ ok: false, text: res.error ?? "Error al reasignar" });
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Corrección de estado */}
      <div className="rounded-xl border border-pum-border bg-white p-5">
        <h3 className="text-sm font-semibold text-pum-text mb-4">Corregir estado del PUM</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-pum-text-muted mb-1">Nuevo estado</label>
            <select
              value={statusValue}
              onChange={(e) => { setStatusValue(e.target.value); setStatusMsg(null); }}
              className="w-full border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text focus:outline-none focus:ring-2 focus:ring-violet-400"
              disabled={isPending}
            >
              {PLAN_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-pum-text-muted mb-1">Motivo de la corrección</label>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setStatusMsg(null); }}
              rows={3}
              placeholder="Descripción del motivo (mín. 10 caracteres)…"
              className="w-full border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text placeholder-pum-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
              disabled={isPending}
            />
          </div>
          {statusMsg && (
            <p className="text-xs font-medium" style={{ color: statusMsg.ok ? "#166534" : "#991b1b" }}>
              {statusMsg.text}
            </p>
          )}
          <button
            onClick={handleCorrectStatus}
            disabled={isPending || statusValue === currentStatus || reason.trim().length < 10}
            className="w-full py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40"
            style={{ background: "#4c1d95" }}
          >
            {isPending ? "Guardando…" : "Aplicar corrección"}
          </button>
        </div>
      </div>

      {/* Reasignación de coordinador */}
      <div className="rounded-xl border border-pum-border bg-white p-5">
        <h3 className="text-sm font-semibold text-pum-text mb-4">Reasignar coordinador</h3>
        {coordinators.length === 0 ? (
          <p className="text-sm text-pum-text-muted italic">No hay coordinadores activos disponibles.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-pum-text-muted mb-1">Coordinador</label>
              <select
                value={coordinatorId}
                onChange={(e) => { setCoordinatorId(e.target.value); setCoordMsg(null); }}
                className="w-full border border-pum-border rounded-lg px-3 py-2 text-sm text-pum-text focus:outline-none focus:ring-2 focus:ring-violet-400"
                disabled={isPending}
              >
                <option value="">Seleccionar coordinador…</option>
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name ?? c.email}{c.area ? ` — ${c.area}` : ""}
                  </option>
                ))}
              </select>
            </div>
            {coordMsg && (
              <p className="text-xs font-medium" style={{ color: coordMsg.ok ? "#166534" : "#991b1b" }}>
                {coordMsg.text}
              </p>
            )}
            <button
              onClick={handleReassign}
              disabled={isPending || !coordinatorId || coordinatorId === currentCoordinatorId}
              className="w-full py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40"
              style={{ background: "#7c3aed" }}
            >
              {isPending ? "Guardando…" : "Reasignar coordinador"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
