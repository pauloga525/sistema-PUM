import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { appConfig } from "@/config/app.config";
import { NAV_ITEMS, ROUTES } from "@/constants/routes";
import type { UserRole } from "@/constants/levels";
import { getLogos } from "@/lib/assets/logos";
import { ToastProvider } from "@/components/ui/Toast";
import { RoleNav } from "./RoleNav";

// ── Temas de color de la barra superior ──────────────────────────────────────

interface ShellTheme {
  headerBackground: string;
  headerShadow: string;
  /** Color de acento: ítem activo de la nav y marca del footer. */
  accent: string;
  subtitleClass: string;
  emailClass: string;
  buttonTextClass: string;
}

const BLUE: ShellTheme = {
  headerBackground: "linear-gradient(135deg, #002753 0%, #003d7a 100%)",
  headerShadow:     "0 1px 0 rgba(255,255,255,0.08), 0 4px 24px rgba(0,39,83,0.30)",
  accent:           "#002753",
  subtitleClass:    "text-blue-200/60",
  emailClass:       "text-blue-200/55",
  buttonTextClass:  "text-blue-100/70",
};

const PURPLE: ShellTheme = {
  headerBackground: "linear-gradient(135deg, #1e0a3c 0%, #4c1d95 100%)",
  headerShadow:     "0 1px 0 rgba(255,255,255,0.08), 0 4px 24px rgba(30,10,60,0.35)",
  accent:           "#4c1d95",
  subtitleClass:    "text-purple-200/60",
  emailClass:       "text-purple-200/55",
  buttonTextClass:  "text-purple-100/70",
};

// ── Configuración visual de cada rol ─────────────────────────────────────────

interface RoleShellConfig {
  theme: ShellTheme;
  subtitle: string;
  badge?: { label: string; background: string; color: string };
  nameFallback: string;
  initialFallback: string;
  /** Si es false se muestra siempre la inicial en lugar de la foto. */
  showAvatarImage: boolean;
  /** Dónde se dibuja la navegación del rol. */
  navPlacement: "topbar" | "bar";
}

const ROLE_SHELL: Record<UserRole, RoleShellConfig> = {
  TEACHER: {
    theme: BLUE,
    subtitle: "Sistema PUM",
    nameFallback: "Docente",
    initialFallback: "U",
    showAvatarImage: true,
    navPlacement: "topbar",
  },
  COORDINATOR: {
    theme: BLUE,
    subtitle: "Panel de Coordinación",
    badge: { label: "COORDINADOR", background: "#34d399", color: "#064e3b" },
    nameFallback: "Coordinador",
    initialFallback: "C",
    showAvatarImage: false,
    navPlacement: "bar",
  },
  ADMIN: {
    theme: BLUE,
    subtitle: "Panel Administrativo",
    badge: { label: "ADMIN", background: "#fccc38", color: "#6f5600" },
    nameFallback: "Administrador",
    initialFallback: "A",
    showAvatarImage: true,
    navPlacement: "bar",
  },
  SUPERADMIN: {
    theme: PURPLE,
    subtitle: "Panel de Sistema",
    badge: { label: "SUPERADMIN", background: "#a78bfa", color: "#1e0a3c" },
    nameFallback: "Super Administrador",
    initialFallback: "S",
    showAvatarImage: true,
    navPlacement: "bar",
  },
};

async function signOutAction() {
  "use server";
  try { await signOut({ redirectTo: ROUTES.LOGIN }); }
  catch (e) { if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) redirect(ROUTES.LOGIN); }
}

/**
 * Estructura común de los paneles por rol: barra superior (logos, navegación,
 * usuario, cerrar sesión), contenido con ToastProvider y footer.
 *  - `prepend`:   se inserta al inicio del contenedor (p. ej. estilos globales del rol).
 *  - `afterMain`: se inserta entre el contenido y el footer (p. ej. notificaciones).
 */
