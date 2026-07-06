import fs from "fs";
import path from "path";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { hasMinRole } from "@/constants/levels";
import { appConfig } from "@/config/app.config";
import { AdminNav } from "@/components/admin/AdminNav";
import { ToastProvider } from "@/components/ui/Toast";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — PUM Web",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || !hasMinRole(session.user.role, "ADMIN")) redirect("/login");

  const publicDir = path.join(process.cwd(), "public");
  const hasLogo      = fs.existsSync(path.join(publicDir, "logos", "logo-left.png"));
  const hasLogoRight = fs.existsSync(path.join(publicDir, "logos", "logo-header-right.png"));

  const initial = session.user?.name?.[0]?.toUpperCase() ?? "A";
  const year    = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-pum-bg flex flex-col">

      {/* ── TopBar ─────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 flex-shrink-0 flex items-center justify-between px-6"
        style={{
          height: "var(--pum-topbar-height)",
          background: "linear-gradient(135deg, #002753 0%, #003d7a 100%)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.08), 0 4px 24px rgba(0,39,83,0.30)",
        }}
      >
        {/* Lado izquierdo: logos + nombre */}
        <div className="flex items-center gap-3">
          {(hasLogo || hasLogoRight) ? (
            <div className="flex items-center gap-2">
              {hasLogo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/logos/logo-left.png"
                  alt={appConfig.institutionName}
                  className="h-18 w-auto object-contain"
                />
              )}
              {hasLogoRight && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/logos/logo-header-right.png"
                  alt="Logo secundario"
                  className="h-24 w-auto object-contain"
                />
              )}
            </div>
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm select-none flex-shrink-0"
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.25)",
              }}
              aria-hidden="true"
            >
              P
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-white font-semibold text-sm leading-tight">
              {appConfig.institutionName}
            </p>
            <p className="text-blue-200/60 text-[11px] leading-none mt-0.5">
              Panel Administrativo
            </p>
          </div>
        </div>

        {/* Lado derecho: badge ADMIN + usuario + logout */}
        <div className="flex items-center gap-3">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide select-none"
            style={{ background: "#fccc38", color: "#6f5600" }}
          >
            ADMIN
          </span>

          <div className="text-right hidden sm:block">
            <p className="text-white text-sm font-medium leading-tight">
              {session.user?.name ?? "Administrador"}
            </p>
            <p className="text-blue-200/55 text-[11px] leading-none mt-0.5">
              {session.user?.email}
            </p>
          </div>

          {session.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt={session.user.name ?? "Avatar"}
              className="w-8 h-8 rounded-full flex-shrink-0"
              style={{ border: "2px solid rgba(255,255,255,0.30)" }}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-semibold select-none flex-shrink-0"
              style={{
                background: "rgba(255,255,255,0.18)",
                border: "1.5px solid rgba(255,255,255,0.28)",
              }}
            >
              {initial}
            </div>
          )}

          <form
            action={async () => {
              "use server";
              try { await signOut({ redirectTo: "/login" }); }
              catch (e) { if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) redirect("/login"); }
            }}
          >
            <button
              type="submit"
              title="Cerrar sesión"
              className="pum-topbar-btn flex items-center gap-1.5 text-[12px] font-medium text-blue-100/70 hover:text-white px-2.5 py-1.5 rounded-lg cursor-pointer"
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
      <AdminNav />

      {/* ── Contenido principal ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="flex-shrink-0 border-t border-pum-border/60 px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded flex items-center justify-center text-white text-[8px] font-bold select-none flex-shrink-0"
            style={{ background: "#002753" }}
            aria-hidden="true"
          >
            P
          </div>
          <span className="text-xs text-pum-text-disabled italic">
            #SomosElTécnicoDelFuturo
          </span>
        </div>
        <span className="text-xs text-pum-text-disabled">
          Sistema PUM Web &nbsp;·&nbsp; © Departamento de Sistemas UETS {year}
        </span>
      </footer>
    </div>
  );
}
