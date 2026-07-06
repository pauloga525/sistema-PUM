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

  // Si hay sesión, mantener la lógica de redirección según rol
  if (session) {
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

  // Si NO hay sesión, mostrar una landing pública en la raíz
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <header className="border-b">
        <nav className="mx-auto max-w-6xl flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-indigo-600 w-10 h-10 flex items-center justify-center text-white font-bold">P</div>
            <span className="font-semibold">PUM</span>
          </div>
          <div className="flex items-center gap-4">
            <a href={ROUTES.LOGIN} className="text-sm font-medium text-indigo-600">Iniciar sesión</a>
            <a href="/docs/PROJECT_MAP.md" className="text-sm text-slate-600">Documentación</a>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl p-8">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center py-12">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight mb-4">Plataforma Unificada de Planificación</h1>
            <p className="text-lg text-slate-600 mb-6">
              Gestiona planificaciones escolares, colabora con tu equipo y exporta documentos oficiales
              desde una única interfaz pensada para docentes y administradores.
            </p>

            <div className="flex gap-3">
              <a href={ROUTES.LOGIN} className="inline-block rounded bg-indigo-600 text-white px-5 py-3 shadow">Iniciar sesión</a>
              <a href="/docs/PROJECT_MAP.md" className="inline-block rounded border px-5 py-3 text-slate-700">Ver documentación</a>
            </div>
          </div>

          <div className="flex justify-center">
            <svg width="320" height="220" viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <rect x="0" y="0" width="320" height="220" rx="12" fill="#EEF2FF" />
              <g transform="translate(24,24)">
                <rect x="0" y="0" width="200" height="36" rx="6" fill="#6366F1" />
                <rect x="0" y="56" width="160" height="16" rx="4" fill="#A5B4FC" />
                <rect x="0" y="80" width="180" height="16" rx="4" fill="#C7D2FE" />
                <rect x="0" y="104" width="120" height="16" rx="4" fill="#EDE9FE" />
              </g>
            </svg>
          </div>
        </section>

        <section className="py-8">
          <h2 className="text-2xl font-semibold mb-4">Características</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Planificación centralizada</h3>
              <p className="text-sm text-slate-600">Crea y edita planes desde un lugar central con versiones y vistas por curso.</p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Exportaciones</h3>
              <p className="text-sm text-slate-600">Genera DOCX, PDF o paquetes ZIP para entrega y auditoría.</p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Control de accesos</h3>
              <p className="text-sm text-slate-600">Roles y permisos para docentes, administradores y supervisores.</p>
            </div>
          </div>
        </section>

        <section className="py-8">
          <h2 className="text-2xl font-semibold mb-4">Comienza</h2>
          <div className="flex gap-3">
            <a href={ROUTES.LOGIN} className="rounded bg-indigo-600 text-white px-4 py-2">Ingresar</a>
            <a href="mailto:soporte@institucion.edu" className="rounded border px-4 py-2">Contacto</a>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl p-6 text-sm text-slate-600">© {new Date().getFullYear()} PUM — Plataforma Unificada de Planificación</div>
      </footer>
    </div>
  );
}
