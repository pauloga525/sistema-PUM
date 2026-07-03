/**
 * Página "Sin asignaciones" — Docente sin materias asignadas
 *
 * Se muestra cuando un docente se autentica correctamente pero no
 * tiene asignaciones activas para el año lectivo actual.
 *
 * Cuándo ocurre:
 *   - Docente nuevo que aún no fue asignado por el admin
 *   - Docente con asignaciones del año anterior, pero el nuevo año
 *     aún no fue configurado por el administrador
 *
 * Mensaje UX: claro y accionable — indica a quién contactar.
 */

import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function EmptyPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="bg-pum-surface border border-pum-border rounded-lg p-8 w-full max-w-md text-center shadow-pum-sm">

        <div className="w-16 h-16 bg-pum-surface-alt rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl" aria-hidden="true">📋</span>
        </div>

        <h1 className="text-lg font-semibold text-pum-text mb-2">
          Sin materias asignadas
        </h1>

        <p className="text-sm text-pum-text-muted mb-4 leading-relaxed">
          No tienes materias asignadas para el año lectivo actual.
          Por favor contacta al administrador del sistema para que te asigne las materias correspondientes.
        </p>

        <p className="text-xs text-pum-text-muted">
          Sesión activa como:{" "}
          <span className="font-medium text-pum-text">{session.user?.email}</span>
        </p>
      </div>
    </div>
  );
}
