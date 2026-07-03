function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ""}`}
      style={{ background: "rgba(0,39,83,0.07)" }}
    />
  );
}

export default function PlanMetadataLoading() {
  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2">
        <Bone className="h-3.5 w-16" />
        <span className="text-pum-text-disabled">/</span>
        <Bone className="h-3.5 w-20" />
        <span className="text-pum-text-disabled">/</span>
        <Bone className="h-3.5 w-24" />
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

      {/* Form fields */}
      <div className="flex flex-col gap-5">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Bone className="h-3 w-28" />
            <Bone className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
