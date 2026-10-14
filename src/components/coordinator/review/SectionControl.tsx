"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import type { AnySectionKey, SectionStates } from "@/constants/review";

interface SectionControlProps {
  sectionKey: AnySectionKey;
  states: SectionStates;
  disabled: boolean;
  onApprove: (key: AnySectionKey, current: boolean) => void;
  onSaveComment: (key: AnySectionKey, comment: string) => void;
  darkBg?: boolean;
  showInlineComment?: boolean;
}

/** Aprobar / comentar una sección del PUM; en solo lectura muestra su estado. */
export function SectionControl({
  sectionKey,
  states,
  disabled,
  onApprove,
  onSaveComment,
  darkBg = false,
  showInlineComment = true,
}: SectionControlProps) {
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

  const hasPendingComment = !!state?.comment?.trim();

  return (
    <div className="flex flex-col items-end gap-1" style={{ marginLeft: "auto", position: "relative" }}>
      <div className="flex items-center gap-1">
        {/* Comentar */}
        <button
          type="button"
          title={state?.comment ? "Editar comentario" : "Agregar comentario"}
          aria-label={state?.comment ? "Editar comentario" : "Agregar comentario"}
          onClick={() => { setShowInput((v) => !v); setCommentText(state?.comment ?? ""); }}
          className="w-6 h-6 rounded flex items-center justify-center transition-colors flex-shrink-0"
          style={darkBg
            ? { background: state?.comment ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.18)", color: "white" }
            : { background: state?.comment ? "rgba(234,179,8,0.20)" : "rgba(0,39,83,0.10)", color: state?.comment ? "#713f12" : "#002753" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {/* Aprobar — deshabilitado si hay comentario pendiente */}
        <button
          type="button"
          disabled={hasPendingComment}
          title={
            hasPendingComment
              ? "Hay un comentario pendiente — el docente debe corregir antes de aprobar"
              : state?.approved
              ? "Quitar aprobación"
              : "Aprobar sección"
          }
          aria-pressed={state?.approved ?? false}
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

      {/* Comentario de la sección */}
      <Dialog open={showInput} onOpenChange={setShowInput} title="Retroalimentación" size="sm">
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Escribe tu retroalimentación..."
          aria-label="Retroalimentación"
          rows={4}
          className="w-full text-xs text-pum-text resize-none outline-none leading-snug rounded-xl px-3 py-2"
          style={{ background: "rgba(0,39,83,0.04)", border: "1px solid rgba(0,39,83,0.12)" }}
        />
        <div className="flex gap-2 justify-end mt-2.5">
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
      </Dialog>

      {/* Comentario guardado — solo en secciones de cabecera/metadatos */}
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
