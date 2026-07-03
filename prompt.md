# PROMPT — PUM Web
# Contexto completo del proyecto para continuar en un nuevo chat

**Última actualización:** 2026-06-16 (Fase 3 completa)
**Estado actual:** Fases 1, 2 y 3 completadas ✅ — Listo para Fase 4 (Panel Admin + FTP)

---

## INSTRUCCIÓN PARA CLAUDE

Eres un Software Architect / Senior Developer trabajando en **PUM Web**, una aplicación web institucional para gestionar planificaciones unitarias de módulo (PUM) en un colegio. El proyecto está en curso. Las Fases 1, 2 y 3 están completadas. Continúas desde donde se dejó.

### METODOLOGÍA OBLIGATORIA (nunca la ignores)

1. **Incremental:** Analiza → Explica → Propón → Espera aprobación → Implementa → Explica → Documenta → Para y espera
2. **NUNCA avances automáticamente** a la siguiente fase o subtarea sin aprobación explícita del usuario
3. Al terminar la implementación de una fase: para, resume lo hecho y espera instrucción
4. No agregues features, refactors ni abstracciones más allá de lo pedido
5. No agregues comentarios que expliquen QUÉ hace el código, solo el POR QUÉ cuando no es obvio
6. **Actualiza siempre** `codes.md` y `prompt.md` al terminar cada fase

---

## DESCRIPCIÓN DEL PROYECTO

**PUM Web** es un sistema institucional de gestión de planificaciones educativas para un colegio ecuatoriano.

### Propósito del negocio
Los docentes crean su **Planificación Unitaria de Módulo (PUM)** — una tabla de 5 columnas:
1. **DCD** — Destreza con criterio de desempeño
2. **Indicador de Logro**
3. **Metodología** (texto + íconos pedagógicos con color)
4. **Recursos** (texto libre)
5. **Evaluación** (texto libre)

Los docentes rellenan la tabla, la finalizan y la exportan en Word. El admin gestiona catálogos, asignaciones y sube archivos al NAS/FTP.

### Entidades clave del negocio
- **AcademicYear** — Año lectivo (ej: 2026-2027)
- **Period** — Quimestre 1 / Quimestre 2
- **Subject** — Materia (ej: Matemáticas)
- **Level** — Nivel educativo con `track` (BASICA/BACHILLERATO) y `orderIndex`
- **TeacherAssignment** — Asignación docente: year + subject + level (unique)
- **Planification** — La PUM: teacher + year + period + subject + level (unique)
- **PlanificationRow** — Fila de tabla PUM (`data Json`, `methodologyIcons Json`)

### Roles de usuario
- **TEACHER** — Docente: accede a `/teacher/*`, crea y exporta su PUM
- **ADMIN** — Administrador: accede a `/admin/*`, gestiona catálogos y hace push FTP

---

## STACK TECNOLÓGICO

| Tecnología | Versión | Notas importantes |
|---|---|---|
| **Next.js** | 16.2.9 | `middleware.ts` se llama `proxy.ts` en esta versión |
| **React** | 19.2.4 | |
| **TypeScript** | 5.x strict | |
| **Prisma** | 7.8.0 | Requiere `prisma.config.ts` + driver adapter (`@prisma/adapter-pg`) |
| **PostgreSQL** | 18 | Instalado en `C:\Program Files\PostgreSQL\18\bin\` |
| **Auth.js (next-auth)** | v5 beta.31 | Actualmente usa CredentialsProvider (ver sección Auth) |
| **Zod** | v4.4.3 | `result.error.issues` (NO `.errors`) · `z.literal(true, "msg")` (NO `errorMap`) |
| **Tailwind CSS** | v4 | Design tokens en `@theme inline` dentro de `globals.css` |
| **docx** | 9.7.1 | Generación de Word en memoria |
| **archiver** | 8.0.0 | Generación de ZIPs (Fase 4) |
| **basic-ftp** | 6.0.1 | Cliente FTP para NAS (Fase 4) |
| **tsx** | 4.x | Ejecutar scripts TypeScript directamente |

---

## BREAKING CHANGES Y QUIRKS CONOCIDOS (CRÍTICO LEER)

### 1. Prisma 7 — Arquitectura completamente nueva
```typescript
// prisma.config.ts (en la raíz del proyecto)
import { defineConfig } from "prisma/config";
import { config } from "dotenv";
config({ path: ".env" });
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: process.env.DATABASE_URL! },
});

