/**
 * Página raíz de PUM Web ( / )
 *
 * No renderiza contenido — solo redirige al destino correcto según
 * el estado de autenticación y el rol del usuario.
 *
 * Flujo:
 *   Sin sesión → /login
 *   TEACHER    → /teacher/year
 *   ADMIN      → /admin/dashboard
 *
 * Por qué un redirect en lugar de renderizar aquí:
 *   Cada sección (docente, admin) tiene su propio layout y contexto.
 *   Redirigir desde la raíz mantiene URLs semánticamente correctas
 *   y evita duplicar lógica de UI en la página raíz.
 */

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default async function RootPage() {
  const session = await auth();

  if (!session) {
    redirect(ROUTES.LOGIN);
  }

  if (session.user?.role === "ADMIN") {
    redirect(ROUTES.ADMIN.DASHBOARD);
  }

  if (session.user?.role === "SUPERADMIN") {
    redirect(ROUTES.SUPERADMIN.DASHBOARD);
  }

  if (session.user?.role === "COORDINATOR") {
    redirect(ROUTES.COORDINATOR.RETROALIMENTACION);
  }

  redirect(ROUTES.TEACHER.YEAR);
}
