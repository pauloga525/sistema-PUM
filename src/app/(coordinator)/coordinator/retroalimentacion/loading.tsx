function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ""}`}
      style={{ background: "rgba(0,39,83,0.07)", ...style }}
    />
  );
}

export default function RetroalimentacionLoading() {
  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-7">
        <div className="flex flex-col gap-2">
          <Bone className="h-7 w-48" />
          <Bone className="h-4 w-72" />
        </div>
        <Bone className="h-9 w-36 rounded-xl" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{
              background: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(195,198,210,0.70)",
              boxShadow: "0 2px 12px rgba(0,39,83,0.05)",
            }}
          >
            <Bone className="h-10 w-10 rounded-xl flex-shrink-0" />
            <Bone className="h-3 flex-1" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        className="overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.85)",
          border: "1px solid rgba(195,198,210,0.70)",
          borderRadius: "1.25rem",
          boxShadow: "0 2px 12px rgba(0,39,83,0.05)",
        }}
      >
        {/* Table header */}
        <div
          className="flex gap-4 px-4 py-3"
          style={{ background: "rgba(0,39,83,0.04)", borderBottom: "1px solid rgba(0,39,83,0.07)" }}
        >
          {[14, 16, 8, 10, 12, 16, 14].map((w, i) => (
            <Bone key={i} className="h-2.5" style={{ width: `${w}%` }} />
          ))}
        </div>

        {/* Table rows */}
        {Array.from({ length: 4 }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="flex gap-4 px-4 py-3 border-t"
            style={{
              borderColor: "rgba(0,39,83,0.07)",
              background: rowIdx % 2 === 0 ? "transparent" : "rgba(0,39,83,0.01)",
            }}
          >
            <div className="flex flex-col gap-1" style={{ width: "14%" }}>
              <Bone className="h-3.5 w-full" />
              <Bone className="h-2.5 w-3/4" />
            </div>
            <div className="flex flex-col gap-1" style={{ width: "16%" }}>
              <Bone className="h-3.5 w-full" />
              <Bone className="h-2.5 w-1/2" />
            </div>
            <Bone className="h-3.5" style={{ width: "8%" }} />
            <Bone className="h-3.5" style={{ width: "10%" }} />
            <Bone className="h-3 rounded-full" style={{ width: "12%", alignSelf: "center" }} />
            <Bone className="h-6 w-24 rounded-full" style={{ width: "16%", alignSelf: "center" }} />
            <div className="flex gap-2" style={{ width: "14%", alignItems: "center" }}>
              <Bone className="h-7 w-20 rounded-lg" />
              <Bone className="h-7 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