// prisma/schema.prisma — datasource SIN url:
datasource db {
  provider = "postgresql"
  // NO poner url aquí
}

// src/lib/prisma/client.ts — SIEMPRE usar adapter:
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const client = new PrismaClient({ adapter });
```
- Todos los scripts también necesitan el adapter: `seed.ts`, `check-db.ts`
- `.env` (para Prisma CLI) y `.env.local` (para Next.js) deben tener `DATABASE_URL`

### 2. Next.js 16 — Middleware renombrado a Proxy
- El archivo es `src/proxy.ts` (NO `src/middleware.ts`)
- Si ambos existen al mismo tiempo → error. Borrar el que no corresponde
- Eliminados: `serverRuntimeConfig`, `publicRuntimeConfig` de `next.config.ts`
- `params` en Server Components ahora es `Promise<...>` → hay que hacer `await params`

### 3. Auth.js v5 — Actualmente usa CredentialsProvider (sin Google)
```typescript
// src/auth.ts — users hardcodeados para desarrollo
const DEV_USERS = [
  { id: "teacher-dev-1", email: "docente@test.com", password: "docente123", role: "TEACHER" },
  { id: "admin-dev-1",   email: "admin@test.com",   password: "admin123",   role: "ADMIN" },
];
```
- Los IDs `teacher-dev-1` y `admin-dev-1` existen en la tabla `users` de la BD (los crea el seed)
- Google OAuth pendiente para después (reemplazar CredentialsProvider)

### 4. Zod v4 — API diferente
```typescript
// ❌ Zod v3 (NO usar):
result.error.errors[0]?.message
z.literal(true, { errorMap: () => ({ message: "msg" }) })

