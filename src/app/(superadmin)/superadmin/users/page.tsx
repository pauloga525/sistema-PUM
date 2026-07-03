import Link from "next/link";
import { superAdminService } from "@/modules/superadmin/superadmin.service";
import { ROUTES } from "@/constants/routes";

export const metadata = { title: "Usuarios — SuperAdmin PUM" };

const ROLE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  TEACHER:    { label: "Docente",        bg: "#dbeafe", color: "#1e40af" },
  COORDINATOR:{ label: "Coordinador",    bg: "#fef3c7", color: "#92400e" },
  ADMIN:      { label: "Administrador",  bg: "#dcfce7", color: "#166534" },
  SUPERADMIN: { label: "SuperAdmin",     bg: "#ede9fe", color: "#4c1d95" },
};

const ROLE_OPTIONS = [
  { value: "ALL",        label: "Todos los roles" },
  { value: "TEACHER",    label: "Docente" },
  { value: "COORDINATOR",label: "Coordinador" },
  { value: "ADMIN",      label: "Administrador" },
  { value: "SUPERADMIN", label: "SuperAdmin" },
];

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page    = Math.max(1, Number(params.page ?? "1"));
  const filters = {
    search: params.search ?? "",
    role:   params.role ?? "ALL",
    status: params.status ?? "all",
    page,
    perPage: 20,
  };

  const { items, total, totalPages } = await superAdminService.getUsers(filters);

  const buildUrl = (overrides: Record<string, string>) => {
    const p = new URLSearchParams({
      search: filters.search,
      role:   filters.role,
      status: filters.status,
      page:   String(page),
      ...overrides,
    });
    return `${ROUTES.SUPERADMIN.USERS}?${p.toString()}`;
  };

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-pum-text">Usuarios del sistema</h1>
          <p className="text-sm text-pum-text-muted mt-0.5">{total} usuario{total !== 1 ? "s" : ""} en total</p>
        </div>
        <Link
          href={ROUTES.SUPERADMIN.NEW_USER}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
          style={{ background: "#4c1d95" }}
        >
          + Nuevo usuario
        </Link>
      </div>

      {/* Filtros */}
      <form method="GET" action={ROUTES.SUPERADMIN.USERS} className="flex flex-wrap items-end gap-3 mb-5">
        <div className="flex-1 min-w-[200px]">
          <input
            name="search"
            defaultValue={filters.search}
            placeholder="Buscar por nombre, email o cédula..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-pum-border bg-white focus:outline-none focus:ring-2 focus:ring-purple-300/50"
          />
        </div>
        <select
          name="role"
          defaultValue={filters.role}
          className="px-3 py-2 text-sm rounded-lg border border-pum-border bg-white focus:outline-none"
        >
          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          name="status"
          defaultValue={filters.status}
          className="px-3 py-2 text-sm rounded-lg border border-pum-border bg-white focus:outline-none"
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
        <input type="hidden" name="page" value="1" />
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white rounded-lg"
          style={{ background: "#4c1d95" }}
        >
          Buscar
        </button>
        {(filters.search || filters.role !== "ALL" || filters.status !== "all") && (
          <Link href={ROUTES.SUPERADMIN.USERS} className="px-3 py-2 text-sm text-pum-text-muted hover:text-pum-text underline-offset-2 hover:underline">
            Limpiar
          </Link>
        )}
      </form>

      {/* Tabla */}
      <div className="rounded-xl border border-pum-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: "#f5f0ff" }}>
                {["Usuario", "Cédula", "Rol", "Estado", "Último acceso", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-pum-text-muted first:pl-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-pum-text-muted">
                    No se encontraron usuarios con los filtros aplicados.
                  </td>
                </tr>
              )}
              {items.map((user) => {
                const badge = ROLE_BADGE[user.role] ?? ROLE_BADGE.TEACHER;
                return (
                  <tr key={user.id} className="border-t border-pum-border hover:bg-pum-bg/40 transition-colors">
                    <td className="px-4 pl-5 py-3">
                      <p className="font-medium text-pum-text">{user.name ?? "—"}</p>
                      <p className="text-xs text-pum-text-muted mt-0.5">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-pum-text-muted font-mono text-xs">{user.cedula ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3 text-xs text-pum-text-muted">{formatDate(user.lastLoginAt)}</td>
                    <td className="px-4 py-3 text-right pr-5">
                      <Link
                        href={ROUTES.SUPERADMIN.user(user.id)}
                        className="text-xs font-medium hover:underline underline-offset-2"
                        style={{ color: "#4c1d95" }}
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-pum-text-muted">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="px-3 py-1.5 text-xs rounded-lg border border-pum-border hover:bg-pum-bg transition-colors"
              >
                ← Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="px-3 py-1.5 text-xs rounded-lg border border-pum-border hover:bg-pum-bg transition-colors"
              >
                Siguiente →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
