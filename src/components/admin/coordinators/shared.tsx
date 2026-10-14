// Estilos y piezas comunes de los diálogos de coordinadores

export const INPUT: React.CSSProperties = {
  background:   "rgba(243,244,245,0.90)",
  border:       "1px solid rgba(0,39,83,0.14)",
  borderRadius: "0.625rem",
  color:        "#191c1d",
  width:        "100%",
};

/** Botón ✕ en la esquina superior derecha de un `Dialog`. */
export function DialogCloseButton({ onClick, size = 16 }: { onClick: () => void; size?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Cerrar"
      className="absolute right-5 top-5 text-pum-text-disabled hover:text-pum-text cursor-pointer"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

/** Mensaje de error de un formulario. */
export function FormError({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="alert" className={`text-xs font-medium rounded-lg px-3 py-2 ${className}`} style={{ background: "#ffdad6", color: "#ba1a1a" }}>
      {children}
    </p>
  );
}
