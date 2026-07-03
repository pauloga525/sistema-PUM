# Changelog — PUM Web

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [0.1.0] — 2026-06-15

### Agregado — Fase 1: Scaffold y Arquitectura Base

#### Infraestructura del proyecto
- Scaffold Next.js 16.x con TypeScript strict, Tailwind CSS v4, App Router y `src/` dir
- Inicialización de shadcn/ui con configuración por defecto
- Instalación de dependencias: zod, next-auth v5 beta, prisma, @prisma/client, archiver, basic-ftp, bull, ioredis, tsx

#### Design System
- `packages/design-tokens/tokens.css` — Variables CSS institucionales (colores, tipografía, espaciado, layout)
- `packages/design-tokens/tailwind-preset.js` — Preset Tailwind con clases `pum-*`
- Import de tokens en `src/app/globals.css`

#### Infraestructura de errores
- `src/lib/errors/error-codes.ts` — Enum `ErrorCode` con 30+ códigos categorizados + mapa HTTP status
- `src/lib/errors/app-error.ts` — Clases `AppError` y `ValidationError` con serialización segura al cliente
- `src/lib/errors/error-handler.ts` — `handleApiError()` y `withErrorHandling()` para rutas y Server Actions

#### Sistema de logging
- `src/lib/logger/logger.types.ts` — Interfaz `ILogger`, tipos `LogLevel`, `LogEntry`, `LogContext`
- `src/lib/logger/logger.ts` — Logger JSON estructurado con niveles, filtrado por env var, método `child()`

#### Prisma
- `src/lib/prisma/client.ts` — Singleton del cliente Prisma compatible con hot-reload de Next.js

#### Configuración global
- `src/config/app.config.ts` — Variables de entorno tipadas (nombre institución, rutas de assets, export)
- `src/config/auth.config.ts` — Configuración OAuth (Google client, dominio permitido, sesión TTL)
- `src/config/export.config.ts` — Configuración FTP/NAS, rutas de plantilla y patrón de nombres de archivo

#### Constantes globales
- `src/constants/routes.ts` — Rutas tipadas como funciones (evita strings duplicados)
- `src/constants/planification.ts` — Estados PUM, columnas de tabla, formatos de export
- `src/constants/levels.ts` — Tracks de nivel educativo, roles de usuario

#### Tipos globales
- `src/types/index.ts` — `ActionResult<T>`, `SessionUser`, `PaginatedResult`, IDs tipados

#### Módulos funcionales (skeletons)
- `src/modules/auth/auth.types.ts` y `auth.guards.ts` — Guards `requireAuth`, `requireRole`
- `src/modules/planification/planification.types.ts` — Tipos Planification, PlanificationRow
- `src/modules/planification/planification.schema.ts` — Schemas Zod para guardar y finalizar PUM
- `src/modules/planification/planification.domain.ts` — Reglas de negocio puras (assertCanEdit, assertCanFinalize)
- `src/modules/planification/planification.service.ts` — Servicio skeleton con firmas correctas
- `src/modules/export/export.types.ts` y `export.service.ts` — Skeleton export
- `src/modules/ftp/ftp.types.ts` y `ftp.service.ts` — Skeleton FTP
- `src/modules/admin/admin.service.ts` — Skeleton admin

#### Scripts administrativos
- `scripts/seed.ts` — Datos iniciales (niveles educativos, año lectivo)
- `scripts/clean-temp.ts` — Limpieza de archivos temporales expirados
- `scripts/check-db.ts` — Verificación de conectividad PostgreSQL
- Scripts en `package.json`: `db:seed`, `db:check`, `db:push`, `db:migrate`, `db:studio`, `clean:temp`, `prisma:generate`

#### Configuración del proyecto
- `next.config.ts` — Headers de seguridad HTTP, configuración de imágenes, runtime config
- `.env.example` — Documentación completa de variables de entorno requeridas
- Estructura de 40 carpetas del proyecto creadas

#### Documentación técnica
- `docs/architecture.md` — Arquitectura general, stack, patrones
- `docs/database.md` — Modelo de datos, índices, scripts
- `docs/authentication.md` — Flujo OAuth, roles, guards
- `docs/export-service.md` — Pipeline de exportación
- `docs/adr/0001` a `0007` — Architecture Decision Records
- `docs/PROJECT_MAP.md` — Mapa completo de archivos, propósito y dependencias
- `CHANGELOG.md` — Este archivo
- `ROADMAP.md` — Estado del proyecto por fase

---

---

## [0.2.0] — 2026-06-15

### Agregado — Fase 2: Autenticación y Prisma Schema

#### Base de datos
- `prisma/schema.prisma` — Schema completo con 10 modelos: User, Account, Session, VerificationToken (Auth.js), AcademicYear, Period, Subject, Level, TeacherAssignment, Planification, PlanificationRow
- Índices de performance: planificación única por combinación, asignaciones por docente/año, filas por planificación
- `scripts/seed.ts` — Actualizado con upserts Prisma reales: 13 niveles educativos, año lectivo, 2 quimestres

#### Autenticación Auth.js v5
- `src/auth.ts` — Configuración completa: Google OAuth, PrismaAdapter, JWT strategy, callbacks signIn/jwt/session
- `src/app/api/auth/[...nextauth]/route.ts` — Handler que captura todos los sub-paths de Auth.js
- `src/middleware.ts` — Protección de rutas en Edge Runtime: /teacher/* y /admin/* requieren sesión
- Restricción de dominio institucional vía `ALLOWED_EMAIL_DOMAIN` (callback signIn)
- Redirect automático según rol (TEACHER → /teacher/year, ADMIN → /admin/dashboard)

#### Tipos TypeScript
- `src/types/next-auth.d.ts` — Module augmentation: agrega `id` y `role` a Session, User y JWT de Auth.js

#### Páginas y layouts
- `src/app/(auth)/login/layout.tsx` — Layout centrado para páginas de autenticación
- `src/app/(auth)/login/page.tsx` — Login con Server Action para signIn, manejo de errores OAuth en español
- `src/app/(teacher)/teacher/layout.tsx` — TopBar con avatar Google, nombre, email, botón de logout
- `src/app/(teacher)/teacher/year/page.tsx` — Placeholder que confirma sesión autenticada (reemplazado en Fase 3)
- `src/app/(teacher)/teacher/empty/page.tsx` — Estado "sin asignaciones" con mensaje institucional

#### Actualizaciones de archivos existentes
- `src/app/page.tsx` — Reemplaza boilerplate por redirect inteligente según sesión y rol
- `src/app/layout.tsx` — Inter en lugar de Geist, metadata institucional, lang="es", robots noindex
- `src/modules/auth/auth.types.ts` — Tipos actualizados: JwtPayload, GoogleProfile con hd field

#### Prototipo HTML
- `design-prototype/index.html` — Índice navegable del prototipo con estado de avance por pantalla
- `design-prototype/pages/auth/login.html` — Login con 3 variantes: normal, error OAuth, dominio inválido
