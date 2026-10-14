/** Barra de PUM aprobados / total de un coordinador. */
export function ProgressBar({ done, total }: { done: number; total: number }) {
  if (total === 0) return <span className="text-xs text-pum-text-disabled">Sin PUMs aún</span>;
  const pct   = Math.round((done / total) * 100);
  const color = pct === 100 ? "#16a34a" : pct >= 50 ? "#002753" : "#ca8a04";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(0,39,83,0.08)" }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label="PUMs aprobados"
      >
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color }}>
        {done}/{total}
      </span>
    </div>
  );
}
