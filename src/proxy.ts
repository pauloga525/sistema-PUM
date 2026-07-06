/**
 * Proxy de Next.js 16 — Protección de rutas de PUM Web.
 *
 * Se ejecuta en Edge Runtime ANTES de que cualquier página o API route
 * procese el request. Es la primera línea de defensa de autorización.
 *
 * Rutas protegidas:
 *   /teacher/* → requiere login
 *   /admin/*   → requiere login + rol ADMIN
 *
 * Redirecciones especiales:
 *   forcePasswordChange=true → /teacher/change-password (docentes con primer login)
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

  if (!isLoggedIn && (isTeacherPath || isAdminPath || isSuperAdminPath)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    const destination =
      role === "SUPERADMIN" ? "/superadmin/dashboard" :
      role === "ADMIN"      ? "/admin/dashboard"      :
      "/teacher/year";
    return NextResponse.redirect(new URL(destination, req.url));
  }

  // Solo ADMIN y SUPERADMIN pueden acceder a rutas /admin/*
  if (isLoggedIn && isAdminPath && role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/teacher/year", req.url));
  }

  // Solo SUPERADMIN puede acceder a rutas /superadmin/*
  if (isLoggedIn && isSuperAdminPath && role !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Docentes con primer login deben cambiar su contraseña antes de continuar
  if (isLoggedIn && isTeacherPath && !isTeacherChangePassword && session?.user?.forcePasswordChange) {
    return NextResponse.redirect(new URL("/teacher/change-password", req.url));
  }

  // Coordinadores con primer login deben cambiar su contraseña antes de continuar
  if (isLoggedIn && isCoordinatorPath && !isCoordinatorChangePassword && session?.user?.forcePasswordChange) {
    return NextResponse.redirect(new URL("/coordinator/change-password", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)" ],
};
