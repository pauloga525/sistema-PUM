"use client";

import { useState } from "react";

// Debe coincidir con TEMP_PASSWORD_TTL_DAYS (src/modules/security/temp-password.ts,
// que no se importa aquí porque usa node:crypto y este es un componente cliente)
const TTL_DAYS = 7;

interface TempPasswordNoticeProps {
  password: string;
  /** Texto introductorio, ej. "Docente creado correctamente." */
  title?:   string;
}

/**
 * Muestra UNA sola vez la contraseña temporal generada para que el administrador
 * la entregue al usuario. No se guarda en ningún lado: al cerrar el aviso se pierde.
 */
export function TempPasswordNotice({ password, title }: TempPasswordNoticeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el admin puede seleccionar el texto manualmente
    }
  };

  return (
    <div
      className="rounded-xl px-4 py-3 flex flex-col gap-2"
      style={{ background: "#f0fdf4", border: "1px solid rgba(22,101,52,0.2)", color: "#166534" }}
      role="status"
    >
      {title && <p className="text-sm font-semibold">{title}</p>}
      <p className="text-xs">Contraseña temporal (se muestra solo esta vez):</p>
      <div className="flex items-center gap-2">
        <code
          className="flex-1 text-base font-semibold tracking-wider rounded-lg px-3 py-2 select-all"
          style={{ background: "white", border: "1px solid rgba(22,101,52,0.25)", color: "#191c1d", fontFamily: "monospace" }}
        >
          {password}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer"
          style={{ background: "#166534", color: "white" }}
        >
          {copied ? "Copiada" : "Copiar"}
        </button>
      </div>
      <p className="text-[11px] leading-snug">
        Entrégala al usuario por un canal seguro. Vence en {TTL_DAYS} días y deberá cambiarla
        al iniciar sesión por primera vez.
      </p>
    </div>
  );
}
