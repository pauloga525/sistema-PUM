"use client";

import { useState } from "react";

interface ExportMenuProps {
  planId: string;
  /** Muestra el botón de imprimir (solo en preview page) */
  showPrint?: boolean;
}

// ── Icon helpers ──────────────────────────────────────────────────────────────

function IconDoc() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function IconPrint() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

// ── Button styles ─────────────────────────────────────────────────────────────

const BASE_BTN =
  "inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 cursor-pointer disabled:opacity-50";

const NAVY_BTN: React.CSSProperties = {
  background: "rgba(255,255,255,0.82)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  border: "1px solid rgba(0,39,83,0.20)",
  color: "#002753",
  boxShadow: "0 1px 4px rgba(0,39,83,0.06), inset 0 1px 0 rgba(255,255,255,0.90)",
};

const NAVY_BTN_HOVER: React.CSSProperties = {
  background: "#dce8ff",
  border: "1px solid rgba(0,39,83,0.30)",
  boxShadow: "0 2px 8px rgba(0,39,83,0.10), inset 0 1px 0 rgba(255,255,255,0.90)",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function ExportMenu({ planId, showPrint = false }: ExportMenuProps) {
  const [downloading, setDownloading] = useState<"docx" | "pdf" | null>(null);
  const [isPrinting, setIsPrinting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [hover, setHover]             = useState<string | null>(null);

  const handleDownload = async (format: "docx" | "pdf") => {
    setError(null);
    setDownloading(format);
    try {
      const res = await fetch(`/api/export/${planId}?format=${format}`);
      if (!res.ok) throw new Error((await res.text()) || "Error al generar el documento");
      const blob   = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a      = document.createElement("a");
      a.href       = objUrl;
      const cd        = res.headers.get("Content-Disposition") ?? "";
      const nameMatch = cd.match(/filename\*=UTF-8''(.+)/i) ?? cd.match(/filename="?([^"]+)"?/i);
      a.download      = nameMatch ? decodeURIComponent(nameMatch[1]) : `planificacion.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al descargar");
    } finally {
      setDownloading(null);
    }
  };

  const handlePrint = async () => {
    setError(null);
    setIsPrinting(true);
    try {
      const res = await fetch(`/api/export/${planId}?format=pdf`);
      if (!res.ok) throw new Error((await res.text()) || "Error al generar el PDF");
      const blob   = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const win    = window.open(objUrl, "_blank");
      if (!win) {
        const a   = document.createElement("a");
        a.href    = objUrl;
        a.download = "planificacion.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al imprimir");
    } finally {
      setIsPrinting(false);
    }
  };

  const isBusy = downloading !== null || isPrinting;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2 print:hidden">

        {/* Word */}
        <button
          onClick={() => handleDownload("docx")}
          disabled={isBusy}
          className={BASE_BTN}
          style={hover === "docx" ? { ...NAVY_BTN, ...NAVY_BTN_HOVER } : NAVY_BTN}
          onMouseEnter={() => setHover("docx")}
          onMouseLeave={() => setHover(null)}
        >
          <IconDoc />
          {downloading === "docx" ? "Generando..." : "Word"}
        </button>

        {/* PDF */}
        <button
          onClick={() => handleDownload("pdf")}
          disabled={isBusy}
          className={BASE_BTN}
          style={hover === "pdf" ? { ...NAVY_BTN, ...NAVY_BTN_HOVER } : NAVY_BTN}
          onMouseEnter={() => setHover("pdf")}
          onMouseLeave={() => setHover(null)}
        >
          <IconDoc />
          {downloading === "pdf" ? "Generando..." : "PDF"}
        </button>

        {/* Imprimir */}
        {showPrint && (
          <button
            onClick={handlePrint}
            disabled={isBusy}
            className={BASE_BTN}
            style={hover === "print" ? { ...NAVY_BTN, ...NAVY_BTN_HOVER } : NAVY_BTN}
            onMouseEnter={() => setHover("print")}
            onMouseLeave={() => setHover(null)}
          >
            <IconPrint />
            {isPrinting ? "Generando..." : "Imprimir PDF"}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs print:hidden" style={{ color: "#c62828" }}>{error}</p>
      )}
    </div>
  );
}
