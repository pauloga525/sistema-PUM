"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { SectionState } from "@/constants/review";

/**
 * Resalta un bloque con la revisión del coordinador: naranja con comentario
 * (visible como tooltip al pasar el mouse) o verde si fue aprobado.
 */
export function FeedbackHighlight({
  state,
  children,
}: {
  state?: SectionState;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; bottom: number } | null>(null);

  const hasComment = !!state?.comment?.trim();
  const isApproved = !!(state?.approved && !hasComment);
  if (!hasComment && !isApproved) return <>{children}</>;

  const borderColor = hasComment ? "#f97316" : "#16a34a";
  const bg          = hasComment ? "rgba(249,115,22,0.07)" : "rgba(22,163,74,0.06)";

  const showTooltip = () => {
    if (!hasComment || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setTooltipPos({ x: r.left + r.width / 2, bottom: window.innerHeight - r.top + 6 });
  };

  // Portal: escapa del contexto de apilamiento creado por backdrop-filter
  const tooltip = tooltipPos ? (
    <div
      className="pointer-events-none"
      style={{
        position: "fixed",
        bottom: tooltipPos.bottom,
        left: tooltipPos.x,
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "#fef08a",
        border: "1px solid #fbbf24",
        borderRadius: "8px",
        padding: "8px 12px",
        fontSize: "11px",
        color: "#713f12",
        fontWeight: 500,
        width: "220px",
        whiteSpace: "normal",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <p style={{ margin: 0 }}>{state!.comment}</p>
      <div style={{
        position: "absolute", top: "100%", left: "50%",
        transform: "translateX(-50%)",
        width: 0, height: 0,
        borderLeft: "7px solid transparent",
        borderRight: "7px solid transparent",
        borderTop: "7px solid #fbbf24",
      }} />
    </div>
  ) : null;

  return (
    <div
      ref={ref}
      className="relative"
      style={{ border: `1.5px solid ${borderColor}`, borderRadius: "6px", background: bg, padding: "6px 8px" }}
      onMouseEnter={showTooltip}
      onMouseLeave={() => setTooltipPos(null)}
    >
      {children}
      {isApproved && (
        <span
          role="img"
          aria-label="Aprobado por el coordinador"
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
          style={{ background: "#16a34a", lineHeight: 1 }}
        >✓</span>
      )}
      {hasComment && (
        <span
          role="img"
          aria-label="Con observación del coordinador"
          className="absolute -top-3 -right-1.5 text-[13px]"
          style={{ lineHeight: 1 }}
        >💬</span>
      )}
      {typeof document !== "undefined" && tooltip && createPortal(tooltip, document.body)}
    </div>
  );
}
