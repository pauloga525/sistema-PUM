/**
 * Proxy de Next.js 16 — Protección de rutas de PUM Web.
 *
 * Se ejecuta en runtime de Node.js (desde Next.js 16 Proxy corre en Node.js
 * por defecto, ya no en Edge) ANTES de que cualquier página o API route
 * procese el request. Es la primera línea de defensa de autorización.
 * Al correr en Node.js puede leer Prisma directamente (ver chequeo de
 * modo mantenimiento más abajo).
 *
 * Rutas protegidas:
 *   /teacher/*     → requiere login
 *   /coordinator/* → requiere login
 *   /admin/*       → requiere login + rol ADMIN
 *   /plan-preview/* → requiere login + rol ADMIN
 *
 * Redirecciones especiales:
 *   forcePasswordChange=true → /teacher/change-password o /coordinator/change-password
 *   modo mantenimiento activo + rol TEACHER/COORDINATOR → /mantenimiento
 *   (ADMIN y SUPERADMIN nunca se ven afectados por el modo mantenimiento)
 *
 * Content-Security-Policy: se genera aquí con un nonce por petición (Next.js
 * lo aplica a sus propios scripts). El layout raíz fuerza el renderizado
 * dinámico para que todas las páginas reciban el nonce.
 *
 * Nota: En Next.js 16, "Middleware" fue renombrado a "Proxy".
 * El archivo se llamaba middleware.ts — ahora es proxy.ts.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getMaintenanceMode } from "@/modules/system/system-settings.service";

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    // 'unsafe-eval' solo en desarrollo (React lo usa para depuración)
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Estilos inline: la UI usa atributos style={...}, que los nonces no cubren
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join("; ");
}

/**
 * URL pública de la app. Con AUTH_URL definido se usa siempre ese origen; si
 * no, se reconstruye desde x-forwarded-host (Cloudflare Tunnel lo sobrescribe,
 * pero un acceso directo al origen podría falsificarlo).
 */
function publicBase(req: NextRequest): string {
  const configured = process.env.AUTH_URL;
  if (configured) {
    try { return new URL(configured).origin; } catch { /* valor inválido: usar cabeceras */ }
  }
  const fwdHost  = req.headers.get("x-forwarded-host");
  const fwdProto = req.headers.get("x-forwarded-proto");
  const rawHost  = req.headers.get("host") ?? "localhost:3000";
  const host     = fwdHost ?? rawHost;
  const proto    = fwdProto ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default auth(async (req: NextRequest & { auth: { user: { id: string; role: string; forcePasswordChange?: boolean; name?: string | null; email?: string | null; image?: string | null } } | null }) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;

  // req.url lleva la IP interna del servidor; la URL pública viene de AUTH_URL
  // o de las cabeceras de Cloudflare Tunnel.
  const base = publicBase(req);

  const isLoginPage                 = nextUrl.pathname === "/login";
  const isTeacherPath               = nextUrl.pathname.startsWith("/teacher");
  const isCoordinatorPath           = nextUrl.pathname.startsWith("/coordinator");
  const isAdminPath                 = nextUrl.pathname.startsWith("/admin");
  const isSuperAdminPath            = nextUrl.pathname.startsWith("/superadmin");
  const isPlanPreviewPath           = nextUrl.pathname.startsWith("/plan-preview");
  const isTeacherChangePassword     = nextUrl.pathname === "/teacher/change-password";
  const isCoordinatorChangePassword = nextUrl.pathname === "/coordinator/change-password";
  const isAuthApi                   = nextUrl.pathname.startsWith("/api/auth");
  const role                        = session?.user?.role;

  // Modo mantenimiento: solo puede importar para TEACHER/COORDINATOR en las
  // rutas que les corresponden. Para ADMIN, SUPERADMIN o visitantes sin
  // sesión no se consulta nada — cero impacto de rendimiento para ellos.
  const maybeAffectedByMaintenance =
    isLoggedIn &&
    (role === "TEACHER" || role === "COORDINATOR") &&
    (isLoginPage || isTeacherPath || isCoordinatorPath);

  if (isAuthApi) return NextResponse.next();

  // Rutas protegidas — requieren login
  if (!isLoggedIn && (isTeacherPath || isCoordinatorPath || isAdminPath || isSuperAdminPath || isPlanPreviewPath)) {
    const loginUrl = new URL("/login", base);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Usuario ya autenticado que vuelve al login → redirigir a su dashboard
  // (o al aviso de mantenimiento, si aplica)
  if (isLoggedIn && isLoginPage) {
    if (maybeAffectedByMaintenance && (await getMaintenanceMode()).enabled) {
      return NextResponse.redirect(new URL("/mantenimiento", base));
    }
    const destination =
      role === "SUPERADMIN"  ? "/superadmin/dashboard"           :
      role === "ADMIN"       ? "/admin/dashboard"                :
      role === "COORDINATOR" ? "/coordinator/retroalimentacion"  :
      "/teacher/year";
    return NextResponse.redirect(new URL(destination, base));
  }

  // Solo ADMIN y SUPERADMIN pueden acceder a rutas /admin/* y /plan-preview/*
  if (isLoggedIn && (isAdminPath || isPlanPreviewPath) && role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/teacher/year", base));
  }

  // Solo SUPERADMIN puede acceder a rutas /superadmin/*
  if (isLoggedIn && isSuperAdminPath && role !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/login", base));
  }

  // Solo COORDINATOR y SUPERADMIN pueden acceder a /coordinator/*
  if (isLoggedIn && isCoordinatorPath && role !== "COORDINATOR" && role !== "SUPERADMIN") {
    const dest =
      role === "ADMIN" ? "/admin/dashboard" :
      role === "TEACHER" ? "/teacher/year" :
      "/login";
    return NextResponse.redirect(new URL(dest, base));
  }

  // Solo TEACHER y SUPERADMIN pueden acceder a /teacher/*
  if (isLoggedIn && isTeacherPath && role !== "TEACHER" && role !== "SUPERADMIN") {
    const dest =
      role === "ADMIN"       ? "/admin/dashboard"               :
      role === "COORDINATOR" ? "/coordinator/retroalimentacion" :
      "/login";
    return NextResponse.redirect(new URL(dest, base));
  }

  // Modo mantenimiento activo: Docentes y Coordinadores quedan bloqueados de
  // sus rutas (aunque ya tuvieran sesión abierta). ADMIN y SUPERADMIN nunca
  // llegan aquí con maybeAffectedByMaintenance en true, así que no se ven
  // afectados en ningún caso.
  if (maybeAffectedByMaintenance && (await getMaintenanceMode()).enabled) {
    return NextResponse.redirect(new URL("/mantenimiento", base));
  }

  // Docentes con primer login deben cambiar su contraseña antes de continuar
  if (isLoggedIn && isTeacherPath && !isTeacherChangePassword && session?.user?.forcePasswordChange) {
    return NextResponse.redirect(new URL("/teacher/change-password", base));
  }

  // Coordinadores con primer login deben cambiar su contraseña antes de continuar
  if (isLoggedIn && isCoordinatorPath && !isCoordinatorChangePassword && session?.user?.forcePasswordChange) {
    return NextResponse.redirect(new URL("/coordinator/change-password", base));
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp   = buildCsp(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)" ],
};
