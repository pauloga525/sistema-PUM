import Link from "next/link";
import { notFound } from "next/navigation";
import { superAdminService } from "@/modules/superadmin/superadmin.service";
import { ROUTES } from "@/constants/routes";

export const metadata = { title: "Historial de accesos — SuperAdmin PUM" };

const EVENT_LABEL: Record<string, { label: string; color: string }> = {
  LOGIN_SUCCESS: { label: "Inicio de sesión",  color: "#166534" },
  LOGIN_FAILED:  { label: "Intento fallido",   color: "#991b1b" },
  LOGOUT:        { label: "Cierre de sesión",  color: "#374151" },
};

export default async function UserAccessPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  let user;
  try {
    user = await superAdminService.getUserById(userId);
  } catch {
    notFound();
  }

  const history = await superAdminService.getUserLoginHistory(userId, 100);

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-pum-text-muted">
        <Link href={ROUTES.SUPERADMIN.USERS} className="hover:text-pum-text hover:underline underline-offset-2">
          Usuarios
        </Link>
        <span>/</span>
        <Link href={ROUTES.SUPERADMIN.user(userId)} className="hover:text-pum-text hover:underline underline-offset-2">
          {user.name ?? user.email}
        </Link>
        <span>/</span>
        <span className="text-pum-text">Historial de accesos</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-pum-text">Historial de accesos</h1>
        <p className="text-sm text-pum-text-muted mt-1">
          {user.name ?? user.email} · {history.length} evento{history.length !== 1 ? "s" : ""} registrados
        </p>
      </div>

      <div className="rounded-xl border border-pum-border overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background: "#f5f0ff" }}>
              {["Evento", "Resultado", "IP", "Fecha y hora"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-pum-text-muted first:pl-5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-sm text-pum-text-muted">
                  No se encontraron eventos de acceso para este usuario.
                </td>
              </tr>
            )}
            {history.map((event) => {
              const ev = EVENT_LABEL[event.eventType] ?? { label: event.eventType, color: "#374151" };
              return (
                <tr key={event.id} className="border-t border-pum-border hover:bg-pum-bg/30 transition-colors">
                  <td className="px-4 pl-5 py-3 font-medium" style={{ color: ev.color }}>{ev.label}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={
                        event.result === "SUCCESS"
                          ? { background: "#dcfce7", color: "#166534" }
                          : { background: "#fee2e2", color: "#991b1b" }
                      }
                    >
                      {event.result === "SUCCESS" ? "Exitoso" : "Fallido"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-pum-text-muted">{event.actorIp ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-pum-text-muted">
                    {event.createdAt.toLocaleString("es-EC", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