export function AppShell({
  role,
  user,
  prepend,
  afterMain,
  children,
}: {
  role: UserRole;
  user: { name?: string | null; email?: string | null; image?: string | null };
  prepend?: ReactNode;
  afterMain?: ReactNode;
  children: ReactNode;
}) {
  const config = ROLE_SHELL[role];
  const { theme } = config;
  const { left: hasLogo, headerRight: hasLogoRight } = getLogos();
  const initial = user.name?.[0]?.toUpperCase() ?? config.initialFallback;
  const year    = new Date().getFullYear();
  const navItems = NAV_ITEMS[role];

  return (
    <div className="min-h-screen bg-pum-bg flex flex-col">
      {prepend}

      {/* ── TopBar ─────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 flex-shrink-0 flex items-center justify-between px-6"
        style={{
          height: "var(--pum-topbar-height)",
          background: theme.headerBackground,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: theme.headerShadow,
        }}
      >
        {/* Lado izquierdo: logos + nombre */}
        <div className="flex items-center gap-3">
          {(hasLogo || hasLogoRight) ? (
            <div className="flex items-center gap-2">
              {hasLogo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/logos/logo-left.png" alt={appConfig.institutionName} className="h-18 w-auto object-contain" />
              )}
              {hasLogoRight && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/logos/logo-header-right.png" alt="Logo secundario" className="h-24 w-auto object-contain" />
              )}
            </div>
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm select-none flex-shrink-0"
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.25)",
                backdropFilter: "blur(4px)",
              }}
              aria-hidden="true"
            >
              P
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-white font-semibold text-sm leading-tight">{appConfig.institutionName}</p>
            <p className={`${theme.subtitleClass} text-[11px] leading-none mt-0.5`}>{config.subtitle}</p>
          </div>
        </div>

        {/* Lado derecho: navegación compacta / badge + usuario + logout */}
        <div className="flex items-center gap-3">
          {config.navPlacement === "topbar" && (
            <RoleNav items={navItems} variant="topbar" topbarTextClass={theme.buttonTextClass} />
          )}

          {config.badge && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide select-none"
              style={{ background: config.badge.background, color: config.badge.color }}
            >
              {config.badge.label}
            </span>
          )}

          <div className="text-right hidden sm:block">
            <p className="text-white text-sm font-medium leading-tight">{user.name ?? config.nameFallback}</p>
            <p className={`${theme.emailClass} text-[11px] leading-none mt-0.5`}>{user.email}</p>
          </div>

          {config.showAvatarImage && user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name ?? "Avatar"}
              className="w-8 h-8 rounded-full flex-shrink-0"
              style={{ border: "2px solid rgba(255,255,255,0.30)" }}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-semibold select-none flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.28)" }}
            >
              {initial}
            </div>
          )}

          <form action={signOutAction}>
            <button
              type="submit"
              title="Cerrar sesión"
              className={`pum-topbar-btn flex items-center gap-1.5 text-[12px] font-medium ${theme.buttonTextClass} hover:text-white px-2.5 py-1.5 rounded-lg cursor-pointer`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </form>
        </div>
      </header>

      {/* ── Nav horizontal ─────────────────────────────────────────────── */}
      {config.navPlacement === "bar" && (
        <RoleNav items={navItems} variant="bar" activeColor={theme.accent} />
      )}

      {/* ── Contenido principal ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </main>

      {afterMain}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="flex-shrink-0 border-t border-pum-border/60 px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded flex items-center justify-center text-white text-[8px] font-bold select-none flex-shrink-0"
            style={{ background: theme.accent }}
            aria-hidden="true"
          >
            P
          </div>
          <span className="text-xs text-pum-text-disabled italic">#SomosElTécnicoDelFuturo</span>
        </div>
        <span className="text-xs text-pum-text-disabled">
          Sistema PUM Web &nbsp;·&nbsp; © Departamento de Sistemas UETS {year}
        </span>
      </footer>
    </div>
  );
}
