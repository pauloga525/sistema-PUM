"use client";

import type { EjeTransversalId } from "@/modules/planification/planification.types";
import type { LocalDcdItem } from "./types";
import { AutoTextarea } from "./AutoTextarea";
import { EjeTransversalSelector } from "./EjeTransversalSelector";

/** Columna "¿Qué van a aprender?": destrezas con sus ejes transversales. */
export function DcdCell({
  items, disabled, itemLabel, onAdd, onRemove, onUpdateText, onUpdateEjes,
}: {
  items: LocalDcdItem[];
  disabled?: boolean;
  /** Nombre accesible de cada destreza; se le añade el número. */
  itemLabel: string;
  onAdd: () => void;
  onRemove: (localId: string) => void;
  onUpdateText: (localId: string, value: string) => void;
  onUpdateEjes: (localId: string, ejes: EjeTransversalId[]) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((dcdItem, dIdx) => (
        <div key={dcdItem.localId} className="flex flex-col gap-1">
          <div className="flex gap-1 items-start">
            <AutoTextarea
              value={dcdItem.text}
              onChange={(v) => onUpdateText(dcdItem.localId, v)}
              disabled={disabled}
              placeholder="Destreza con Criterio de Desempeño..."
              ariaLabel={`${itemLabel} ${dIdx + 1}`}
              className="flex-1"
            />
            {!disabled && items.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(dcdItem.localId)}
                title="Eliminar destreza"
                aria-label={`Eliminar ${itemLabel.toLowerCase()} ${dIdx + 1}`}
                className="text-pum-text-disabled hover:text-pum-error mt-1 leading-none text-base cursor-pointer shrink-0 transition-colors"
              >
                ×
              </button>
            )}
          </div>
          <EjeTransversalSelector
            value={dcdItem.ejes}
            onChange={(ejes) => onUpdateEjes(dcdItem.localId, ejes)}
            disabled={disabled}
            hasError={false}
          />
          {dIdx < items.length - 1 && (
            <div className="border-t border-pum-border mt-1" />
          )}
        </div>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={onAdd}
          className="text-[0.7rem] text-pum-primary hover:underline underline-offset-2 text-left cursor-pointer self-start transition-colors"
        >
          + agregar destreza
        </button>
      )}
    </div>
  );
}
