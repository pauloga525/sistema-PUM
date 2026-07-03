import { REVIEW_SECTION_KEYS, REVIEW_SECTION_LABELS, type SectionStates, type ReviewSectionKey } from "@/constants/review";

interface FeedbackPanelProps {
  states: SectionStates;
  rowCount: number;
}

// Sections that the coordinator reviews at column level (not pum_ since those are row-level now)
const SECTION_KEYS_SHOWN: ReviewSectionKey[] = REVIEW_SECTION_KEYS.filter(
  (k) => !k.startsWith("pum_")
);

// ── Comment card (naranja) ─────────────────────────────────────────────────────

function CommentCard({ label, comment }: { label: string; comment: string }) {
  return (
    <div
      style={{
        background: "#fff7ed",
        border: "2px solid #fb923c",
        borderRadius: "14px",
        padding: "10px 14px",
        position: "relative",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        {/* Burbuja de pensamiento */}
        <span style={{ fontSize: "16px", lineHeight: 1 }}>💬</span>
        <span
          style={{
            fontWeight: "700",
            fontSize: "11px",
            color: "#c2410c",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}
        >
          {label}
        </span>
      </div>
      <p
        style={{
          fontSize: "12px",
          color: "#7c2d12",
          lineHeight: "1.55",
          margin: 0,
          fontStyle: "italic",
        }}
      >
        &ldquo;{comment}&rdquo;
      </p>
    </div>
  );
}

// ── Chip aprobado (verde) ──────────────────────────────────────────────────────

function ApprovedChip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full"
      style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#166534" }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {label}
    </span>
  );
}

// ── FeedbackPanel ──────────────────────────────────────────────────────────────

export function FeedbackPanel({ states, rowCount }: FeedbackPanelProps) {
  // Collect all comment items (sections + rows)
  const commentItems: { label: string; comment: string }[] = [];
  const approvedItems: { label: string }[] = [];

  for (const key of SECTION_KEYS_SHOWN) {
    const s = states[key];
    if (!s) continue;
    const label = REVIEW_SECTION_LABELS[key];
    if (s.comment?.trim()) {
      commentItems.push({ label, comment: s.comment.trim() });
    } else if (s.approved) {
      approvedItems.push({ label });
    }
  }

  for (let i = 0; i < rowCount; i++) {
    const s = states[`row_${i}`];
    if (!s) continue;
    const label = `Fila ${i + 1} de la tabla`;
    if (s.comment?.trim()) {
      commentItems.push({ label, comment: s.comment.trim() });
    } else if (s.approved) {
      approvedItems.push({ label });
    }
  }

  const hasAnything = commentItems.length > 0 || approvedItems.length > 0;

  return (
    <div
      className="rounded-2xl p-5 mb-6"
      style={{
        background: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(251,146,60,0.30)",
        boxShadow: "0 2px 12px rgba(180,83,9,0.06)",
      }}
    >
      <h3
        className="text-sm font-bold mb-4 flex items-center gap-2"
        style={{ color: "#b45309" }}
      >
        <span style={{ fontSize: "16px" }}>💬</span>
        Observaciones del coordinador
      </h3>

      {!hasAnything && (
        <p className="text-sm text-pum-text-muted">
          El coordinador envió la revisión. Realiza las correcciones necesarias y vuelve a finalizar el PUM.
        </p>
      )}

      {/* Campos con comentarios — destacados en naranja */}
      {commentItems.length > 0 && (
        <div className="mb-5">
          <p
            className="text-[10px] font-bold uppercase tracking-wider mb-3"
            style={{ color: "#c2410c" }}
          >
            Campos que requieren corrección
          </p>
          <div className="flex flex-col gap-3">
            {commentItems.map((item, i) => (
              <CommentCard key={i} label={item.label} comment={item.comment} />
            ))}
          </div>
        </div>
      )}

      {/* Campos aprobados — compactos en verde */}
      {approvedItems.length > 0 && (
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-wider mb-2"
            style={{ color: "#15803d" }}
          >
            Campos aprobados
          </p>
          <div className="flex flex-wrap gap-2">
            {approvedItems.map((item, i) => (
              <ApprovedChip key={i} label={item.label} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
