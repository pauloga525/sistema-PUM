/**
 * Layout del grupo de rutas de autenticación.
 *
 * Aplica un fondo centrado para todas las páginas bajo (auth)/.
 * Actualmente solo existe /login, pero el layout está preparado
 * para futuras páginas de auth (error dedicado, etc.).
 *
 * El grupo (auth) usa paréntesis — esto significa que Next.js NO incluye
 * "(auth)" en la URL final. La ruta es /login, no /(auth)/login.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar Sesión — PUM Web",
  description: "Acceso institucional al sistema de planificaciones PUM",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,39,83,0.12) 0%, transparent 70%), linear-gradient(180deg, #f3f4f5 0%, #f8f9fa 100%)",
      }}
    >
      {children}
    </div>
  );
}
