"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id:      string;
  message: string;
  type:    ToastType;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void;
}

// ── Context ────────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ── Style maps ─────────────────────────────────────────────────────────────────

const ICON: Record<ToastType, string> = {
  success: "✓",
  error:   "✕",
  info:    "i",
};

const STYLE: Record<ToastType, { bg: string; border: string; color: string; iconBg: string }> = {
  success: { bg: "#dcfce7", border: "rgba(22,163,74,0.30)",   color: "#166534", iconBg: "#bbf7d0" },
  error:   { bg: "#fdecea", border: "rgba(198,40,40,0.25)",   color: "#ba1a1a", iconBg: "#fecaca" },
  info:    { bg: "rgba(0,39,83,0.07)", border: "rgba(0,39,83,0.15)", color: "#002753", iconBg: "rgba(0,39,83,0.13)" },
};

// ── Provider ───────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const addToast = useCallback((message: string, type: ToastType = "success") => {
    const id = String(++counter.current);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {toasts.length > 0 && (
        <div
          className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2"
          style={{ pointerEvents: "none" }}
          aria-live="polite"
          aria-atomic="false"
        >
          {toasts.map((t) => {
            const s = STYLE[t.type];
            return (
              <div
                key={t.id}
                role="alert"
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                  minWidth: "220px",
                  maxWidth: "360px",
                  pointerEvents: "auto",
                }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: s.iconBg, color: s.color }}
                >
                  {ICON[t.type]}
                </div>
                <p className="text-sm font-medium" style={{ color: s.color }}>
                  {t.message}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}
