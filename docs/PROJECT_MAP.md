# PROJECT_MAP — PUM Web

**Última actualización:** 2026-06-15 (Fase 2)
**Versión del proyecto:** 0.2.0

> Este documento registra cada archivo del proyecto: su propósito, dependencias y módulos que lo utilizan.
> Se actualiza obligatoriamente en cada iteración del desarrollo.

---

## Raíz del proyecto

| Archivo | Propósito | Utilizado por |
|---------|-----------|---------------|
| `next.config.ts` | Configuración Next.js: imágenes, headers seguridad, runtime config | Build system |
| `tailwind.config.ts` | Configuración Tailwind CSS | Todos los componentes |
| `tsconfig.json` | Configuración TypeScript con paths (`@/*`) | Compilador TS |
| `package.json` | Dependencias y scripts del proyecto | npm |
| `postcss.config.mjs` | Procesador CSS (Tailwind v4) | Build system |
| `eslint.config.mjs` | Reglas de linting | CI y editor |
| `.env.example` | Documentación de variables de entorno | Desarrolladores |
| `components.json` | Configuración shadcn/ui | CLI shadcn |
| `CHANGELOG.md` | Historial de cambios por versión | Equipo |
| `ROADMAP.md` | Estado del desarrollo por fase | Equipo |
| `codes.md` | ✅ NUEVO: Todos los comandos del proyecto (setup, BD, npm scripts, troubleshooting) | Desarrolladores |
| `prompt.md` | ✅ NUEVO: Contexto completo del proyecto para continuar en un nuevo chat de Claude | Claude / Desarrolladores |

---

## packages/

### design-tokens/

| Archivo | Propósito | Utilizado por |
|---------|-----------|---------------|
| `tokens.css` | Variables CSS del design system (colores, tipografía, espaciado) | `src/app/globals.css`, `design-prototype/` |
| `tailwind-preset.js` | Clases Tailwind `pum-*` que referencian variables CSS | `tailwind.config.ts` |

---

## prisma/ ✅ NUEVO EN FASE 2

| Archivo | Propósito | Utilizado por |
|---------|-----------|---------------|
| `schema.prisma` | Modelo completo: User, Account, Session, AcademicYear, Period, Subject, Level, TeacherAssignment, Planification, PlanificationRow | Prisma CLI, Prisma Client |
| `migrations/` | Historial de migraciones SQL | Prisma CLI |
| `seed.ts` | ✅ ACTUALIZADO: Carga niveles, año lectivo, períodos con upsert real | `npm run db:seed` |

---

## scripts/

| Archivo | Propósito | Utilizado por |
|---------|-----------|---------------|
| `seed.ts` | ✅ ACTUALIZADO: Prisma upserts reales (niveles, año, períodos) | `npm run db:seed` |
| `clean-temp.ts` | Elimina archivos temporales expirados | `npm run clean:temp`, cron |
| `check-db.ts` | Verifica conectividad PostgreSQL | `npm run db:check` |

---

## src/app/

| Archivo/Carpeta | Propósito | Estado | Utilizado por |
|---------|-----------|--------|---------------|
| `layout.tsx` | ✅ ACTUALIZADO: Root layout con Inter, metadata institucional, lang=es | Todas las páginas |
| `page.tsx` | ✅ ACTUALIZADO: Redirect a /login o /teacher/year según sesión | Browser |
| `globals.css` | Estilos globales + design tokens + shadcn | Layout raíz |
| `(auth)/login/layout.tsx` | ✅ NUEVO: Layout centrado para páginas de autenticación | Login page |
| `(auth)/login/page.tsx` | ✅ NUEVO: Login con Google (Server Component + Server Action) | Docentes, Admins |
| `(teacher)/teacher/layout.tsx` | ✅ NUEVO: TopBar con avatar, nombre, botón logout | Páginas docente |
| `(teacher)/teacher/year/page.tsx` | ✅ NUEVO: Placeholder — muestra sesión confirmada | Docentes autenticados |
| `(teacher)/teacher/empty/page.tsx` | ✅ NUEVO: Sin asignaciones — mensaje al docente | Docentes sin asignaciones |
| `(admin)/admin/` | Panel admin — carpetas creadas | 📋 Fase 4 |
| `api/auth/[...nextauth]/route.ts` | ✅ NUEVO: Handler de Auth.js (GET, POST) | Auth.js runtime |
| `api/export/[planId]/route.ts` | Endpoint de exportación Word/PDF | 📋 Fase 3 |
| `error.tsx` | Página de error global | 📋 Fase 5 |
| `not-found.tsx` | Página 404 | 📋 Fase 5 |

---

## src/auth.ts ✅ NUEVO EN FASE 2

| Archivo | Propósito | Dependencias | Utilizado por |
|---------|-----------|--------------|---------------|
| `src/auth.ts` | Configuración central Auth.js v5: Google provider, PrismaAdapter, callbacks JWT/session/signIn | `next-auth`, `@auth/prisma-adapter`, `@/lib/prisma/client` | Route handler, middleware, Server Components |

---

## src/middleware.ts ✅ NUEVO EN FASE 2

