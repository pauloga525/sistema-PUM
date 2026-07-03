# Arquitectura — PUM Web

**Última actualización:** 2026-06-15 (Fase 1)

## Visión general

PUM Web es una aplicación web institucional de única sede que permite a los docentes completar planificaciones unitarias de módulo (PUM) y exportarlas como Word/PDF idénticos a la plantilla oficial del colegio.

## Principios fundamentales

| Principio | Implementación |
|---|---|
| Solo datos en BD | PostgreSQL almacena únicamente información estructurada, nunca archivos |
| Export on-demand | Los documentos se generan en tiempo real desde la plantilla + datos actuales |
| Autenticación institucional | Google OAuth restringido al dominio del colegio |
| Jerarquía siempre visible | Año → Período → Materia + Nivel en toda la UI |

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | 16.x |
| Lenguaje | TypeScript strict | 5.x |
| ORM | Prisma | 7.x |
| Base de datos | PostgreSQL | 15+ |
| Autenticación | Auth.js v5 | beta |
| Validación | Zod | 4.x |
| UI Components | shadcn/ui + Tailwind CSS | 4.x |
| Export Word | (Implementar en Fase 3) | — |
| Export PDF | (Implementar en Fase 3) | — |
| FTP | basic-ftp | 6.x |
| Jobs async | BullMQ + Redis | (Fase 4) |

## Capas de la aplicación

```
┌─────────────────────────────────────────────┐
│  Capa de Presentación                        │
│  src/app/         → Páginas y API routes     │
│  src/components/  → Componentes React        │
├─────────────────────────────────────────────┤
│  Capa de Módulos (Feature Modules)           │
│  src/modules/     → Servicios, DTOs, schemas │
├─────────────────────────────────────────────┤
│  Capa de Infraestructura                     │
│  src/lib/         → Prisma, logger, errors   │
│  src/config/      → Configuración env vars   │
├─────────────────────────────────────────────┤
│  Persistencia                                │
│  PostgreSQL       → Solo datos estructurados │
│  /assets/         → Plantilla Word + PNGs    │
└─────────────────────────────────────────────┘
```

## Estructura de carpetas

```
pum-web/
├── packages/design-tokens/     # CSS variables + Tailwind preset compartidos
├── docs/                       # Documentación técnica
│   ├── adr/                    # Architecture Decision Records
│   └── mockups/                # Capturas de pantalla de referencia
├── design-prototype/           # Prototipo HTML puro (Track D)
├── prisma/                     # Schema y migraciones de base de datos
├── scripts/                    # Scripts administrativos
└── src/
    ├── app/                    # Next.js App Router (rutas y pages)
    ├── components/             # Componentes React reutilizables
    │   ├── ui/                 # shadcn/ui
    │   ├── layout/             # AppShell, Breadcrumb, Sidebar
    │   ├── planification/      # Tabla PUM, Editor Metodología
    │   └── shared/             # StatusBadge, DeadlineBanner
    ├── modules/                # Feature modules
    │   ├── auth/               # Autenticación y autorización
    │   ├── planification/      # Gestión de PUM
    │   ├── export/             # Generación de documentos
    │   ├── ftp/                # Transferencia al NAS
    │   └── admin/              # Panel de administración
    ├── lib/                    # Infraestructura compartida
    │   ├── prisma/             # Cliente singleton de Prisma
    │   ├── errors/             # AppError, ErrorCode, errorHandler
    │   └── logger/             # Logger estructurado
    ├── config/                 # Configuración (env vars tipadas)
    ├── constants/              # Constantes de dominio
    └── types/                  # Tipos globales compartidos
```

## Patrones de diseño

| Patrón | Ubicación | Propósito |
|---|---|---|
| Singleton | `lib/prisma/client.ts` | Una conexión a BD por proceso |
| Service Layer | `modules/*/` `*.service.ts` | Lógica de negocio separada de rutas |
| Domain Model | `modules/planification/planification.domain.ts` | Reglas puras sin I/O |
| Builder | `modules/export/` (Fase 3) | Construcción de documentos por pasos |
| Strategy | `ExportService` (Fase 3) | DOCX, PDF o ZIP según solicitud |
| Guard/Middleware | `modules/auth/auth.guards.ts` | Autorización declarativa |

## Flujo de datos (guardar planificación)

```
Browser → Server Action → Zod.parse() → assertCanEdit() → PlanificationService.saveRows() → Prisma → PostgreSQL
```

## Flujo de exportación

```
Browser → GET /api/export/:planId → ExportService.build() → DocxBuilder → Buffer → Response stream
```

## Archivos relacionados

- `docs/adr/` — Decisiones de arquitectura con justificación
- `docs/database.md` — Modelo de datos detallado
- `docs/authentication.md` — Flujo OAuth y guards
- `docs/export-service.md` — Pipeline de exportación
