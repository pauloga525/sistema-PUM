"use client";

import { useState, useTransition } from "react";
import { dismissOnboardingAction } from "@/app/(teacher)/teacher/year/actions";

const STEPS = [
  {
    num:   "1",
    title: "Datos de la Unidad",
    desc:  "Completa la información general: objetivos, criterios de evaluación y fechas.",
    color: "#002753",
    bg:    "rgba(0,39,83,0.08)",
  },
  {
    num:   "2",
    title: "Plan de Unidad",
    desc:  "Llena la tabla de planificación: destrezas (DCD), metodología y evaluación.",
    color: "#7c3aed",
    bg:    "#f3e8ff",
  },
  {
    num:   "3",
    title: "Finalizar y enviar",
    desc:  "Haz clic en \"Finalizar PUM\" para enviar tu planificación al coordinador.",
    color: "#0d8a5e",
    bg:    "#e0f5ee",
  },
] as const;

export function OnboardingBanner() {
  const [visible,   setVisible]   = useState(true);
  const [isPending, startTransition] = useTransition();

  function dismiss() {
    startTransition(async () => {
      await dismissOnboardingAction();
      setVisible(false);
    });
  }

  if (!visible) return null;

  return (
    <div
      className="w-full max-w-2xl mx-auto mb-6 rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(195,198,210,0.70)",
        boxShadow: "0 4px 24px rgba(0,39,83,0.08)",
      }}
    >
      {/* Header stripe */}
      <div
        className="px-6 py-4 flex items-start justify-between gap-4"
        style={{ background: "linear-gradient(135deg, #002753 0%, #003d7a 100%)" }}
      >
        <div>
          <p className="text-white font-semibold text-base leading-tight">
            Bienvenido al Sistema PUM
          </p>
          <p className="text-blue-200/75 text-xs mt-0.5">
            Sigue estos 3 pasos para completar tu planificación de unidad
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          disabled={isPending}
          aria-label="Cerrar guía"
          className="w-6 h-6 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 mt-0.5 cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Steps */}
      <div className="px-6 py-5 grid sm:grid-cols-3 gap-4">
        {STEPS.map((s) => (
          <div key={s.num} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                style={{ background: s.bg, color: s.color }}
              >
                {s.num}
              </div>
              <p className="text-sm font-semibold" style={{ color: s.color }}>
                {s.title}
              </p>
            </div>
            <p className="text-xs text-pum-text-muted leading-relaxed pl-8">
              {s.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="px-6 py-3 flex justify-end"
        style={{ borderTop: "1px solid rgba(0,39,83,0.07)" }}
      >
        <button
          type="button"
          onClick={dismiss}
          disabled={isPending}
          className="text-sm font-semibold px-5 py-2 rounded-xl text-white transition-colors disabled:opacity-60 cursor-pointer"
          style={{ background: "linear-gradient(135deg, #002753 0%, #003d7a 100%)" }}
        >
          {isPending ? "Guardando…" : "Entendido, empezar"}
        </button>
      </div>
    </div>
  );
}
