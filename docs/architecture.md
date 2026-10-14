# Arquitectura — PUM Web

**Última actualización:** 2026-10-14

## Visión general

Aplicación web institucional de una sola sede. Los docentes completan las
planificaciones unitarias de módulo (PUM); el coordinador de área las revisa y
la administración las firma. Los documentos Word/PDF se generan bajo demanda
desde los datos.

## Principios

| Principio | Implementación |
|---|---|
| Solo datos en la BD | PostgreSQL guarda información estructurada, nunca archivos |
| Exportación bajo demanda | DOCX/PDF/ZIP se generan al pedirlos (ADR 0003) |
| Cuentas institucionales | Usuario y contraseña creados por Admin/SuperAdmin (ADR 0008) |
| Estados explícitos | El ciclo del PUM es una máquina de estados con transiciones verificadas en la BD |

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Lenguaje | TypeScript estricto |
| ORM | Prisma 7 con `@prisma/adapter-pg` |
| Base de datos | PostgreSQL 15+ |
| Autenticación | Auth.js v5 (credenciales, sesión JWT) |
| Validación | Zod 4 |
| UI | Tailwind CSS 4 |
| Documentos | `docx` (Word), `@react-pdf/renderer` (PDF), `archiver` (ZIP), `exceljs` (Excel) |
| Pruebas | Vitest (unitarias e integración), Playwright (E2E) |

## Capas

```
src/app/         Páginas, server actions y route handlers (por rol: (teacher), (coordinator), (admin), (superadmin))
src/components/  Componentes React; 'use client' solo en componentes hoja
src/modules/     Lógica de negocio por módulo: *.service.ts, *.domain.ts, *.schema.ts, *.types.ts
src/lib/         Infraestructura: cliente Prisma, errores, logger, sesión, validación
src/constants/   Constantes de dominio (rutas, estados, secciones de revisión)
src/proxy.ts     Proxy de Next.js: autenticación por ruta, CSP con nonce, redirecciones por rol
prisma/          Esquema y migraciones
```

Las acciones del servidor (`actions.ts`) validan la sesión con
`requireActiveSession()`, validan la entrada con Zod y delegan en los
servicios. Los servicios verifican de nuevo el acceso al recurso (por ejemplo,
que el coordinador tenga asignado ese PUM).

## Ciclo de vida del PUM

```
DRAFT ─▶ FINALIZED ─▶ APPROVED ─▶ PENDING_SIGNATURE ─▶ SIGNED
           ▲   │                        ▲     │
           │   ▼                        │     ▼
     FEEDBACK_RECEIVED ◀────────── ADMIN_REJECTED
```

- El mapa de transiciones es `PLAN_TRANSITIONS` en
  `modules/planification/planification.domain.ts`.
- Todo cambio de estado pasa por `transitionPlan()`
  (`planification.transitions.ts`): verifica el estado de origen en el mismo
  `UPDATE` y registra la auditoría en la misma transacción.
- El docente solo edita en `DRAFT` (dentro del plazo) o `FEEDBACK_RECEIVED`;
  la condición se revalida dentro del `UPDATE` que guarda.
- SuperAdmin puede corregir el estado fuera del mapa (`correctPlanStatus`),
  con motivo obligatorio y auditoría.

## Módulos principales

| Módulo | Responsabilidad |
|---|---|
| `planification` | PUM del docente: creación, guardado, finalización, vínculos docente↔PUM |
| `coordinator` | Bandeja y revisión por secciones, retroalimentación, aprobación, envío a firma |
| `admin` | `admin-catalog`, `admin-assignments`, `admin-users`, `admin-signature` |
| `superadmin` | Usuarios, correcciones de PUM, panel del sistema |
| `users` | Alta y restablecimiento de contraseñas compartidos (contraseñas temporales) |
| `audit` | Historial de cada PUM y auditoría de usuarios |
| `export` | DOCX, PDF y ZIP en streaming |
| `security` | Límite de intentos (rate limiting en PostgreSQL), contraseñas temporales |
| `system` | Modo mantenimiento y limpieza diaria de registros (`instrumentation.ts`) |

## Archivos relacionados

- `docs/database.md` — modelo de datos y migraciones
- `docs/authentication.md` — login, sesión y roles
- `docs/export-service.md` — exportación
- `docs/deployment.md` — despliegue
- `docs/adr/` — decisiones de arquitectura
