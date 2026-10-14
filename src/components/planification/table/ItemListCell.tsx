"use client";

import type { SubItem } from "./types";
import { AutoTextarea } from "./AutoTextarea";

/** Lista de textos simples (indicadores, evaluaciones). */
export function ItemListCell({
  items, disabled, placeholder, itemLabel, onAdd, onRemove, onUpdate,
}: {
  items: SubItem[];
  disabled?: boolean;
  placeholder?: string;
  /** Nombre accesible de cada ítem; se le añade el número. */
  itemLabel: string;
  onAdd: () => void;
  onRemove: (localId: string) => void;
  onUpdate: (localId: string, value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {items.map((item, idx) => (
        <div key={item.localId} className="flex gap-1 items-start">
          <AutoTextarea
            value={item.text}
            onChange={(v) => onUpdate(item.localId, v)}
            disabled={disabled}
            placeholder={placeholder}
            ariaLabel={`${itemLabel} ${idx + 1}`}
            className="flex-1"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onRemove(item.localId)}
              title="Eliminar ítem"
              aria-label={`Eliminar ${itemLabel.toLowerCase()} ${idx + 1}`}
              className="text-pum-text-disabled hover:text-pum-error mt-1 leading-none text-base cursor-pointer shrink-0 transition-colors"
            >
              ×
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={onAdd}
          className="text-[0.7rem] text-pum-primary hover:underline underline-offset-2 text-left cursor-pointer self-start mt-0.5 transition-colors"
        >
          + agregar
        </button>
      )}
    </div>
  );
}
