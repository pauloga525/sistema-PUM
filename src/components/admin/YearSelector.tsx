"use client";

import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";

interface YearOption {
  id: string;
  label: string;
  active: boolean;
}

interface Props {
  years: YearOption[];
  currentYearId: string;
  basePath?: string;
}

export function YearSelector({ years, currentYearId, basePath = ROUTES.ADMIN.ASSIGNMENTS }: Props) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-pum-text-muted" htmlFor="year-select">
        Año lectivo:
      </label>
      <select
        id="year-select"
        value={currentYearId}
        onChange={(e) => router.push(`${basePath}?yearId=${e.target.value}`)}
        className="text-sm font-medium text-pum-text rounded-xl px-3 py-1.5 cursor-pointer outline-none focus:ring-2"
        style={{
          background: "rgba(255,255,255,0.90)",
          border: "1px solid rgba(0,39,83,0.18)",
          boxShadow: "0 1px 4px rgba(0,39,83,0.05)",
        }}
      >
        {years.map((y) => (
          <option key={y.id} value={y.id}>
            {y.label}{y.active ? " (activo)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
