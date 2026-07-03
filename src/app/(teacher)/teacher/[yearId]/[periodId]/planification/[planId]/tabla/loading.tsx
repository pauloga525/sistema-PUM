function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ""}`}
      style={{ background: "rgba(0,39,83,0.07)" }}
    />
  );
}

export default function TablaLoading() {
  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2">
        <Bone className="h-3.5 w-16" />
        <span className="text-pum-text-disabled">/</span>
        <Bone className="h-3.5 w-20" />
        <span className="text-pum-text-disabled">/</span>
        <Bone className="h-3.5 w-32" />
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Bone className="h-8 w-48" />
            <Bone className="h-6 w-24 rounded-full" />
          </div>
          <Bone className="h-4 w-64" />
        </div>
        <Bone className="h-4 w-24" />
      </div>

      {/* Lifecycle bar */}
      <div className="mb-6 flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center" style={{ flex: i < 5 ? 1 : "0 0 auto" }}>
            <Bone className="h-7 w-7 rounded-full flex-shrink-0" />
            {i < 5 && <Bone className="h-0.5 flex-1 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        <Bone className="h-10 w-44 rounded-full" />
        <Bone className="h-4 w-4 rounded" />
        <Bone className="h-10 w-40 rounded-full" />
      </div>

      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between mb-4">
        <Bone className="h-4 w-32" />
        <div className="flex gap-2">
          <Bone className="h-9 w-24 rounded-md" />
          <Bone className="h-9 w-28 rounded-md" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border border-pum-border overflow-hidden">
        {/* Header row */}
        <div
          className="flex gap-0 px-0"
          style={{ background: "rgba(0,39,83,0.85)", padding: "12px 12px" }}
        >
          {[3, 22, 17, 22, 13, 19].map((w, i) => (
            <div key={i} className="px-2" style={{ width: `${w}%` }}>
              <div
                className="h-3 rounded-lg animate-pulse"
                style={{ background: "rgba(255,255,255,0.25)" }}
              />
            </div>
          ))}
        </div>

        {/* Data rows */}
        {Array.from({ length: 3 }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="flex gap-0 border-t"
            style={{
              borderColor: "rgba(0,39,83,0.07)",
              padding: "16px 12px",
              background: rowIdx % 2 === 0 ? "transparent" : "rgba(0,39,83,0.01)",
            }}
          >
            <div className="px-2" style={{ width: "3%" }}>
              <Bone className="h-4 w-4 mx-auto" />
            </div>
            {[22, 17, 22, 13, 19].map((w, i) => (
              <div key={i} className="px-2 flex flex-col gap-2" style={{ width: `${w}%` }}>
                <Bone className="h-3 w-full" />
                <Bone className="h-3 w-3/4" />
                {i === 2 && <Bone className="h-3 w-1/2" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
