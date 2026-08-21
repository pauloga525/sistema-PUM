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

// --- Rutas públicas ---
export const ROUTES = {
  // Auth
  LOGIN: "/login",

  // Docente
  TEACHER: {
    ROOT: "/teacher",
    YEAR: "/teacher/year",
    CHANGE_PASSWORD: "/teacher/change-password",
    period: (yearId: string) => `/teacher/${yearId}/subjects`,
    subjectsYear: (yearId: string) => `/teacher/${yearId}/subjects`,
    subjects: (yearId: string, periodId: string) =>
      `/teacher/${yearId}/${periodId}/subjects`,
    planification: (yearId: string, periodId: string, planId: string) =>
      `/teacher/${yearId}/${periodId}/planification/${planId}`,
    tabla: (yearId: string, periodId: string, planId: string) =>
      `/teacher/${yearId}/${periodId}/planification/${planId}/tabla`,
    preview: (yearId: string, periodId: string, planId: string) =>
      `/teacher/${yearId}/${periodId}/planification/${planId}/preview`,
  },

  // Coordinador de Área
  COORDINATOR: {
    ROOT: "/coordinator",
    RETROALIMENTACION: "/coordinator/retroalimentacion",
    DOCENTES: "/coordinator/docentes",
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
