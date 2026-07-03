"use client";

import { useRef, useState, useEffect } from "react";

interface YearOption {
  id: string;
  label: string;
  active: boolean;
}

interface Props {
  years: YearOption[];
}

export function ExcelDownloadButton({ years }: Props) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState<string | null>(null); // yearId being downloaded
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleDownload = (yearId: string) => {
    if (loading) return;
    setLoading(yearId);
    setOpen(false);
    // Trigger download via hidden anchor
    const a = document.createElement("a");
    a.href     = `/api/export/excel?yearId=${yearId}`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setLoading(null), 30_000);
  };

  const isLoading = loading !== null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => !isLoading && setOpen((v) => !v)}
        className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        style={{
          background: isLoading
            ? "rgba(21,128,61,0.7)"
            : open
            ? "linear-gradient(135deg, #14532d 0%, #166534 100%)"
            : "linear-gradient(135deg, #166534 0%, #15803d 100%)",
          color: "#ffffff",
          boxShadow: "0 2px 8px rgba(22,101,52,0.25)",
          cursor: isLoading ? "default" : "pointer",
          border: "none",
        }}
      >
        {isLoading ? (
          <>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="animate-spin"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Generando…
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <polyline points="8 13 12 17 16 13" />
              <line x1="12" y1="17" x2="12" y2="9" />
            </svg>
            Exportar Excel
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div
          style={{
            position:     "absolute",
            top:          "calc(100% + 6px)",
            right:        0,
            minWidth:     200,
            background:   "rgba(255,255,255,0.97)",
            border:       "1px solid rgba(195,198,210,0.80)",
            borderRadius: 12,
            boxShadow:    "0 8px 24px rgba(0,39,83,0.12), 0 2px 6px rgba(0,39,83,0.07)",
            zIndex:       50,
            overflow:     "hidden",
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "#6b7280",
              padding: "10px 14px 6px",
              borderBottom: "1px solid rgba(0,39,83,0.06)",
            }}
          >
            Seleccionar año lectivo
          </p>

          {years.length === 0 && (
            <p style={{ fontSize: 13, color: "#6b7280", padding: "10px 14px" }}>
              No hay años disponibles
            </p>
          )}

          {years.map((y) => (
            <button
              key={y.id}
              type="button"
              onClick={() => handleDownload(y.id)}
              style={{
                display:     "flex",
                alignItems:  "center",
                gap:         8,
                width:       "100%",
                padding:     "9px 14px",
                background:  "transparent",
                border:      "none",
                textAlign:   "left",
                cursor:      "pointer",
                fontSize:    13,
                fontWeight:  y.active ? 600 : 400,
                color:       y.active ? "#002753" : "#374151",
                transition:  "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,39,83,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke={y.active ? "#166534" : "#9ca3af"}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <polyline points="8 13 12 17 16 13" />
                <line x1="12" y1="17" x2="12" y2="9" />
              </svg>
              {y.label}
              {y.active && (
                <span
                  style={{
                    marginLeft:   "auto",
                    fontSize:     10,
                    fontWeight:   600,
                    padding:      "1px 7px",
                    borderRadius: 99,
                    background:   "#dcfce7",
                    color:        "#166534",
                  }}
                >
                  Activo
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
