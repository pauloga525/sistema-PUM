/**
 * Proxy de Next.js 16 — Protección de rutas de PUM Web.
 *
 * Se ejecuta en Edge Runtime ANTES de que cualquier página o API route
 * procese el request. Es la primera línea de defensa de autorización.
 *
 * Rutas protegidas:
 *   /teacher/*     → requiere login
 *   /coordinator/* → requiere login
 *   /admin/*       → requiere login + rol ADMIN
 *
 * Redirecciones especiales:
 *   forcePasswordChange=true → /teacher/change-password o /coordinator/change-password
 *
 * Nota: En Next.js 16, "Middleware" fue renombrado a "Proxy".
 * El archivo se llamaba middleware.ts — ahora es proxy.ts.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth: { user: { id: string; role: string; forcePasswordChange?: boolean; name?: string | null; email?: string | null; image?: string | null } } | null }) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;

  // Construir URL base desde los headers de Cloudflare.
  // req.url en Edge Runtime lleva la IP interna del servidor;
  // x-forwarded-host contiene el dominio público (Cloudflare Tunnel).
  const fwdHost  = req.headers.get("x-forwarded-host");
  const fwdProto = req.headers.get("x-forwarded-proto");
  const rawHost  = req.headers.get("host") ?? "localhost:3000";
  const host     = fwdHost ?? rawHost;
  const proto    = fwdProto ?? (host.includes("localhost") ? "http" : "https");
  const base     = `${proto}://${host}`;

  const isLoginPage                 = nextUrl.pathname === "/login";
  const isTeacherPath               = nextUrl.pathname.startsWith("/teacher");
  const isCoordinatorPath           = nextUrl.pathname.startsWith("/coordinator");
  const isAdminPath                 = nextUrl.pathname.startsWith("/admin");
  const isSuperAdminPath            = nextUrl.pathname.startsWith("/superadmin");
  const isTeacherChangePassword     = nextUrl.pathname === "/teacher/change-password";
  const isCoordinatorChangePassword = nextUrl.pathname === "/coordinator/change-password";
  const isAuthApi                   = nextUrl.pathname.startsWith("/api/auth");
  const role                        = session?.user?.role;

  if (isAuthApi) return NextResponse.next();

  // Rutas protegidas — requieren login
  if (!isLoggedIn && (isTeacherPath || isCoordinatorPath || isAdminPath || isSuperAdminPath)) {
    const loginUrl = new URL("/login", base);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Usuario ya autenticado que vuelve al login → redirigir a su dashboard
  if (isLoggedIn && isLoginPage) {
    const destination =
      role === "SUPERADMIN"  ? "/superadmin/dashboard"           :
      role === "ADMIN"       ? "/admin/dashboard"                :
      role === "COORDINATOR" ? "/coordinator/retroalimentacion"  :
      "/teacher/year";
    return NextResponse.redirect(new URL(destination, base));
  }

  // Solo ADMIN y SUPERADMIN pueden acceder a rutas /admin/*
  if (isLoggedIn && isAdminPath && role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/teacher/year", base));
  }

  // Solo SUPERADMIN puede acceder a rutas /superadmin/*
  if (isLoggedIn && isSuperAdminPath && role !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/login", base));
  }

  // Docentes con primer login deben cambiar su contraseña antes de continuar
  if (isLoggedIn && isTeacherPath && !isTeacherChangePassword && session?.user?.forcePasswordChange) {
    return NextResponse.redirect(new URL("/teacher/change-password", base));
  }

  // Coordinadores con primer login deben cambiar su contraseña antes de continuar
  if (isLoggedIn && isCoordinatorPath && !isCoordinatorChangePassword && session?.user?.forcePasswordChange) {
    return NextResponse.redirect(new URL("/coordinator/change-password", base));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)" ],
};
