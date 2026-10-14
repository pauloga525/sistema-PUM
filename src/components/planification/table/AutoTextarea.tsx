"use client";

import { useEffect, useRef } from "react";

/** Textarea que crece con su contenido. */
export function AutoTextarea({
  value, onChange, disabled, placeholder, className, ariaLabel,
}: {
  value: string; onChange: (v: string) => void;
  disabled?: boolean; placeholder?: string; className?: string;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={ariaLabel}
      rows={2}
      className={`w-full resize-none overflow-hidden bg-transparent text-sm text-pum-text placeholder-pum-text-disabled outline-none leading-relaxed ${className ?? ""}`}
      style={{ minHeight: "2.5rem" }}
    />
  );
}
