"use client";

import { useState } from "react";
import type { DuaSelection } from "@/modules/planification/planification.types";
import { DUA_PRINCIPIOS } from "@/constants/planification";
import { FeedbackHighlight } from "./FeedbackHighlight";
import { SectionTitle } from "./fields";
import type { SectionProps } from "./types";

type PrincipioKey = "p1" | "p2" | "p3";

/** Alterna una sub-pauta dentro de la selección DUA de un principio. */
function toggleSubPauta(current: DuaSelection, pautaNum: number, subNum: number): DuaSelection {
  const existing = current.find((e) => e.pauta === pautaNum);
  if (!existing) return [...current, { pauta: pautaNum, subPautas: [subNum] }];
  const newSubs = existing.subPautas.includes(subNum)
    ? existing.subPautas.filter((n) => n !== subNum)
    : [...existing.subPautas, subNum].sort((a, b) => a - b);
  return newSubs.length === 0
    ? current.filter((e) => e.pauta !== pautaNum)
    : current.map((e) => (e.pauta === pautaNum ? { ...e, subPautas: newSubs } : e));
}

/** Pautas del Diseño Universal del Aprendizaje (tres principios). */
export function DuaSection({ form, update, feedback, disabled, idPrefix }: Omit<SectionProps, "errors" | "required">) {
  // Qué pautas están expandidas por principio (solo UI, no afecta los datos)
  const [expanded, setExpanded] = useState<Record<PrincipioKey, number[]>>({ p1: [], p2: [], p3: [] });
  const titleId = `${idPrefix}-dua-title`;

  const toggleExpand = (fieldKey: PrincipioKey, pautaNum: number) => {
    setExpanded((prev) => {
      const cur = prev[fieldKey];
      return {
        ...prev,
        [fieldKey]: cur.includes(pautaNum) ? cur.filter((n) => n !== pautaNum) : [...cur, pautaNum],
      };
    });
  };

  return (
    <section aria-labelledby={titleId}>
      <SectionTitle id={titleId}>Diseño Universal del Aprendizaje — Pautas</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {DUA_PRINCIPIOS.map((p) => {
          const fieldKey  = p.key as PrincipioKey;
          const reviewKey = `dua_${p.key}` as "dua_p1" | "dua_p2" | "dua_p3";
          const selection: DuaSelection = form[fieldKey] ?? [];
          const opened = expanded[fieldKey];
          const labelId = `${idPrefix}-dua-${p.key}`;

          const onToggleSub = (pautaNum: number, subNum: number) => {
            if (disabled) return;
            const updated = toggleSubPauta(form[fieldKey] ?? [], pautaNum, subNum);
            update(fieldKey, updated.length > 0 ? updated : null, reviewKey);
          };

          const totalSubs    = selection.reduce((acc, e) => acc + e.subPautas.length, 0);
          const activePautas = selection.filter((e) => e.subPautas.length > 0).length;

          return (
            <FeedbackHighlight key={p.key} state={feedback[reviewKey]}>
              <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
                <p id={labelId} className="text-[11px] font-bold uppercase tracking-wide text-pum-text leading-tight">
                  {p.label}
                </p>

                {/* Pautas — cada una se expande/colapsa independientemente */}
                <div className="flex flex-col gap-1.5">
                  {p.pautas.map((pauta) => {
                    const entry = selection.find((e) => e.pauta === pauta.num);
                    const hasSelection = (entry?.subPautas.length ?? 0) > 0;
                    const isExpanded   = opened.includes(pauta.num);
                    const panelId      = `${idPrefix}-dua-${p.key}-${pauta.num}`;

                    return (
                      <div key={pauta.num}>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleExpand(fieldKey, pauta.num)}
                          aria-expanded={isExpanded}
                          aria-controls={isExpanded ? panelId : undefined}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all select-none text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(0,39,83,0.40)]${disabled ? " opacity-60 cursor-not-allowed" : " cursor-pointer"}`}
                          style={{
                            background: hasSelection ? "rgba(0,39,83,0.10)" : isExpanded ? "rgba(0,39,83,0.05)" : "rgba(0,39,83,0.03)",
                            border:     `1.5px solid ${hasSelection ? "rgba(0,39,83,0.35)" : isExpanded ? "rgba(0,39,83,0.20)" : "rgba(0,39,83,0.10)"}`,
                            color:      hasSelection ? "#002753" : "#5A6A82",
                          }}
                        >
                          <span className={`flex-1 text-left leading-tight${hasSelection ? " font-semibold" : ""}`}>{pauta.label}</span>
                          {hasSelection && (
                            <span
                              style={{ fontSize: "10px", background: "rgba(0,39,83,0.18)", borderRadius: "9999px", padding: "1px 6px", flexShrink: 0, color: "#002753" }}
                            >
                              {entry!.subPautas.length}
                            </span>
                          )}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12" height="12" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round"
                            aria-hidden="true"
                            style={{ flexShrink: 0, transition: "transform 0.15s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>

                        {/* Sub-pautas expandibles */}
                        {isExpanded && (
                          <div
                            id={panelId}
                            className="flex flex-col gap-1 mt-1 ml-3 pl-3"
                            style={{ borderLeft: "2px solid rgba(0,39,83,0.15)" }}
                          >
                            {pauta.subPautas.map((sp) => {
                              const isChecked = entry?.subPautas.includes(sp.num) ?? false;
                              return (
                                <label
                                  key={sp.num}
                                  className={`flex items-start gap-1.5 py-0.5 cursor-pointer select-none text-[11px]${disabled ? " cursor-not-allowed opacity-60" : ""}`}
                                  style={{ color: isChecked ? "#002753" : "#5A6A82" }}
                                >
                                  <input
                                    type="checkbox"
                                    className="mt-0.5 flex-shrink-0 accent-pum-primary"
                                    checked={isChecked}
                                    disabled={disabled}
                                    onChange={() => onToggleSub(pauta.num, sp.num)}
                                  />
                                  <span className={isChecked ? "font-medium" : ""}>
                                    P{p.num}:{pauta.num}.{sp.num} {sp.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Contador */}
                {totalSubs > 0 && (
                  <p className="text-[10px] mt-0.5" style={{ color: "#5A6A82" }}>
                    {activePautas} pauta{activePautas !== 1 ? "s" : ""} — {totalSubs} sub-pauta{totalSubs !== 1 ? "s" : ""} seleccionada{totalSubs !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </FeedbackHighlight>
          );
        })}
      </div>
    </section>
  );
}
