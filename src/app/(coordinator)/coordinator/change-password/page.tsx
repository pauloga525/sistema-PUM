import { ChangePasswordForm } from "@/components/teacher/ChangePasswordForm";

export const metadata = { title: "Cambio de contraseña — PUM Web" };

export default function CoordinatorChangePasswordPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-[380px]">

        {/* ── Tarjeta de vidrio ── */}
        <div
          className="w-full flex flex-col gap-6 px-8 py-9"
          style={{
            background: "rgba(255,255,255,0.78)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.55)",
            borderRadius: "1.5rem",
            boxShadow: "0 8px 40px rgba(0,39,83,0.10), inset 0 1px 0 rgba(255,255,255,0.90)",
          }}
        >
          {/* Icono + título */}
          <header className="flex flex-col items-center gap-3 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: "#fff3cd",
                border: "1px solid rgba(102,77,3,0.15)",
                boxShadow: "0 2px 8px rgba(102,77,3,0.12)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#664d03" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-pum-text leading-tight">
                Cambio de contraseña
              </h1>
              <p className="text-sm text-pum-text-muted mt-1 leading-snug">
                Por seguridad, establece una nueva contraseña antes de continuar.
                No puede ser tu número de cédula.
              </p>
            </div>
          </header>

          {/* Separador */}
          <div
            className="w-full h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(0,39,83,0.10), transparent)" }}
          />

          {/* Formulario */}
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
