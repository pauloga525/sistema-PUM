"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { describedBy, FieldError, inputClass } from "./fields";

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DOW_ES    = ["L","M","X","J","V","S","D"];
const DOW_ES_LARGO = ["lunes","martes","miércoles","jueves","viernes","sábado","domingo"];

function parseDMY(s: string): Date | null {
  if (!s) return null;
  const parts = s.split("/").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [d, m, y] = parts;
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

function formatDMY(d: Date): string {
  const dd   = String(d.getDate()).padStart(2, "0");
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const NAV_BUTTON =
  "rounded-md bg-transparent px-2 py-0.5 text-[15px] leading-none text-[#002753] cursor-pointer hover:bg-[rgba(0,39,83,0.07)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(0,39,83,0.40)]";

/** Campo de fecha (DD/MM/AAAA) con calendario desplegable en un portal. */
export function DatePickerInput({
  id,
  value,
  onChange,
  disabled = false,
  error,
  required,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}) {
  const selectedDate = parseDMY(value);
  const [open, setOpen]         = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => selectedDate ?? new Date());
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const errorId    = `${id}-error`;
  const calendarId = `${id}-calendar`;

  // Cierra al hacer clic fuera del campo y del calendario
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (portalRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Al abrir, lleva el foco al día seleccionado (o a hoy / al primero del mes)
  useEffect(() => {
    if (!open) return;
    const root = portalRef.current;
    const target =
      root?.querySelector<HTMLButtonElement>("[aria-pressed='true']") ??
      root?.querySelector<HTMLButtonElement>("[aria-current='date']") ??
      root?.querySelector<HTMLButtonElement>("[data-day]");
    target?.focus();
  }, [open]);

  const openCalendar = () => {
    if (disabled) return;
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setDropPos({
        top:   rect.bottom + window.scrollY + 4,
        left:  rect.left   + window.scrollX,
        width: rect.width,
      });
    }
    setViewDate(selectedDate ?? new Date());
    setOpen(true);
  };

  const closeCalendar = () => {
    setOpen(false);
    inputRef.current?.focus();
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      openCalendar();
    } else if (e.key === "Escape" && open) {
      setOpen(false);
    }
  };

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDow    = (new Date(year, month, 1).getDay() + 6) % 7; // Lun=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayMs    = startOfDay(new Date());
  const selectedMs = selectedDate ? startOfDay(selectedDate) : null;

  const handleSelectDay = (day: number) => {
    onChange(formatDMY(new Date(year, month, day)));
    closeCalendar();
  };

  const calendar = open && dropPos && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={portalRef}
          id={calendarId}
          role="dialog"
          aria-label={`Calendario, ${MONTHS_ES[month]} ${year}`}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              closeCalendar();
            }
          }}
          style={{
            position:     "absolute",
            top:          dropPos.top,
            left:         dropPos.left,
            width:        Math.max(dropPos.width, 224),
            background:   "#ffffff",
            border:       "1px solid rgba(0,39,83,0.14)",
            borderRadius: 12,
            boxShadow:    "0 8px 28px rgba(0,39,83,0.13), 0 2px 6px rgba(0,39,83,0.07)",
            zIndex:       9999,
            padding:      "10px 10px 12px",
          }}
        >
          {/* Navegación por mes */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className={NAV_BUTTON}
            >‹</button>
            <span className="text-[12px] font-bold text-[#002753]" aria-live="polite">
              {MONTHS_ES[month]} {year}
            </span>
            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className={NAV_BUTTON}
            >›</button>
          </div>

          {/* Días de la semana */}
          <div className="mb-1 grid grid-cols-7 gap-0.5" aria-hidden="true">
            {DOW_ES.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-[#8899AA]">{d}</div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const thisMs     = new Date(year, month, day).getTime();
              const isSelected = thisMs === selectedMs;
              const isToday    = thisMs === todayMs;
              return (
                <button
                  key={i}
                  type="button"
                  data-day
                  onClick={() => handleSelectDay(day)}
                  aria-label={`${DOW_ES_LARGO[i % 7]} ${day} de ${MONTHS_ES[month].toLowerCase()} de ${year}`}
                  aria-pressed={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  className={cn(
                    "cursor-pointer rounded-md border py-1 text-center text-[11px] transition-colors duration-100",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(0,39,83,0.40)]",
                    isSelected
                      ? "border-transparent bg-[#002753] font-bold text-white"
                      : isToday
                      ? "border-[rgba(0,39,83,0.22)] bg-[rgba(0,39,83,0.07)] font-bold text-[#002753] hover:bg-[rgba(0,39,83,0.10)]"
                      : "border-transparent bg-transparent font-normal text-[#1a1c1e] hover:bg-[rgba(0,39,83,0.10)]",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div>
      <div ref={anchorRef} className="relative" onClick={openCalendar}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          readOnly
          value={value}
          placeholder="DD/MM/AAAA"
          disabled={disabled}
          onKeyDown={onInputKeyDown}
          role="combobox"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? calendarId : undefined}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(!!error && errorId)}
          className={inputClass({
            error: !!error,
            className: cn("select-none pr-7", disabled ? "cursor-not-allowed" : "cursor-pointer"),
          })}
        />
        {!disabled && (
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="#8899AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        )}
      </div>
      <FieldError id={errorId}>{error}</FieldError>
      {calendar}
    </div>
  );
}
