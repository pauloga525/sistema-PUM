"use client";

import { useState, useTransition, useRef, useCallback, useId } from "react";
import { useRouter } from "next/navigation";
import type { PlanMetadata, AporteMultimodal } from "@/modules/planification/planification.types";
import type { SaveMetadataInput } from "@/modules/planification/planification.schema";
import type { ActionResult } from "@/types";
import type { SectionStates } from "@/constants/review";
import { buildPayload, mergeWithEmpty } from "./metadata/form-state";
import { validateMetadata, type MetadataErrors } from "./metadata/validation";
import type { FeedbackKey, UpdateField } from "./metadata/types";
import { NivelEducativoSection } from "./metadata/NivelEducativoSection";
import { InfoGeneralSection } from "./metadata/InfoGeneralSection";
import { ObjetivosSection } from "./metadata/ObjetivosSection";
import { PlanificacionTemporalSection } from "./metadata/PlanificacionTemporalSection";
import { AportesTable, aporteFeedbackKey } from "./metadata/AportesTable";
import { DuaSection } from "./metadata/DuaSection";

const MSG_REQUERIDOS = "Completa los campos requeridos antes de continuar.";
const MSG_INVALIDOS  = "Corrige los campos marcados antes de guardar.";

interface Props {
  planId: string;
  initialMetadata: PlanMetadata | null;
  isFinalized: boolean;
  onSave: (data: SaveMetadataInput) => Promise<ActionResult>;
  onClearFeedback?: (planId: string, keys: string[]) => Promise<void>;
  proceedPath?: string;
  coordinatorFeedback?: SectionStates;
  defaultNivelSub?: string;
  defaultNivelGrado?: string;
}

