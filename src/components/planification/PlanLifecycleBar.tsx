// Server component — no state needed
const STAGES = [
  { key: "DRAFT",             label: "Borrador",           short: "1" },
  { key: "SUBMITTED",         label: "Enviado",             short: "2" },
  { key: "REVIEWED",          label: "Revisado",            short: "3" },
  { key: "PENDING_SIGNATURE", label: "Pend. firma",         short: "4" },
  { key: "SIGNED",            label: "Completado",          short: "5" },
] as const;

type StageKey = typeof STAGES[number]["key"];

function planStatusToStage(status: string): number {
  switch (status) {
    case "DRAFT":
      return 0;
    case "FINALIZED":
    case "FEEDBACK_RECEIVED":
      return 1;
    case "APPROVED":
      return 2;
    case "PENDING_SIGNATURE":
      return 3;
    case "SIGNED":
      return 4;
    default:
      return 0;
  }
}

interface Props {
  status: string;
}

export function PlanLifecycleBar({ status }: Props) {
  const currentIdx = planStatusToStage(status);

  return (
    <div className="flex items-center gap-0 mb-6" aria-label="Estado del ciclo de vida del PUM">
      {STAGES.map((stage, idx) => {
        const isDone    = idx < currentIdx;
        const isActive  = idx === currentIdx;
        const isFuture  = idx > currentIdx;

        const dotBg = isDone
          ? "#16a34a"
          : isActive
          ? "#002753"
          : "rgba(0,39,83,0.12)";

        const textColor = isDone
          ? "#16a34a"
          : isActive
          ? "#002753"
          : "#9ba3af";

        const lineBg = isDone
          ? "#16a34a"
          : "rgba(0,39,83,0.10)";

        return (
          <div key={stage.key} className="flex items-center" style={{ flex: idx < STAGES.length - 1 ? "1" : "0 0 auto" }}>
            {/* Stage */}
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors"
                style={{
                  background: dotBg,
                  color: isDone || isActive ? "white" : "#9ba3af",
                  border: isActive ? "2px solid rgba(0,39,83,0.35)" : "none",
                  boxShadow: isActive ? "0 0 0 3px rgba(0,39,83,0.08)" : "none",
                }}
              >
                {isDone ? "✓" : stage.short}
              </div>
              <span
                className="text-[10px] font-medium whitespace-nowrap leading-tight text-center"
                style={{ color: textColor, maxWidth: "64px" }}
              >
                {stage.label}
              </span>
            </div>

            {/* Connector line */}
            {idx < STAGES.length - 1 && (
              <div
                className="h-0.5 flex-1 mx-1 rounded-full transition-colors"
                style={{ background: lineBg, minWidth: "16px" }}
              />
            )}
          </div>
        );
      })}

      {/* Feedback sub-state label */}
      {status === "FEEDBACK_RECEIVED" && (
        <span
          className="ml-3 inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: "#fff7ed", color: "#b45309", border: "1px solid rgba(249,115,22,0.25)" }}
        >
          con observaciones
        </span>
      )}
      {status === "ADMIN_REJECTED" && (
        <span
          className="ml-3 inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: "#ffdad6", color: "#ba1a1a", border: "1px solid rgba(186,26,26,0.20)" }}
        >
          rechazado — reenviando
        </span>
      )}
    </div>
  );
}
