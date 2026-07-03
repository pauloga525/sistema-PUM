"use client";

import { useEffect, useState, useTransition } from "react";
import type { PumNotification } from "@/modules/notifications/notifications.service";

const STORAGE_KEY = "pum_notifications_seen_v1";

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function markAsSeen(ids: string[]) {
  try {
    const seen = getSeenIds();
    for (const id of ids) seen.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    // ignore
  }
}

const TYPE_CONFIG = {
  feedback_received: {
    icon: "💬",
    title: "Tienes retroalimentación del coordinador",
    color: "#b45309",
    bg: "#fff7ed",
    border: "rgba(180,83,9,0.20)",
    dot: "#f97316",
  },
  coordinator_approved: {
    icon: "✅",
    title: "Tu PUM fue aprobado por el coordinador",
    color: "#166534",
    bg: "#f0fdf4",
    border: "rgba(22,101,52,0.18)",
    dot: "#16a34a",
  },
  admin_signed: {
    icon: "🏛️",
    title: "Tu PUM fue firmado y aprobado por el administrador",
    color: "#0f766e",
    bg: "#f0fdfa",
    border: "rgba(15,118,110,0.18)",
    dot: "#0d9488",
  },
  pending_review: {
    icon: "📋",
    title: "PUM pendiente de revisión",
    color: "#002753",
    bg: "#f0f4ff",
    border: "rgba(0,39,83,0.15)",
    dot: "#003d7a",
  },
  admin_rejected: {
    icon: "⚠️",
    title: "PUM rechazado por el administrador",
    color: "#ba1a1a",
    bg: "#ffdad6",
    border: "rgba(186,26,26,0.18)",
    dot: "#ba1a1a",
  },
} satisfies Record<PumNotification["type"], { icon: string; title: string; color: string; bg: string; border: string; dot: string }>;

interface Props {
  fetchNotifications: () => Promise<PumNotification[]>;
}

export function NotificationModal({ fetchNotifications }: Props) {
  const [unseen, setUnseen] = useState<PumNotification[]>([]);
  const [visible, setVisible] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const all = await fetchNotifications();
      const seen = getSeenIds();
      const fresh = all.filter((n) => !seen.has(n.id));
      if (fresh.length > 0) {
        setUnseen(fresh);
        setVisible(true);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible || unseen.length === 0) return null;

  const handleDismiss = () => {
    markAsSeen(unseen.map((n) => n.id));
    setVisible(false);
  };

  // Group by type for coordinators (multiple pending reviews look better grouped)
  const groups = unseen.reduce<Record<string, PumNotification[]>>((acc, n) => {
    (acc[n.type] ??= []).push(n);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.50)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.98)",
          border: "1px solid rgba(195,198,210,0.70)",
          boxShadow: "0 24px 64px rgba(0,39,83,0.22)",
          maxHeight: "80vh",
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center gap-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(0,39,83,0.08)" }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: "#dce8ff" }}
          >
            🔔
          </div>
          <div>
            <p className="text-sm font-semibold text-pum-text">Novedades en tus PUMs</p>
            <p className="text-xs text-pum-text-muted mt-0.5">
              {unseen.length} {unseen.length === 1 ? "novedad" : "novedades"} sin revisar
            </p>
          </div>
        </div>

        {/* Notification list */}
        <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-2">
          {Object.entries(groups).map(([type, items]) => {
            const cfg = TYPE_CONFIG[type as PumNotification["type"]];
            return (
              <div
                key={type}
                className="rounded-xl p-4"
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-base leading-none mt-0.5">{cfg.icon}</span>
                  <p className="text-xs font-semibold" style={{ color: cfg.color }}>
                    {cfg.title}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 ml-6">
                  {items.map((n) => (
                    <div key={n.id} className="flex items-start gap-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                        style={{ background: cfg.dot }}
                      />
                      <div>
                        <p className="text-xs font-medium" style={{ color: cfg.color }}>
                          {n.subjectName}
                          {n.levelCode && (
                            <span className="font-normal"> · {n.levelCode}</span>
                          )}
                          {n.teacherName && (
                            <span className="font-normal"> · {n.teacherName}</span>
                          )}
                        </p>
                        <p className="text-[11px]" style={{ color: cfg.color, opacity: 0.75 }}>
                          {n.periodName} — {n.yearLabel}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex justify-end flex-shrink-0"
          style={{ borderTop: "1px solid rgba(0,39,83,0.08)" }}
        >
          <button
            onClick={handleDismiss}
            className="text-sm font-semibold px-5 py-2 rounded-xl text-white transition-colors"
            style={{
              background: "linear-gradient(135deg, #002753 0%, #003d7a 100%)",
              boxShadow: "0 2px 8px rgba(0,39,83,0.25)",
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
