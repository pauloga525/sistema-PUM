"use client";

import { useEffect, useRef, useState, type TransitionStartFunction } from "react";
import type { ActionResult } from "@/types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveOptions {
  /** false: no programa guardados automáticos (p. ej. PUM finalizado). */
  enabled: boolean;
  /** Espera tras el último cambio antes de guardar solo. */
  delayMs?: number;
  /** Transición compartida con otras acciones del formulario (p. ej. finalizar). */
  isPending: boolean;
  startTransition: TransitionStartFunction;
  save: () => Promise<ActionResult>;
  /** Se ejecuta tras un guardado exitoso. */
  onSaved?: () => Promise<void>;
}

/**
 * Guardado manual + automático con debounce. `markDirty` reinicia el temporizador;
 * el temporizador siempre llama a la última versión de `saveNow` (sin closures obsoletos).
 */
export function useAutosave({
  enabled, delayMs = 30000, isPending, startTransition, save, onSaved,
}: UseAutosaveOptions) {
  const [status, setStatus]   = useState<SaveStatus>("idle");
  const [error, setError]     = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveNowRef = useRef<() => void>(() => {});

  const saveNow = () => {
    if (isPending) return; // ya hay un guardado en vuelo — ignorar
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatus("saving");
    setError(null);
    startTransition(async () => {
      const result = await save();
      if (result.success) {
        setStatus("saved");
        setIsDirty(false);
        await onSaved?.();
      } else {
        setStatus("error");
        setError(result.error);
      }
    });
  };

  useEffect(() => { saveNowRef.current = saveNow; });

  const markDirty = () => {
    setStatus("idle");
    setError(null);
    setIsDirty(true);
    if (enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        saveNowRef.current();
      }, delayMs);
    }
  };

  return { status, error, isDirty, saveNow, markDirty };
}
