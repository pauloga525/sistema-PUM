"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { getPlanHistoryAction } from "@/app/(superadmin)/superadmin/audit/actions";
import { ROUTES } from "@/constants/routes";
import type { AuditHistoryItem } from "@/modules/audit/audit.service";

const EVENT_ICON: Record<string, string> = {
  PLAN_CREATED:             "📄",
  FINALIZED:                "📤",
  TEACHER_RESUBMITTED:      "🔄",
  REVIEW_STARTED:           "🔍",
  SECTION_COMMENTED:        "💬",
  SECTION_APPROVED:         "✅",
  SECTION_APPROVAL_REMOVED: "↩️",
  FEEDBACK_SENT:            "📩",
  PLAN_APPROVED:            "🎉",
  SENT_FOR_SIGNATURE:       "✍️",
  SIGNED:                   "📋",
  ADMIN_REJECTED:           "❌",
  STATE_CORRECTED:          "🛠️",
  COORDINATOR_REASSIGNED:   "🔀",
};

interface Props {
  planId:      string;
  subjectName: string;
  teacherName: string | null;
  yearLabel:   string;
  eventCount:  number;
}

export function PlanHistoryModal({
  planId, subjectName, teacherName, yearLabel, eventCount,
}: Props) {
  const [isOpen,    setIsOpen]    = useState(false);
  const [history,   setHistory]   = useState<AuditHistoryItem[] | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function open() {
    setIsOpen(true);
    if (history === null && !isPending) {
      startTransition(async () => {
        const res = await getPlanHistoryAction(planId);
        if (res.success) {
          setHistory(res.data);
        } else {
          setError(res.error ?? "Error al cargar");
        }
      });
    }
  }

  function close() { setIsOpen(false); }

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      <button
        onClick={open}
        className="text-xs font-medium text-violet-700 hover:underline underline-offset-2 whitespace-nowrap"
      >
        Ver historial ({eventCount})
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={close}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-pum-border flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-pum-text">{subjectName}</h2>
                <p className="text-xs text-pum-text-muted mt-0.5">
                  {teacherName ?? "—"} · {yearLabel}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Link
                  href={ROUTES.SUPERADMIN.plan(planId)}
                  className="text-xs font-medium text-violet-700 hover:underline underline-offset-2"
                  onClick={close}
                >
                  Gestionar PUM →
                </Link>
                <button
                  onClick={close}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-pum-bg text-pum-text-muted hover:text-pum-text transition-colors text-lg leading-none"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {isPending && (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-pum-text-muted animate-pulse">Cargando historial…</p>
                </div>
              )}

              {error && !isPending && (
                <p className="text-sm text-red-600 text-center py-8">{error}</p>
              )}

              {history && !isPending && history.length === 0 && (
                <p className="text-sm text-pum-text-muted text-center py-8 italic">
                  Sin eventos registrados para este PUM.
                </p>
              )}

              {history && !isPending && history.length > 0 && (
                <ol className="relative border-l-2 border-pum-border ml-3 space-y-0">
                  {history.map((ev, idx) => (
                    <li key={ev.id} className="mb-6 ml-6">
                      {/* Dot */}
                      <span
                        className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full text-sm ring-4 ring-white"
                        style={{ background: idx === 0 ? "#ede9fe" : "#f3f4f6" }}
                      >
                        {EVENT_ICON[ev.eventType] ?? "•"}
                      </span>

                      <div className="rounded-xl border border-pum-border bg-white p-3">
                        <p className="text-sm font-medium text-pum-text">{ev.eventLabel}</p>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-pum-text-muted">
                          {ev.actorName && (
                            <span>
                              {ev.actorRoleLabel ?? ev.actorRole}: <strong className="text-pum-text">{ev.actorName}</strong>
                            </span>
                          )}
                          {ev.sectionLabel && <span>Sección: {ev.sectionLabel}</span>}
                          <time>
                            {new Date(ev.createdAt).toLocaleString("es-EC", {
                              day: "2-digit", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </time>
                        </div>

                        {ev.comment && (
                          <p className="mt-2 text-xs italic text-pum-text-muted border-l-2 border-violet-200 pl-2">
                            &ldquo;{ev.comment}&rdquo;
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-pum-border flex-shrink-0 flex justify-end">
              <button
                onClick={close}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-pum-border text-pum-text hover:bg-pum-bg/50 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
