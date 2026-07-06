import fs from "fs";
import path from "path";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { appConfig } from "@/config/app.config";

const AUTH_ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  CredentialsSignin: {
    title: "Credenciales incorrectas",
    description: "El email o la contraseña no son correctos. Intenta nuevamente.",
  },
  Default: {
    title: "Error de autenticación",
    description: "Ocurrió un error inesperado. Si el problema persiste, contacta al administrador.",
  },
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorCode = params.error;
  const callbackUrl = params.callbackUrl ?? "/";

  const errorInfo = errorCode
    ? (AUTH_ERROR_MESSAGES[errorCode] ?? AUTH_ERROR_MESSAGES.Default)
    : null;

  const publicDir = path.join(process.cwd(), "public");
  const hasLogoLeft  = fs.existsSync(path.join(publicDir, "logos", "logo-left.png"));
  const hasLogoRight = fs.existsSync(path.join(publicDir, "logos", "logo-right.png"));

  return (
    <main className="w-full max-w-[380px] flex flex-col items-center gap-5">

      {/* ── Tarjeta de vidrio ─────────────────────────────────────────────── */}
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

        {/* ── Encabezado con logo ── */}
        <header className="flex flex-col items-center gap-3 text-center">
          {/* Logos institucionales */}
          {(hasLogoLeft || hasLogoRight) ? (
            <div className="flex items-center justify-center gap-4 mb-1">
              {hasLogoLeft && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/logos/logo-left.png"
                  alt={appConfig.institutionName}
                  className="h-24 w-auto object-contain"
                />
              )}
              {hasLogoRight && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/logos/logo-right.png"
                  alt="Escudo"
                  className="h-24 w-auto object-contain"
                />
              )}
            </div>
          ) : (
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold select-none mb-1"
              style={{
                background: "linear-gradient(135deg, #002753 0%, #003d7a 100%)",
                boxShadow: "0 4px 16px rgba(0,39,83,0.30), inset 0 1px 0 rgba(255,255,255,0.20)",
              }}
              aria-hidden="true"
            >
              P
            </div>
          )}

          <div>
            <h1 className="text-xl font-bold text-pum-text leading-tight">
              Sistema PUM
            </h1>
            <p className="text-sm text-pum-text-muted mt-0.5">
              {appConfig.institutionName}
            </p>
          </div>
        </header>

        {/* Separador sutil */}
        <div
          className="w-full h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(0,39,83,0.10), transparent)" }}
        />

        {/* ── Error ── */}
        {errorInfo && (
          <div
            role="alert"
            className="w-full rounded-xl px-4 py-3 flex gap-2 items-start"
            style={{ background: "#fdecea", border: "1px solid rgba(198,40,40,0.20)" }}
          >
            <span className="text-pum-error mt-0.5 flex-shrink-0 text-sm" aria-hidden="true">⚠</span>
            <div>
              <p className="text-sm font-semibold text-pum-error">{errorInfo.title}</p>
              <p className="text-xs text-pum-error/80 mt-0.5">{errorInfo.description}</p>
            </div>
          </div>
        )}

        {/* ── Formulario ── */}
        <form
          action={async (formData: FormData) => {
            "use server";
            const email = formData.get("email") as string;
            const password = formData.get("password") as string;

            try {
              await signIn("credentials", { email, password, redirectTo: callbackUrl });
            } catch (error) {
              if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) {
                // Auth.js autenticó correctamente: usamos redirect() relativo para que
                // el navegador quede en el dominio actual (Cloudflare) y no en la IP interna.
                // La cookie de sesión ya fue escrita por Auth.js antes del throw.
                redirect(callbackUrl);
              }
              redirect(`/login?error=CredentialsSignin`);
            }
          }}
          className="w-full flex flex-col gap-4"
        >
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-pum-text-muted uppercase tracking-wide">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="docente@institucion.edu"
              className="pum-glass-input w-full px-3.5 py-2.5 text-sm text-pum-text placeholder:text-pum-text-disabled"
            />
          </div>

          {/* Contraseña */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-pum-text-muted uppercase tracking-wide">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="pum-glass-input w-full px-3.5 py-2.5 text-sm text-pum-text placeholder:text-pum-text-disabled"
            />
          </div>

          {/* Botón de ingreso */}
          <button
            type="submit"
            className="pum-navy-btn w-full py-2.5 text-white text-sm font-semibold rounded-xl cursor-pointer mt-1"
          >
            Ingresar
          </button>
        </form>

        {/* Primera vez hint */}
        <p className="text-xs text-pum-text-muted text-center leading-relaxed">
          <span className="font-medium text-pum-text">¿Primer acceso?</span>{" "}
          Tu contraseña inicial es tu número de cédula.
        </p>

        {/* Nota de desarrollo */}
        <p className="text-[11px] text-pum-text-disabled text-center leading-relaxed">
          Modo desarrollo · Credenciales de prueba habilitadas
        </p>
      </div>

      {/* ── Footer externo ── */}
      <footer className="text-center">
        <p className="text-xs text-pum-text-disabled">
          Sistema PUM Web &nbsp;·&nbsp; Uso exclusivo institucional
        </p>
      </footer>
    </main>
  );
}
