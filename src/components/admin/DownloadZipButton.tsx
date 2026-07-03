"use client";

import { useState } from "react";

interface Props {
  href: string;
  count: number;
  disabled?: boolean;
}

export function DownloadZipButton({ href, count, disabled }: Props) {
  const [loading, setLoading] = useState(false);

  if (disabled || count === 0) {
    return (
      <span className="text-sm text-pum-text-disabled italic">
        Sin planificaciones finalizadas para exportar
      </span>
    );
  }

  const handleClick = () => {
    if (loading) return;
    setLoading(true);
    // El navegador descarga en background; reseteamos tras 90s como máximo
    setTimeout(() => setLoading(false), 90_000);
  };

  return (
    <a
      href={href}
      download
      onClick={handleClick}
      className="pum-navy-btn inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-xl cursor-pointer"
      aria-disabled={loading}
    >
      {loading ? (
        <>
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="animate-spin" aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Generando ZIP…
        </>
      ) : (
        <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Descargar ZIP — {count} {count === 1 ? "archivo" : "archivos"}
        </>
      )}
    </a>
  );
}