// ✅ Zod v4 (usar esto):
result.error.issues[0]?.message
z.literal(true, "msg")
```

### 5. Tailwind v4 — Design tokens en `@theme inline`
```css
/* globals.css — los pum-* tokens se definen en :root y se registran en @theme inline */
:root { --pum-color-primary: #1E40AF; ... }
@theme inline {
  --color-pum-primary: var(--pum-color-primary);
  /* → genera clase bg-pum-primary, text-pum-primary, etc. */
}
```
- NO importar archivos CSS externos con `@import` (Turbopack falla). Todo inline.

### 6. Edge Runtime (proxy.ts)
- NO puede importar Prisma (usa Node.js APIs no disponibles en Edge)
- Logger debe usar `console.log`/`console.error` (NO `process.stdout.write`)

### 7. PostgreSQL en PATH (solo primera vez)
```powershell
$env:PATH += ";C:\Program Files\PostgreSQL\18\bin"
```

---

## ARQUITECTURA EN CAPAS

```
Presentación:    src/app/          (páginas, layouts, RSC, Server Actions)
Módulos:         src/modules/      (lógica de negocio por feature)
Infraestructura: src/lib/          (Prisma, errores, logger)
Config:          src/config/       (variables de entorno tipadas)
Constantes:      src/constants/    (rutas, estados, niveles)
Tipos globales:  src/types/        (ActionResult, SessionUser, IDs)
```

---

## ESTRUCTURA DE ARCHIVOS (estado actual)

```
pum-web/
├── codes.md                      ← Todos los comandos del proyecto
├── prompt.md                     ← Este archivo (contexto para Claude)
├── .env                          ← Para Prisma CLI (solo DATABASE_URL)
├── .env.local                    ← Para Next.js (todas las vars)
├── prisma.config.ts              ← Config Prisma 7 con dotenv
├── next.config.ts                ← Headers seguridad, turbopack.root
│
├── prisma/
│   └── schema.prisma             ← 10 modelos, datasource SIN url
│
├── scripts/
│   ├── seed.ts                   ← Usuarios dev, niveles, materias, asignaciones
│   └── check-db.ts               ← Verifica conectividad
│
└── src/
    ├── auth.ts                   ← CredentialsProvider (dev) — JWT strategy
    ├── proxy.ts                  ← Protección de rutas (Edge Runtime) ← OJO: proxy, no middleware
    │
    ├── app/
    │   ├── globals.css           ← Design tokens inline + @theme inline
    │   ├── (auth)/login/
    │   │   ├── layout.tsx
    │   │   └── page.tsx          ← Form email/password → Server Action
    │   ├── (teacher)/teacher/
    │   │   ├── layout.tsx        ← TopBar con nombre, avatar, botón Salir
    │   │   ├── year/page.tsx     ← Lista años lectivos desde BD ✅ Fase 3A
    │   │   ├── empty/page.tsx    ← Mensaje sin asignaciones
    │   │   ├── [yearId]/period/page.tsx           ← Lista quimestres ✅ Fase 3A
    │   │   ├── [yearId]/[periodId]/subjects/page.tsx  ← Materias + estado ✅ Fase 3A
    │   │   └── [yearId]/[periodId]/planification/[planId]/
    │   │       ├── page.tsx      ← Editor PUM (tabla editable) ✅ Fase 3B
    │   │       ├── actions.ts    ← Server Actions: saveRowsAction, finalizeAction
    │   │       └── preview/page.tsx  ← Vista previa imprimible ✅ Fase 3C
    │   └── api/
    │       ├── auth/[...nextauth]/route.ts
    │       └── export/[planId]/route.ts  ← GET ?format=docx ✅ Fase 3C
    │
    ├── components/
    │   ├── layout/
    │   │   └── BreadcrumbPUM.tsx          ← Breadcrumb ✅ Fase 3A
    │   └── planification/
    │       ├── PlanificationTable.tsx     ← Tabla editable + selector íconos ✅ Fase 3B
    │       └── ExportMenu.tsx             ← Botones Word + Imprimir ✅ Fase 3C
    │
    ├── modules/
    │   ├── planification/
    │   │   ├── planification.types.ts    ← YearSummary, PeriodSummary, SubjectWithStatus ✅
    │   │   ├── planification.schema.ts   ← Zod schemas (Zod v4 corregido)
    │   │   ├── planification.domain.ts   ← assertCanEdit, assertCanFinalize (puro)
    │   │   └── planification.service.ts  ← Todos los métodos implementados ✅
    │   └── export/
    │       ├── export.types.ts
    │       ├── export.service.ts         ← build() implementado ✅ Fase 3C
    │       └── docx-builder.ts           ← Genera DOCX en memoria ✅ Fase 3C
    │
    ├── lib/
    │   ├── prisma/client.ts      ← Singleton con PrismaPg adapter
    │   ├── errors/               ← AppError, ErrorCode, error-handler
    │   └── logger/               ← PumLogger JSON (console.log, Edge-compatible)
    │
    ├── config/
    │   ├── app.config.ts         ← institutionName, paths
    │   └── ...
    │
    ├── constants/
    │   ├── routes.ts             ← ROUTES tipadas (funciones para rutas dinámicas)
    │   └── planification.ts      ← PUM_COLUMNS, MAX_PUM_ROWS, estados
    │
    └── types/
        ├── index.ts              ← ActionResult<T>, SessionUser, IDs tipados
        └── next-auth.d.ts        ← Augmentation: id, role en Session/JWT
```

---

## CREDENCIALES DE DESARROLLO

```
Login URL: http://localhost:3000/login

Docente de prueba:
  Email:    docente@test.com
  Password: docente123
  ID en BD: teacher-dev-1
  Rol:      TEACHER
  → Accede a /teacher/*

Administrador:
  Email:    admin@test.com
  Password: admin123
  ID en BD: admin-dev-1
  Rol:      ADMIN
  → Accede a /admin/*
```

**IMPORTANTE**: Las contraseñas están hardcodeadas en `src/auth.ts` (CredentialsProvider). No hay hashing. Estos usuarios también existen en la tabla `users` de BD (los crea `npm run db:seed`). FK de `TeacherAssignment` apunta a estos IDs.

---

## DATOS SEED (estado actual de la BD)

El seed carga:
- **13 niveles**: 1ro–10mo de Básica + 1ro–3ro de Bachillerato
- **Año lectivo**: 2026-2027 (activo)
- **Períodos**: Primer Quimestre, Segundo Quimestre
- **Materias**: Matemáticas, Lengua y Literatura, Ciencias Naturales, Historia y Ciencias Sociales, Inglés, Educación Física
- **Asignaciones del docente de prueba** (teacher-dev-1):
  - Matemáticas → 8vo de Básica
  - Matemáticas → 9no de Básica
  - Lengua y Literatura → 8vo de Básica
  - Ciencias Naturales → 1ro de Bachillerato

---

## FLUJO DOCENTE COMPLETO (Fase 3)

```
/login
  ↓ (credenciales dev)
/teacher/year
  → Lista años lectivos con conteo de asignaciones
  ↓ (clic en año)
/teacher/[yearId]/period
  → Lista quimestres con barra de progreso de finalizadas
  ↓ (clic en quimestre)
/teacher/[yearId]/[periodId]/subjects
  → Lista materias con badge de estado (Sin comenzar / En progreso / Finalizado / Plazo vencido)
  → "Crear PUM" → crea en BD, redirige al editor
  → "Editar PUM" → va al editor existente
  ↓
/teacher/[yearId]/[periodId]/planification/[planId]
  → Tabla editable: DCD | Indicador | Metodología | Recursos | Evaluación
  → Selector de íconos pedagógicos (8 presets) en columna Metodología
  → Botones: Guardar (Server Action) / Finalizar PUM (diálogo confirmación)
  → Links: Vista previa / Descargar Word / ← Mis materias
  ↓
/teacher/[yearId]/[periodId]/planification/[planId]/preview
  → Vista previa imprimible del documento
  → Botón "Descargar Word" → GET /api/export/[planId]?format=docx
  → Botón "Imprimir / PDF" → window.print()
```

---

## RUTAS TIPADAS (src/constants/routes.ts)

```typescript
export const ROUTES = {
  LOGIN: "/login",
  TEACHER: {
    ROOT: "/teacher",
    YEAR: "/teacher/year",
    period:         (yearId: string) => `/teacher/${yearId}/period`,
    subjects:       (yearId: string, periodId: string) => `/teacher/${yearId}/${periodId}/subjects`,
    planification:  (yearId: string, periodId: string, planId: string) => `/teacher/${yearId}/${periodId}/planification/${planId}`,
    preview:        (yearId: string, periodId: string, planId: string) => `/teacher/${yearId}/${periodId}/planification/${planId}/preview`,
  },
  ADMIN: { ROOT: "/admin", DASHBOARD: "/admin/dashboard", ... },
  API: { EXPORT: (planId: string, format: string) => `/api/export/${planId}?format=${format}` }
}
```

---

## SERVICIO DE PLANIFICACIÓN (src/modules/planification/planification.service.ts)

Métodos implementados:
- `getYearsForTeacher(teacherId)` → `YearSummary[]`
- `getPeriodsForYear(teacherId, yearId)` → `PeriodSummary[]`
- `getSubjectsWithStatus(teacherId, yearId, periodId)` → `SubjectWithStatus[]`
- `getOrCreatePlanification(teacherId, yearId, periodId, subjectId, levelId)` → `planId string`
- `getById(planId, teacherId)` → `Planification` (con todas las filas)
- `saveRows(input, teacherId)` → `void` (transacción: delete all + createMany)
- `finalize(input, teacherId)` → `void` (status FINALIZED, finalizedAt = now)
- `listForTeacher` → NOT_IMPLEMENTED (Fase 3C placeholder)
- `cloneFromPrevious` → NOT_IMPLEMENTED (Fase 4)

---

## EXPORT SERVICE (src/modules/export/)

```
docx-builder.ts    → DocxBuilder.build(plan, ctx) → Buffer
                     Genera tabla PUM con header azul, filas alternadas, íconos como texto
export.service.ts  → ExportService.build({ planificationId, format }, teacherId) → ExportResult
                     Carga contexto (subject, level, year, period, teacher) y llama DocxBuilder
route.ts           → GET /api/export/[planId]?format=docx
                     Valida sesión → llama ExportService → responde con Content-Disposition: attachment
```

**PDF**: No se genera en servidor. Se usa `window.print()` desde la página preview (el usuario guarda como PDF desde el navegador).

---

## REGLAS DE NEGOCIO

1. **Una PUM por combinación**: `@@unique([teacherId, academicYearId, periodId, subjectId, levelId])`
2. **Máximo 50 filas por PUM**: Validado en Zod schema (`MAX_PUM_ROWS = 50`)
3. **Estados**: DRAFT → FINALIZED (no reversible). OVERDUE = visual (deadline pasado en DRAFT)
4. **Solo el dueño puede editar**: `assertCanEdit` verifica `plan.teacherId === teacherId`
5. **Para finalizar**: Al menos una fila con todas las columnas llenas (`assertCanFinalize`)
6. **Edge Runtime (proxy.ts)**: NO puede importar Prisma — solo JWT. NO `process.stdout.write`
7. **Export on-demand**: DOCX generado en memoria, nunca persiste en disco/BD

---

## VARIABLES DE ENTORNO

**`.env`** (solo para Prisma CLI — NO para Next.js):
```
DATABASE_URL="postgresql://postgres:567980@localhost:5432/pum_web"
```

**`.env.local`** (para Next.js runtime):
```
DATABASE_URL="postgresql://postgres:567980@localhost:5432/pum_web"
AUTH_SECRET="cadena-aleatoria-larga-minimo-32-chars"
NEXTAUTH_URL="http://localhost:3000"
INSTITUTION_NAME="Unidad Educativa Técnico Salesiano"
ALLOWED_EMAIL_DOMAIN=""
LOG_LEVEL="info"
```
**GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET** no son necesarios aún (CredentialsProvider temporal).

---

## ESTADO ACTUAL POR FASE

### ✅ Fase 1 — Scaffold y Arquitectura Base (COMPLETA)
Estructura, errores, logger, Prisma client, config, constantes, módulos skeleton, domain rules, Zod schemas, design tokens, scripts.

### ✅ Fase 2 — Autenticación y Schema (COMPLETA)
Schema Prisma completo (10 modelos), Auth.js v5 con CredentialsProvider (dev temporal), proxy.ts (Edge Runtime), login page, teacher layout con TopBar, seed con niveles y año lectivo.

### ✅ Fase 3A — Wizard de Navegación (COMPLETA)
- seed.ts actualizado: usuarios dev, materias, asignaciones
- Tipos: YearSummary, PeriodSummary, SubjectWithStatus, DisplayStatus
- Service: getYearsForTeacher, getPeriodsForYear, getSubjectsWithStatus, getOrCreatePlanification
- BreadcrumbPUM component
- Páginas: year, [yearId]/period, [yearId]/[periodId]/subjects

### ✅ Fase 3B — Editor PUM (COMPLETA)
- Service: getById, saveRows (con $transaction), finalize
- actions.ts: saveRowsAction, finalizeAction (Server Actions)
- PlanificationTable (Client Component): tabla editable, auto-resize textareas, selector 8 íconos metodología, agregar/quitar filas, Guardar, Finalizar con diálogo
- Editor page: carga datos reales, muestra estado, aviso plazo, links a preview y export

### ✅ Fase 3C — Export y Preview (COMPLETA)
- docx-builder.ts: genera DOCX en memoria con header azul, metadatos, tabla completa
- export.service.ts: build() implementado
- GET /api/export/[planId]?format=docx
- ExportMenu component (fetch + descarga programática + window.print)
- Preview page: tabla imprimible, estilos @media print, links descarga e impresión

### 📋 Fase 4 — Panel Administrador + FTP (PENDIENTE)
- `/admin/dashboard` — resumen del estado
- `/admin/assignments` — gestión de asignaciones docentes
- `/admin/catalog` — gestión de materias, niveles, años lectivos
- `/admin/deadlines` — configurar plazos por materia/nivel
- FTP push al NAS
- Export masivo ZIP

### 📋 Fase 5 — Calidad, Tests E2E, Producción (PENDIENTE)
- Google OAuth (reemplazar CredentialsProvider)
- E2E tests con Playwright
- Docker + deploy

---

## CÓMO CONTINUAR EN UN NUEVO CHAT

1. Pega este archivo como primer mensaje
2. Di: `"continúa con la fase 4"` o `"continúa con [tarea específica]"`

**Para levantar el proyecto desde cero:**
```powershell
# 1. Agregar PostgreSQL al PATH (si no está ya)
$env:PATH += ";C:\Program Files\PostgreSQL\18\bin"

# 2. Ir al proyecto
cd "c:\Users\Usuario\Desktop\PROYECTOS_2026\SISTEMA INSTITUCIONAL MODULOS\MODULO DE SILABOS\pum-web"

# 3. Iniciar servidor (las tablas y datos ya existen)
npm run dev
# → http://localhost:3000
# → Login: docente@test.com / docente123
```

**Si la BD no tiene datos:**
```powershell
npm run db:push    # crear/actualizar tablas
npm run db:seed    # cargar datos
npm run dev
```
