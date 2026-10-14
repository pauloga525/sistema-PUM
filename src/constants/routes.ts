/**
 * Rutas de la aplicación PUM Web definidas como constantes tipadas.
 *
 * Por qué usar constantes en lugar de strings literales:
 *   - Un cambio de ruta se hace en un solo lugar
 *   - TypeScript detecta referencias a rutas inexistentes
 *   - El autocompletado del IDE sugiere rutas válidas
 *
 * Convención: las funciones reciben parámetros tipados y retornan el path completo.
 */

import type { UserRole } from "./levels";

// --- Rutas públicas ---
export const ROUTES = {
  // Auth
  LOGIN: "/login",

  // Aviso público de mantenimiento (Docentes/Coordinadores bloqueados)
  MAINTENANCE: "/maintenance",

  // Docente
  TEACHER: {
    ROOT: "/teacher",
    YEAR: "/teacher/year",
    CHANGE_PASSWORD: "/teacher/change-password",
    /** Materias del año, con el estado de cada periodo. */
    subjectsYear: (yearId: string) => `/teacher/${yearId}/subjects`,
    planification: (yearId: string, periodId: string, planId: string) =>
      `/teacher/${yearId}/${periodId}/planification/${planId}`,
    table: (yearId: string, periodId: string, planId: string) =>
      `/teacher/${yearId}/${periodId}/planification/${planId}/table`,
    preview: (yearId: string, periodId: string, planId: string) =>
      `/teacher/${yearId}/${periodId}/planification/${planId}/preview`,
  },

  // Coordinador de Área
  COORDINATOR: {
    ROOT: "/coordinator",
    FEEDBACK: "/coordinator/feedback",
    TEACHERS: "/coordinator/teachers",
    CHANGE_PASSWORD: "/coordinator/change-password",
    review: (planId: string) => `/coordinator/${planId}/review`,
  },

  // Administrador
  ADMIN: {
    ROOT: "/admin",
    DASHBOARD: "/admin/dashboard",
    TEACHERS: "/admin/teachers",
    CATALOG: "/admin/catalog",
    ASSIGNMENTS: "/admin/assignments",
    COORDINATORS: "/admin/coordinators",
    DEADLINES: "/admin/deadlines",
    EXPORT_ZIP: "/admin/export/zip",
    EXPORT_FTP: "/admin/export/ftp",
    AUDIT: "/admin/audit",
    pumPreview: (planId: string) => `/admin/pum/${planId}/preview`,
  },

  // Super Administrador (Departamento de Sistemas)
  SUPERADMIN: {
    ROOT:      "/superadmin",
    DASHBOARD: "/superadmin/dashboard",
    USERS:     "/superadmin/users",
    NEW_USER:  "/superadmin/users/new",
    user:      (id: string) => `/superadmin/users/${id}`,
    userAccess:(id: string) => `/superadmin/users/${id}/access`,
    ROLES:     "/superadmin/roles",
    SETTINGS:  "/superadmin/settings",
    PLANS:     "/superadmin/plans",
    plan:      (id: string) => `/superadmin/plans/${id}`,
    pumPreview:(id: string) => `/plan-preview/${id}`,
    AUDIT:     "/superadmin/audit",
    ERRORS:    "/superadmin/errors",
    error:     (id: string) => `/superadmin/errors/${id}`,
  },

  // API (server-side, no navegar directamente)
  API: {
    AUTH: "/api/auth",
    EXPORT: (planId: string, format: "docx" | "pdf") =>
      `/api/export/${planId}?format=${format}`,
    EXPORT_ZIP:   "/api/export/zip",
    EXPORT_EXCEL: "/api/export/excel",
    FTP_PUSH: "/api/ftp/push",
  },
} as const;

// --- Navegación por rol ---

/** Iconos disponibles para los ítems de navegación (ver components/layout/NavIcon). */
export type NavIconName =
  | "grid" | "user" | "users" | "book" | "bookOpen" | "coordinators"
  | "calendar" | "download" | "message" | "file" | "shield" | "alert" | "settings";

export interface NavItem {
  href: string;
  label: string;
  icon?: NavIconName;
}

/** Ítems de navegación de cada rol, en el orden en que se muestran. */
export const NAV_ITEMS: Record<UserRole, readonly NavItem[]> = {
  TEACHER: [
    { href: ROUTES.TEACHER.YEAR, label: "Mis materias", icon: "bookOpen" },
  ],
  COORDINATOR: [
    { href: ROUTES.COORDINATOR.FEEDBACK, label: "Retroalimentación", icon: "message" },
    { href: ROUTES.COORDINATOR.TEACHERS,          label: "Docentes",          icon: "user" },
  ],
  ADMIN: [
    { href: ROUTES.ADMIN.DASHBOARD,    label: "Dashboard",     icon: "grid" },
    { href: ROUTES.ADMIN.TEACHERS,     label: "Docentes",      icon: "user" },
    { href: ROUTES.ADMIN.ASSIGNMENTS,  label: "Asignaciones",  icon: "users" },
    { href: ROUTES.ADMIN.CATALOG,      label: "Catálogo",      icon: "book" },
    { href: ROUTES.ADMIN.COORDINATORS, label: "Coordinadores", icon: "coordinators" },
    { href: ROUTES.ADMIN.DEADLINES,    label: "Plazos",        icon: "calendar" },
    { href: ROUTES.ADMIN.EXPORT_ZIP,   label: "Exportar ZIP",  icon: "download" },
  ],
  SUPERADMIN: [
    { href: ROUTES.SUPERADMIN.DASHBOARD, label: "Dashboard", icon: "grid" },
    { href: ROUTES.SUPERADMIN.USERS,     label: "Usuarios",  icon: "users" },
    { href: ROUTES.SUPERADMIN.PLANS,     label: "PUM",       icon: "file" },
    { href: ROUTES.SUPERADMIN.AUDIT,     label: "Auditoría", icon: "shield" },
    { href: ROUTES.SUPERADMIN.ERRORS,    label: "Errores",   icon: "alert" },
    { href: ROUTES.SUPERADMIN.SETTINGS,  label: "Sistema",   icon: "settings" },
  ],
};
