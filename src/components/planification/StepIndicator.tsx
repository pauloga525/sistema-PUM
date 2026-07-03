import Link from "next/link";

interface Props {
  activeStep: 1 | 2;
  /** When on step 2, pass the href so step 1 becomes a clickable back link */
  step1Href?: string;
  /** When on step 1 and the plan is already finalized, pass the tabla href so step 2 is clickable */
  step2Href?: string;
}

// ── Glass pill base ───────────────────────────────────────────────────────────
const base =
  "inline-flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-md transition-all duration-200 select-none";

const pill = {
  active:
    `${base} ` +
    "bg-gradient-to-b from-white/90 to-[#dce8ff]/60 " +
    "border border-[#a8c8ff]/60 " +
    "shadow-[0_2px_18px_rgba(0,39,83,0.13),inset_0_1.5px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(0,39,83,0.08)]",

  done:
    `${base} ` +
    "bg-gradient-to-b from-white/90 to-emerald-50/70 " +
    "border border-emerald-200/60 " +
    "shadow-[0_2px_18px_rgba(16,185,129,0.11),inset_0_1.5px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(16,185,129,0.06)] " +
    "hover:shadow-[0_3px_22px_rgba(16,185,129,0.18),inset_0_1.5px_0_rgba(255,255,255,0.95)]",

  idle:
    `${base} ` +
    "bg-gradient-to-b from-white/70 to-slate-50/50 " +
    "border border-slate-200/50 " +
    "shadow-[0_1px_10px_rgba(0,0,0,0.05),inset_0_1.5px_0_rgba(255,255,255,0.95)]",
};

// ── Bubble ────────────────────────────────────────────────────────────────────
const bubble = {
  active:
    "w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white " +
    "bg-gradient-to-b from-[#335f9d] to-[#002753] " +
    "shadow-[0_1px_6px_rgba(0,39,83,0.45),inset_0_1px_0_rgba(255,255,255,0.30)]",

  done:
    "w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white " +
    "bg-gradient-to-b from-emerald-400 to-emerald-600 " +
    "shadow-[0_1px_6px_rgba(16,185,129,0.40),inset_0_1px_0_rgba(255,255,255,0.30)]",

  idle:
    "w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-400 " +
    "bg-white border border-slate-200 " +
    "shadow-[inset_0_1px_3px_rgba(0,0,0,0.07)]",
};

// ── Label ─────────────────────────────────────────────────────────────────────
const label = {
  active: "text-sm font-semibold text-[#002753] whitespace-nowrap",
  done:   "text-sm font-semibold text-emerald-700 whitespace-nowrap",
  idle:   "text-sm font-medium text-slate-400 whitespace-nowrap",
};

// ── Chevron connector ─────────────────────────────────────────────────────────
function Chevron() {
  return (
    <svg
      className="w-4 h-4 flex-shrink-0 text-slate-300"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M5.5 3.5l5 4.5-5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function StepIndicator({ activeStep, step1Href, step2Href }: Props) {
  const s1: "active" | "done" = activeStep === 1 ? "active" : "done";
  const s2: "active" | "done" | "idle" = activeStep === 2 ? "active" : step2Href ? "done" : "idle";

  const step1Inner = (
    <>
      <span className={bubble[s1]}>{s1 === "done" ? "✓" : "1"}</span>
      <span className="flex flex-col leading-tight">
        <span className={label[s1]}>Datos de la Unidad</span>
        <span className="text-[10px] font-normal opacity-65 whitespace-nowrap">Objetivos y criterios</span>
      </span>
    </>
  );

  const step2Inner = (
    <>
      <span className={bubble[s2]}>{s2 === "idle" ? "2" : s2 === "done" ? "✓" : "2"}</span>
      <span className="flex flex-col leading-tight">
        <span className={label[s2]}>Plan de Unidad</span>
        <span className="text-[10px] font-normal opacity-65 whitespace-nowrap">Tabla de planificación</span>
      </span>
    </>
  );

  return (
    <div className="flex items-center gap-2 mb-6" aria-label="Pasos del asistente">
      {/* Step 1 */}
      {step1Href ? (
        <Link href={step1Href} className={pill[s1]}>
          {step1Inner}
        </Link>
      ) : (
        <div className={pill[s1]}>{step1Inner}</div>
      )}

      {/* Connector */}
      <Chevron />

      {/* Step 2 */}
      {step2Href ? (
        <Link href={step2Href} className={pill[s2]}>
          {step2Inner}
        </Link>
      ) : (
        <div className={pill[s2]}>{step2Inner}</div>
      )}
    </div>
  );
}
