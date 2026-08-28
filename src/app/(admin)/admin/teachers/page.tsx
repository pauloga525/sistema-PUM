import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { adminService, type TeacherSortOption } from "@/modules/admin/admin.service";
import { CreateTeacherPanel } from "@/components/admin/CreateTeacherPanel";
import { TeachersTable } from "@/components/admin/TeachersTable";
import { ROUTES } from "@/constants/routes";

export const metadata = { title: "Docentes — Admin PUM" };

function buildUrl(
  base: string,
  current: Record<string, string>,
  overrides: Record<string, string>,
): string {
  const p = new URLSearchParams({ ...current, ...overrides });
  if (p.get("status") === "all")       p.delete("status");
  if (p.get("sort") === "name_asc")    p.delete("sort");
  if (!p.get("search"))                p.delete("search");
  if (p.get("page") === "1")           p.delete("page");
  const s = p.toString();
  return base + (s ? `?${s}` : "");
}

export default async function AdminTeachersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session) redirect(ROUTES.LOGIN);

  const sp     = await searchParams;
  const search = sp.search  ?? "";
  const status = (sp.status as "all" | "active" | "pending") ?? "all";
  const sort   = (sp.sort   as TeacherSortOption) ?? "name_asc";
  const page   = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const { items, total, totalPages } = await adminService.getTeachers({ search, status, sort, page });

  const hasFilters = search !== "" || status !== "all" || sort !== "name_asc";
  const base       = "/admin/teachers";
  const current    = { search, status, sort, page: String(page) };

  const inputClass =
    "border border-pum-border rounded-xl px-3 py-2 text-sm text-pum-text bg-white focus:outline-none focus:ring-2 focus:ring-pum-primary/30 focus:border-pum-primary/50 transition-colors";

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full">

      {/* ── Encabezado ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-pum-text">Docentes</h1>
          <p className="text-sm text-pum-text-muted mt-0.5">
            Crea y administra las cuentas de los docentes institucionales.
          </p>
        </div>
        <CreateTeacherPanel />
      </div>

      {/* ── Barra de búsqueda y filtros ── */}
      <form
        method="GET"
        className="rounded-2xl px-5 py-4 mb-5 flex flex-col sm:flex-row gap-3 flex-wrap"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(195,198,210,0.70)",
          boxShadow: "0 2px 12px rgba(0,39,83,0.05)",
        }}
      >
        {/* Búsqueda de texto */}
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Buscar por nombre, email o cédula…"
          className={`${inputClass} flex-1 min-w-[220px]`}
        />

        {/* Estado */}
        <select name="status" defaultValue={status} className={inputClass}>
          <option value="all">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="pending">Primer acceso</option>
        </select>

        {/* Ordenar por */}
        <select name="sort" defaultValue={sort} className={inputClass}>
          <option value="name_asc">Nombre A → Z</option>
          <option value="name_desc">Nombre Z → A</option>
          <option value="created_desc">Más recientes</option>
          <option value="created_asc">Más antiguos</option>
          <option value="assign_desc">Más asignaciones</option>
          <option value="assign_asc">Menos asignaciones</option>
        </select>

        {/* Resetear paginación al filtrar */}
        <input type="hidden" name="page" value="1" />

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer transition-opacity hover:opacity-90"
            style={{ background: "#002753" }}
          >
            Buscar
          </button>
          {hasFilters && (
            <Link
              href={base}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-pum-border text-pum-text-muted hover:text-pum-text hover:border-pum-text/30 transition-colors"
            >
              Limpiar
            </Link>
          )}
        </div>
      </form>

      {/* ── Contador de resultados ── */}
      <p className="text-xs text-pum-text-muted mb-3 px-1">
        {total.toLocaleString("es-EC")} docente{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
        {totalPages > 1 ? ` · Página ${page} de ${totalPages}` : ""}
      </p>

      {/* ── Lista o estado vacío ── */}
      {items.length === 0 ? (
        <div
          className="rounded-2xl px-8 py-12 flex flex-col items-center text-center"
          style={{
            background: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(195,198,210,0.70)",
            boxShadow: "0 2px 12px rgba(0,39,83,0.05)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(0,39,83,0.06)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#737781" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          {hasFilters ? (
            <>
              <p className="text-base font-semibold text-pum-text mb-1">Sin resultados</p>
              <p className="text-sm text-pum-text-muted max-w-xs">
                No hay docentes que coincidan con los filtros aplicados.{" "}
                <Link href={base} className="underline underline-offset-2 hover:text-pum-text">
                  Limpiar filtros
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-pum-text mb-1">Sin docentes registrados</p>
              <p className="text-sm text-pum-text-muted max-w-xs">
                Agrega el primer docente usando el botón <strong>Nuevo docente</strong> en la parte superior.
              </p>
            </>
          )}
        </div>
      ) : (
        <TeachersTable teachers={items} />
      )}

      {/* ── Paginación ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          {page > 1 && (
            <Link
              href={buildUrl(base, current, { page: String(page - 1) })}
              className="px-3 py-1.5 text-sm rounded-xl border border-pum-border text-pum-text-muted hover:text-pum-text hover:border-pum-text/30 transition-colors"
            >
              ← Anterior
            </Link>
          )}
          <span className="text-sm text-pum-text-muted">Página {page} de {totalPages}</span>
          {page < totalPages && (
            <Link
              href={buildUrl(base, current, { page: String(page + 1) })}
              className="px-3 py-1.5 text-sm rounded-xl border border-pum-border text-pum-text-muted hover:text-pum-text hover:border-pum-text/30 transition-colors"
            >
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
