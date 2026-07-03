"use client";

import { useState } from "react";
import { AcademicYearManager } from "./AcademicYearManager";
import { SubjectManager } from "./SubjectManager";

// ── Tipos compartidos ──────────────────────────────────────────────────────────

export interface PeriodData {
  id: string;
  name: string;
  number: number;
  startDate: Date | null;
  endDate: Date | null;
}

export interface YearData {
  id: string;
  label: string;
  yearStart: number;
  active: boolean;
  startDate: Date | null;
  endDate: Date | null;
  periods: PeriodData[];
  _count: { assignments: number };
}

export interface LevelData {
  id: string;
  name: string;
  code: string;
  orderIndex: number;
  track: string;
}

export interface SubjectLevelData {
  id: string;
  levelId: string;
  level: { id: string; name: string; code: string };
}

export interface SubjectData {
  id: string;
  name: string;
  code: string;
  areaEstudio: string | null;
  subjectLevels: SubjectLevelData[];
}

interface Props {
  years:    YearData[];
  levels:   LevelData[];
  subjects: SubjectData[];
}

type TabId = "years" | "subjects";

// ── Componente principal ───────────────────────────────────────────────────────

export function CatalogClient({ years, levels, subjects }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("years");

  const TABS: { id: TabId; label: string; count: number }[] = [
    { id: "years",    label: "Años lectivos", count: years.length },
    { id: "subjects", label: "Materias",      count: subjects.length },
  ];

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">

      {/* ── Encabezado ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-pum-text">Catálogo</h1>
        <p className="text-sm text-pum-text-muted mt-0.5">
          Gestión de años lectivos y materias del sistema.
        </p>
      </div>

      {/* ── Tabs ── */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6 self-start"
        style={{ background: "rgba(0,39,83,0.07)" }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
              style={
                isActive
                  ? { background: "#fff", color: "#002753", boxShadow: "0 1px 4px rgba(0,39,83,0.14)" }
                  : { color: "rgba(0,39,83,0.55)", background: "transparent" }
              }
            >
              {tab.label}
              <span
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1 tabular-nums"
                style={
                  isActive
                    ? { background: "rgba(0,39,83,0.10)", color: "#002753" }
                    : { background: "rgba(0,39,83,0.07)", color: "rgba(0,39,83,0.45)" }
                }
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Contenido de cada tab ── */}
      {activeTab === "years" && (
        <AcademicYearManager years={years} />
      )}
      {activeTab === "subjects" && (
        <SubjectManager subjects={subjects} levels={levels} />
      )}
    </div>
  );
}
