"use client";

import type { PrincipioIcon } from "@/modules/planification/planification.types";
import { PRINCIPIO_COLORS } from "@/constants/planification";
import type { LocalMethodologyItem, OpenPicker, Principio } from "./types";
import { AutoTextarea } from "./AutoTextarea";
import { PrincipleBadge } from "./PrincipleBadge";

/** Lista de ítems con principios DUA (metodología, recursos). */
export function PrincipledItemsCell({
  items, disabled, openPicker, placeholder, itemLabel,
  onAdd, onRemove, onUpdateText,
  onTogglePicker, onUpdatePrinciple, onAddPrinciple,
}: {
  items: LocalMethodologyItem[];
  disabled?: boolean;
  openPicker: OpenPicker;
  placeholder?: string;
  /** Nombre accesible de cada ítem; se le añade el número. */
  itemLabel: string;
  onAdd: () => void;
  onRemove: (localId: string) => void;
  onUpdateText: (localId: string, value: string) => void;
  onTogglePicker: (itemLocalId: string, principio: Principio) => void;
  onUpdatePrinciple: (itemLocalId: string, principio: Principio, p: PrincipioIcon | null) => void;
  onAddPrinciple: (itemLocalId: string, principio: Principio) => void;
}) {
  return (
    <div className="flex flex-col divide-y divide-gray-200">
      {items.map((item, idx) => (
        <div key={item.localId} className="flex flex-col gap-1.5 py-2.5 first:pt-0">
          {/* Fila superior: badges + botones +Px + botón eliminar */}
          <div className="flex items-center gap-1 flex-wrap">
            {item.principles.map((p) => (
              <PrincipleBadge
                key={p.principio}
                principle={p}
                isOpen={openPicker?.itemId === item.localId && openPicker?.principio === p.principio}
                disabled={disabled}
                onToggle={() => onTogglePicker(item.localId, p.principio)}
                onUpdate={(updated) => onUpdatePrinciple(item.localId, p.principio, updated)}
              />
            ))}
            {!disabled && item.principles.length < 3 &&
              ([1, 2, 3] as const)
                .filter((p) => !item.principles.some((ip) => ip.principio === p))
                .map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onAddPrinciple(item.localId, p)}
                    title={`Agregar Principio ${p}`}
                    aria-label={`Agregar Principio ${p}`}
                    className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full text-white cursor-pointer hover:opacity-85 transition-opacity"
                    style={{ backgroundColor: PRINCIPIO_COLORS[p] }}
                  >
                    +P{p}
                  </button>
                ))}
            {!disabled && (
              <button
                type="button"
                onClick={() => onRemove(item.localId)}
                title="Eliminar ítem"
                aria-label={`Eliminar ${itemLabel.toLowerCase()} ${idx + 1}`}
                className="text-pum-text-disabled hover:text-pum-error ml-auto leading-none text-base cursor-pointer shrink-0 transition-colors"
              >
                ×
              </button>
            )}
          </div>
          {/* Área de texto debajo de los íconos */}
          <AutoTextarea
            value={item.text}
            onChange={(v) => onUpdateText(item.localId, v)}
            disabled={disabled}
            placeholder={placeholder ?? "Estrategia o actividad..."}
            ariaLabel={`${itemLabel} ${idx + 1}`}
            className="w-full"
          />
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
