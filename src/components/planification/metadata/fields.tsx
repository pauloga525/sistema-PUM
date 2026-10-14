"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ── Estilos de campo ──────────────────────────────────────────────────────────

/** Estilo base de los inputs; el foco se resuelve con `focus:` (sin estado). */
const INPUT_BASE =
  "w-full rounded-[0.625rem] border border-[rgba(0,39,83,0.14)] bg-[rgba(244,246,250,0.80)] px-[0.625rem] py-[0.375rem] " +
  "text-[0.75rem] text-[#0D1B2E] outline-none transition-[border-color,box-shadow] duration-150 " +
  "focus:border-[rgba(0,39,83,0.40)] focus:shadow-[0_0_0_3px_rgba(0,39,83,0.07)] " +
  "disabled:cursor-not-allowed disabled:bg-[rgba(244,246,250,0.50)] disabled:text-[#8899AA]";

/** Borde de error; el foco lo sigue sobrescribiendo, como antes. */
const INPUT_ERROR = "border-[rgba(198,40,40,0.50)]";

export function inputClass({ error, className }: { error?: boolean; className?: string } = {}) {
  return cn(INPUT_BASE, error && INPUT_ERROR, className);
}

/** ids de ayuda/error a enlazar con `aria-describedby` (undefined si no hay ninguno). */
export function describedBy(...ids: (string | false | undefined)[]) {
  const list = ids.filter(Boolean).join(" ");
  return list || undefined;
}

// ── Piezas ────────────────────────────────────────────────────────────────────

export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <div className="mb-3 border-l-[3px] border-[rgba(0,39,83,0.20)] pl-[0.625rem]">
      <h3 id={id} className="text-[11px] font-bold uppercase tracking-wider text-[#5A6A82]">
        {children}
      </h3>
    </div>
  );
}

function RequiredMark() {
  return <span className="ml-0.5 text-[#c62828]" aria-hidden="true">*</span>;
}

export function FieldLabel({
  children,
  htmlFor,
  id,
  required,
}: {
  children: ReactNode;
  /** Campo al que se asocia el label. Sin él, se renderiza como texto (p. ej. para un grupo). */
  htmlFor?: string;
  id?: string;
  required?: boolean;
}) {
  const className = "block text-[11px] font-semibold mb-1 text-[#5A6A82]";
  const content = (
    <>
      {children}
      {required && <RequiredMark />}
    </>
  );
  return htmlFor
    ? <label htmlFor={htmlFor} id={id} className={className}>{content}</label>
    : <span id={id} className={className}>{content}</span>;
}

export function FieldError({ id, children, className = "mt-0.5" }: { id: string; children?: string; className?: string }) {
  if (!children) return null;
  return <p id={id} className={cn("text-[11px] text-[#c62828]", className)}>{children}</p>;
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder = "",
  disabled = false,
  error,
  maxLength,
  required,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  maxLength?: number;
  required?: boolean;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(!!error && errorId)}
        className={inputClass({ error: !!error })}
      />
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

/** Lista editable de textos (objetivos, criterios). */
export function StringListEditor({
  id,
  label,
  itemLabel,
  items,
  onChange,
  placeholder,
  disabled,
  required,
  error,
}: {
  id: string;
  label: string;
  /** Nombre de cada ítem para lectores de pantalla ("Objetivo", "Criterio"). */
  itemLabel: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}) {
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const add    = () => onChange([...items, ""]);
  const remove = (i: number) =>
    onChange(items.length > 1 ? items.filter((_, idx) => idx !== i) : [""]);
  const update = (i: number, v: string) =>
    onChange(items.map((x, idx) => (idx === i ? v : x)));

  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={describedBy(!!error && errorId)}>
      <FieldLabel htmlFor={`${id}-0`} id={labelId} required={required}>{label}</FieldLabel>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <input
              id={`${id}-${i}`}
              type="text"
              value={item}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              aria-label={i === 0 ? undefined : `${itemLabel} ${i + 1}`}
              aria-required={(required && i === 0) || undefined}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy(!!error && errorId)}
              className={inputClass({ error: !!error, className: "flex-1" })}
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold transition-colors bg-transparent text-[#B8C4D6] hover:text-[#c62828] focus-visible:text-[#c62828] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(0,39,83,0.40)]"
                title="Eliminar"
                aria-label={`Eliminar ${itemLabel.toLowerCase()} ${i + 1}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <FieldError id={errorId} className="mt-1">{error}</FieldError>
      {!disabled && (
        <button
          type="button"
          onClick={add}
          aria-label={`Agregar ${itemLabel.toLowerCase()}`}
          className="mt-1.5 text-[11px] font-semibold transition-colors text-[#002753] hover:underline focus-visible:underline"
        >
          + Agregar
        </button>
      )}
    </div>
  );
}