export function MetadataForm({ planId, initialMetadata, isFinalized, onSave, onClearFeedback, proceedPath, coordinatorFeedback, defaultNivelSub = "", defaultNivelGrado = "" }: Props) {
  const router = useRouter();
  const idPrefix = useId();
  const [form, setForm]     = useState<PlanMetadata>(() => mergeWithEmpty(initialMetadata));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [errors, setErrors]     = useState<MetadataErrors>({});
  // Mensaje resumen bajo el formulario cuando hay errores de validación
  const [errorSummary, setErrorSummary] = useState("");
  const [isPending, startTransition] = useTransition();

  // Copia local de la retroalimentación del coordinador: se limpia por sección al editar ese campo
  const [localFeedback, setLocalFeedback] = useState<SectionStates>(() => ({ ...(coordinatorFeedback ?? {}) }));
  // Claves limpiadas en esta sesión, para persistir la limpieza al guardar
  const clearedKeysRef = useRef<Set<string>>(new Set());

  const clearFeedback = useCallback((key: FeedbackKey) => {
    setLocalFeedback((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev } as SectionStates;
      delete next[key];
      return next;
    });
    clearedKeysRef.current.add(String(key));
  }, []);

  const dirty = () => {
    setStatus("idle");
    setErrorMsg("");
  };

  const update: UpdateField = (key, value, feedbackKey) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearFeedback(feedbackKey);
    dirty();
  };

  const setAporte = (i: number, field: keyof AporteMultimodal, value: string) => {
    setForm((prev) => {
      const aportes = [...prev.aportes];
      aportes[i] = { ...aportes[i], [field]: value };
      return { ...prev, aportes };
    });
    clearFeedback(aporteFeedbackKey(field));
    dirty();
  };

  const persistClearedFeedback = async () => {
    const keys = Array.from(clearedKeysRef.current);
    if (onClearFeedback && keys.length > 0) {
      await onClearFeedback(planId, keys);
      clearedKeysRef.current.clear();
    }
  };

  /**
   * Valida y guarda. Solo bloquea lo que el servidor rechazaría, salvo al
   * continuar, que además exige los campos obligatorios.
   */
  const save = (proceed: boolean) => {
    const payload = buildPayload(planId, form);
    // Si ya se mostraron los obligatorios, se siguen mostrando actualizados
    const showRequired = proceed || Object.keys(errors).length > 0;
    const { errors: errs, blocksSave } = validateMetadata(payload, form, showRequired);
    const blocked = blocksSave || (proceed && Object.keys(errs).length > 0);

    setErrors(errs);
    setErrorSummary(blocksSave ? MSG_INVALIDOS : Object.keys(errs).length > 0 ? MSG_REQUERIDOS : "");
    if (blocked) return;

    setStatus("saving");
    startTransition(async () => {
      const result = await onSave(payload);
      if (result.success) {
        setStatus("saved");
        await persistClearedFeedback();
        if (proceed && proceedPath) router.push(proceedPath);
      } else {
        setStatus("error");
        setErrorMsg(result.error ?? "Error desconocido");
      }
    });
  };

  const disabled = isFinalized || isPending;
  const required = !!proceedPath;
  const sectionProps = { form, update, errors, feedback: localFeedback, disabled, required, idPrefix };

  return (
    <div
      className="mb-6 overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(224,230,240,0.80)",
        borderRadius: "1rem",
        boxShadow: "0 2px 16px rgba(0,39,83,0.05), inset 0 1px 0 rgba(255,255,255,0.90)",
      }}
    >
      {/* Encabezado */}
      <div
        className="px-5 py-3.5"
        style={{
          background: "linear-gradient(135deg, rgba(0,39,83,0.06) 0%, rgba(42,74,138,0.04) 100%)",
          borderBottom: "1px solid rgba(0,39,83,0.07)",
        }}
      >
        <h2 className="text-sm font-bold" style={{ color: "#002753" }}>
          Datos de la Unidad Microcurricular
        </h2>
        {!isFinalized && proceedPath && (
          <p className="text-[11px] mt-0.5" style={{ color: "#5A6A82" }}>
            Los campos marcados con <span className="font-bold" style={{ color: "#c62828" }}>*</span> son obligatorios para continuar.
          </p>
        )}
      </div>

      {/* Cuerpo */}
      <div className="p-5 space-y-6">
        <NivelEducativoSection
          {...sectionProps}
          defaultNivelSub={defaultNivelSub}
          defaultNivelGrado={defaultNivelGrado}
        />
        <InfoGeneralSection {...sectionProps} />
        <ObjetivosSection {...sectionProps} />
        <PlanificacionTemporalSection {...sectionProps} />
        <AportesTable
          aportes={form.aportes}
          onChange={setAporte}
          feedback={localFeedback}
          disabled={disabled}
          error={errors.aportes}
          idPrefix={idPrefix}
        />
        <DuaSection {...sectionProps} />

        {/* Pie: estado y acciones */}
        {!isFinalized && (
          <div
            className="flex items-center justify-between pt-4"
            style={{ borderTop: "1px solid rgba(0,39,83,0.07)" }}
          >
            <div aria-live="polite">
              {status === "error" && (
                <p role="alert" className="text-xs" style={{ color: "#c62828" }}>{errorMsg}</p>
              )}
              {status === "saved" && !proceedPath && (
                <p className="text-xs" style={{ color: "#0d8a5e" }}>Datos guardados correctamente.</p>
              )}
              {errors.form && (
                <p role="alert" className="text-xs" style={{ color: "#c62828" }}>{errors.form}</p>
              )}
              {errorSummary && (
                <p role="alert" className="text-xs" style={{ color: "#c62828" }}>{errorSummary}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {proceedPath && (
                <button
                  type="button"
                  onClick={() => save(false)}
                  disabled={isPending}
                  className="text-xs font-medium transition-colors disabled:opacity-50 text-[#5A6A82] underline underline-offset-2"
                >
                  Solo guardar
                </button>
              )}
              <button
                type="button"
                onClick={() => save(!!proceedPath)}
                disabled={isPending}
                className={
                  "px-4 py-1.5 text-white text-xs font-semibold rounded-full disabled:opacity-50 transition-all duration-150 cursor-pointer " +
                  "bg-[linear-gradient(135deg,#002753_0%,#003d7a_100%)] shadow-[0_2px_8px_rgba(0,39,83,0.25),inset_0_1px_0_rgba(255,255,255,0.12)] " +
                  "hover:bg-[linear-gradient(135deg,#001a3d_0%,#002753_100%)] hover:shadow-[0_3px_12px_rgba(0,39,83,0.30),inset_0_1px_0_rgba(255,255,255,0.12)]"
                }
              >
                {isPending
                  ? "Guardando..."
                  : proceedPath
                  ? "Guardar y Continuar →"
                  : "Guardar datos de la unidad"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
