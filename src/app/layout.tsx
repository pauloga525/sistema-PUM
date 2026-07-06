/**
 * Layout raíz de PUM Web.
 *
 * Define la estructura HTML base que envuelve TODAS las páginas.
 * Carga la fuente Inter (design token --pum-font-sans) y los
 * estilos globales (que incluyen los design tokens).
 *
 * Nota sobre fuentes:
 *   Se usa Inter de Google Fonts (via next/font) en lugar de Geist,
 *   alineando con los tokens del design system institucional.
 *   next/font descarga y sirve la fuente localmente — sin peticiones
 *   externas en runtime, mejorando privacidad y performance.
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  // Variable CSS que Tailwind y los design tokens usan via --pum-font-sans
  variable: "--pum-font-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    // Template para sub-páginas: "Página — PUM Web"
    template: "%s — PUM Web",
    default: "PUM Web",
  },
  description: "Sistema institucional de Planificaciones Unitarias de Módulo",
  // Prevenir que motores de búsqueda indexen este sistema institucional privado
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased bg-pum-bg text-pum-text font-sans">
        {/* Oculta el indicador de desarrollo de Next.js para todos los roles.
            El layout de superadmin lo reactiva con display:block !important */}
        <style>{`nextjs-portal { display: none !important; }`}</style>
        {children}
      </body>
    </html>
  );
}
