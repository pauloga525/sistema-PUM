import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { superAdminService } from "@/modules/superadmin/superadmin.service";
import { UserActions } from "@/components/superadmin/UserActions";
import { ROUTES } from "@/constants/routes";

export const metadata = { title: "Detalle de usuario — SuperAdmin PUM" };

const ROLE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  TEACHER:    { label: "Docente",        bg: "#dbeafe", color: "#1e40af" },
  COORDINATOR:{ label: "Coordinador",    bg: "#fef3c7", color: "#92400e" },
  ADMIN:      { label: "Administrador",  bg: "#dcfce7", color: "#166534" },
  SUPERADMIN: { label: "SuperAdmin",     bg: "#ede9fe", color: "#4c1d95" },
};

function formatDateTime(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleString("es-EC", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function UserDetailPage({
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

  const session = await auth();
  const isSelf  = session?.user.id === user.id;
  const badge   = ROLE_BADGE[user.role] ?? ROLE_BADGE.TEACHER;

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href={ROUTES.SUPERADMIN.USERS}
          className="text-sm text-pum-text-muted hover:text-pum-text underline-offset-2 hover:underline transition-colors"
        >
          ← Volver a usuarios
        </Link>
      </div>

      {/* Header del usuario */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
          style={{ background: "#4c1d95" }}
        >
          {user.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-pum-text">{user.name ?? "Sin nombre"}</h1>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: badge.bg, color: badge.color }}
            >
              {badge.label}
            </span>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={
                user.isActive
                  ? { background: "#dcfce7", color: "#166534" }
                  : { background: "#fee2e2", color: "#991b1b" }
              }
            >
              {user.isActive ? "Activo" : "Inactivo"}
            </span>
            {isSelf && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#f3f4f6", color: "#374151" }}>
                Tú
              </span>
            )}
          </div>
          <p className="text-sm text-pum-text-muted mt-0.5">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información básica */}
        <div>
          <div className="rounded-xl border border-pum-border bg-white p-5 mb-4">
            <h2 className="text-sm font-semibold text-pum-text mb-4">Información básica</h2>
            <dl className="space-y-3">
              <InfoRow label="Cédula" value={user.cedula ?? "—"} mono />
              <InfoRow label="Email" value={user.email} />
              {user.role === "COORDINATOR" && user.coordinatorArea && (
                <InfoRow label="Área de coordinación" value={user.coordinatorArea} />
              )}
              <InfoRow label="Cambio de contraseña pendiente" value={user.forcePasswordChange ? "Sí" : "No"} />
              <InfoRow label="Cuenta creada" value={formatDateTime(user.createdAt)} />
              <InfoRow label="Último acceso" value={formatDateTime(user.lastLoginAt)} />
            </dl>
          </div>

          <Link
            href={ROUTES.SUPERADMIN.userAccess(user.id)}
            className="flex items-center justify-between rounded-xl border border-pum-border bg-white p-4 hover:shadow-sm transition-shadow text-sm"
          >
            <span className="font-medium text-pum-text">Historial de accesos</span>
            <span className="text-pum-text-muted">→</span>
          </Link>
        </div>

        {/* Acciones */}
        <div>
          <h2 className="text-sm font-semibold text-pum-text mb-4">Gestión de la cuenta</h2>
          <UserActions
            userId={user.id}
            currentRole={user.role}
            isActive={user.isActive}
            hasCedula={!!user.cedula}
            isSelf={isSelf}
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="text-pum-text-muted flex-shrink-0 w-48">{label}</dt>
      <dd className={`text-pum-text text-right ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
