/** Datos fijos que global-setup crea y las pruebas consultan. */

export const PASSWORD = "E2e-Clave-2026!";

export const USERS = {
  teacher:     { email: "docente.e2e@test.local",     name: "Docente E2E",     role: "TEACHER" },
  coordinator: { email: "coordinador.e2e@test.local", name: "Coordinadora E2E", role: "COORDINATOR" },
  admin:       { email: "admin.e2e@test.local",       name: "Admin E2E",       role: "ADMIN" },
} as const;

export type RoleKey = keyof typeof USERS;

export const CATALOG = {
  yearLabel:    "2026-2027",
  // Un periodo por escenario: cada PUM es único por año+periodo+materia+nivel
  periods:      ["Trimestre 1", "Trimestre 2", "Trimestre 3", "Trimestre 4"],
  subjectName:  "Matemática",
  subjectCode:  "MAT",
  levelName:    "8vo de Básica",
  levelCode:    "8EB",
} as const;

/** Datos de la unidad completos (requisito para abrir la tabla del PUM). */
export const COMPLETE_METADATA = {
  areaEstudio:       "Matemática",
  numUnidad:         "1",
  titulo:            "Unidad E2E",
  objetivos:         ["Objetivo de prueba"],
  criterios:         ["Criterio de prueba"],
  nPeriodos:         "10",
  fechInicio:        "2026-09-01",
  fechFin:           "2026-10-15",
  ejesTransversales: "Eje de prueba",
  aportes:           [],
  p1:                null,
  p2:                null,
  p3:                null,
};