| Archivo | Propósito | Dependencias | Utilizado por |
|---------|-----------|--------------|---------------|
| `src/middleware.ts` | Protección de rutas en Edge Runtime — redirige a /login si no hay sesión, protege /admin para rol ADMIN | `@/auth` | Next.js runtime (cada request) |

---

## src/components/

### ui/
| Archivo | Propósito |
|---------|-----------|
| `button.tsx` | Componente Button de shadcn/ui |

### layout/ — 📋 Fase 3 (AppShell, BreadcrumbPUM, AdminSidebar)
### planification/ — 📋 Fase 3
### admin/ — 📋 Fase 4
### shared/ — 📋 Fase 3

---

## src/modules/

### auth/
| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `auth.types.ts` | ✅ ACTUALIZADO: GoogleProfile, DomainCheckResult, JwtPayload | Módulo auth |
| `auth.guards.ts` | `requireAuth()`, `requireRole()`, `checkEmailDomain()` | Servicios |

### planification/
| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `planification.types.ts` | Tipos Planification, PlanificationRow | ✅ Fase 1 |
| `planification.schema.ts` | Zod schemas para SaveRows y Finalize | ✅ Fase 1 |
| `planification.domain.ts` | Reglas puras: assertCanEdit, assertCanFinalize | ✅ Fase 1 |
| `planification.service.ts` | Skeleton — se implementa en Fase 3 | 🦴 |

### export/ — 🦴 Skeleton (Fase 3)
### ftp/ — 🦴 Skeleton (Fase 4)
### admin/ — 🦴 Skeleton (Fase 4)

---

## src/lib/

### prisma/
| Archivo | Propósito |
|---------|-----------|
| `client.ts` | Singleton PrismaClient — evita múltiples conexiones en HMR |

### errors/
| Archivo | Propósito |
|---------|-----------|
| `error-codes.ts` | Enum ErrorCode (30+ códigos) + mapa HTTP status |
| `app-error.ts` | AppError, ValidationError con serialización segura al cliente |
| `error-handler.ts` | handleApiError() y withErrorHandling() |

### logger/
| Archivo | Propósito |
|---------|-----------|
| `logger.types.ts` | ILogger, LogEntry, LogLevel, LogContext |
| `logger.ts` | Logger JSON estructurado con niveles y child() |

---

## src/config/
| Archivo | Propósito |
|---------|-----------|
| `app.config.ts` | Config general (institutionName, paths, debug) |
| `auth.config.ts` | Config OAuth (Google client, dominio, TTL sesión) |
| `export.config.ts` | Config FTP/NAS, rutas de assets, patrón de archivos |

---

## src/constants/
| Archivo | Propósito |
|---------|-----------|
| `routes.ts` | Rutas tipadas como funciones |
| `planification.ts` | Estados PUM, columnas, formatos de export |
| `levels.ts` | Tracks educativos, roles de usuario |

---

## src/types/
| Archivo | Propósito |
|---------|-----------|
| `index.ts` | ActionResult, SessionUser, IDs tipados, Pagination |
| `next-auth.d.ts` | ✅ NUEVO: Module augmentation — agrega id y role a Session/User/JWT |

---

## design-prototype/ ✅ ACTUALIZADO EN FASE 2

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `index.html` | ✅ NUEVO: Índice navegable del prototipo HTML | ✅ |
| `pages/auth/login.html` | ✅ NUEVO: Login con 3 variantes (?state=normal/error/domain) | ✅ |
| `pages/teacher/` | Páginas del flujo docente | 📋 Fase 3 |
| `pages/admin/` | Páginas del panel admin | 📋 Fase 4 |

---

## docs/

| Archivo | Propósito |
|---------|-----------|
| `PROJECT_MAP.md` | Este documento |
| `architecture.md` | Arquitectura general, stack, patrones |
| `database.md` | Modelo de datos, índices, scripts BD |
| `authentication.md` | Flujo OAuth, roles, guards |
| `export-service.md` | Pipeline de exportación |
| `adr/0001-0007` | Decisiones de arquitectura justificadas |

---

## Leyenda de estado

| Estado | Significado |
|--------|-------------|
| ✅ | Implementado y funcional |
| ✅ NUEVO | Agregado en Fase 2 |
| ✅ ACTUALIZADO | Modificado en Fase 2 |
| 🦴 Skeleton | Estructura creada, implementación en fase posterior |
| 📋 Fase N | Previsto para la fase indicada |

---

## Estado por módulo (Fase 2)

| Módulo/Archivo | Estado |
|----------------|--------|
| Prisma schema | ✅ |
| Auth.js (src/auth.ts) | ✅ |
| Middleware de rutas | ✅ |
| Login page (HTML + Next.js) | ✅ |
| Teacher layout | ✅ |
| Year placeholder | ✅ |
| Empty state | ✅ |
| Root page redirect | ✅ |
| Tipos next-auth | ✅ |
| Seed con Prisma real | ✅ |
| Flujo docente completo | 📋 Fase 3 |
| Editor PUM | 📋 Fase 3 |
| Export | 📋 Fase 3 |
| Panel admin | 📋 Fase 4 |
| FTP/NAS | 📋 Fase 4 |
