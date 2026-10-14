"use client";

import { Dialog } from "@/components/ui/Dialog";
import type { AuditHistoryItem } from "@/modules/audit/audit.service";

interface AuditHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Línea bajo el título: asignatura · nivel · docentes. */
  subtitle: string;
  loading: boolean;
  history: AuditHistoryItem[] | null;
}

const TH_STYLE = { padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#1e3a8a", borderBottom: "1px solid #e2e8f0" } as const;

/** Historial de eventos de auditoría del ciclo de revisión del PUM. */
export function AuditHistoryModal({ open, onOpenChange, subtitle, loading, history }: AuditHistoryModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Historial de Revisión"
      description={subtitle}
      size="xl"
      className="max-w-[860px]!"
    >
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        aria-label="Cerrar historial"
        className="absolute right-5 top-5 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
        style={{ background: "rgba(0,39,83,0.07)", color: "#002753" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <div className="border-t pt-4" style={{ borderColor: "rgba(0,39,83,0.10)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-pum-text-muted animate-pulse" role="status">Cargando historial…</span>
          </div>
        ) : !history || history.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-pum-text-muted">Sin eventos registrados aún.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ ...TH_STYLE, whiteSpace: "nowrap" }}>Fecha y hora</th>
                  <th style={TH_STYLE}>Evento</th>
                  <th style={TH_STYLE}>Actor</th>
                  <th style={TH_STYLE}>Campo / Sección</th>
                  <th style={TH_STYLE}>Observación</th>
                </tr>
              </thead>
              <tbody>
                {history.map((ev, idx) => <HistoryRow key={ev.id} ev={ev} odd={idx % 2 === 1} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: "rgba(0,39,83,0.08)" }}>
        <p className="text-[10px] text-pum-text-disabled">
          Este registro es el respaldo oficial del ciclo de revisión del PUM.
        </p>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="text-sm font-medium px-4 py-1.5 rounded-xl transition-all"
          style={{ background: "rgba(0,39,83,0.07)", color: "#002753" }}
        >
          Cerrar
        </button>
      </div>
    </Dialog>
  );
}

function HistoryRow({ ev, odd }: { ev: AuditHistoryItem; odd: boolean }) {
  const dt = new Date(ev.createdAt);
  const dateStr = dt.toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = dt.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });

  const isMilestone  = ev.eventType === "SIGNED" || ev.eventType === "PLAN_APPROVED";
  const isApproval   = ev.eventType === "SECTION_APPROVED" || ev.eventType === "PLAN_APPROVED" || ev.eventType === "SIGNED";
  const isRejection  = ev.eventType === "ADMIN_REJECTED" || ev.eventType === "SECTION_APPROVAL_REMOVED";
  const isSubmission = ev.eventType === "FINALIZED" || ev.eventType === "TEACHER_RESUBMITTED";

  const dotColor = isApproval ? "#166534"
    : isRejection ? "#ba1a1a"
    : isSubmission ? "#1e40af"
    : "#64748b";

  // Hitos (SIGNED, PLAN_APPROVED) con fondo resaltado
  const rowBg = isMilestone
    ? "linear-gradient(90deg, #dcfce7 0%, #f0fdf4 100%)"
    : odd ? "#f8fafc" : "white";

  return (
    <tr style={{ background: rowBg }}>
      <td style={{ padding: "7px 10px", verticalAlign: "top", whiteSpace: "nowrap", color: isMilestone ? "#14532d" : "#475569", fontWeight: isMilestone ? 700 : 400, borderLeft: isMilestone ? "4px solid #16a34a" : "4px solid transparent" }}>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{dateStr}</span>
        <br />
        <span style={{ color: isMilestone ? "#15803d" : "#94a3b8", fontSize: "0.7rem" }}>{timeStr}</span>
      </td>
      <td style={{ padding: "7px 10px", verticalAlign: "top" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          {isMilestone ? (
            <span style={{ fontSize: "1rem", lineHeight: 1 }} aria-hidden="true">
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
          ? <span style={{ fontStyle: "italic" }}>&ldquo;{ev.comment}&rdquo;</span>
          : <span style={{ color: "#cbd5e1" }}>—</span>}
      </td>
    </tr>
  );
}
