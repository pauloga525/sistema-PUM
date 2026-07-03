# Roadmap — PUM Web

**Última actualización:** 2026-06-15

---

## Leyenda

| Símbolo | Estado |
|---------|--------|
| ✅ | Completado |
| 🔄 | En desarrollo |
| 📋 | Pendiente |
| ⛔ | Bloqueado |

---

## Fase 1 — Scaffold y Arquitectura Base ✅

**Objetivo:** Establecer la estructura del proyecto, infraestructura de errores, logging, módulos skeleton y documentación.

| Tarea | Estado |
|-------|--------|
| Scaffold Next.js 16 con TypeScript, Tailwind, App Router | ✅ |
| Instalación de dependencias (zod, prisma, auth.js, etc.) | ✅ |
| Inicialización shadcn/ui | ✅ |
| Estructura completa de carpetas (40 dirs) | ✅ |
| Sistema de errores centralizado (AppError, ErrorCode, errorHandler) | ✅ |
| Logger estructurado JSON con niveles y child() | ✅ |
| Cliente Prisma singleton | ✅ |
| Configuración global (app, auth, export) | ✅ |
| Constantes globales (routes, planification, levels) | ✅ |
| Tipos globales (ActionResult, SessionUser, IDs) | ✅ |
| Módulos funcionales skeleton (auth, planification, export, ftp, admin) | ✅ |
| Reglas de dominio puras (assertCanEdit, assertCanFinalize) | ✅ |
| Schemas Zod para planificación | ✅ |
| Design tokens CSS + preset Tailwind | ✅ |
| Scripts administrativos (seed, clean-temp, check-db) | ✅ |
| Documentación técnica (7 ADR, 4 docs, PROJECT_MAP) | ✅ |
| CHANGELOG.md y ROADMAP.md | ✅ |

---

## Fase 2 — Autenticación y Prisma Schema ✅

**Objetivo:** Conectar la base de datos real y habilitar el login con Google.

| Tarea | Estado |
|-------|--------|
| Schema Prisma completo (users, academic_years, periods, subjects, levels, teacher_assignments, planifications, planification_rows) | ✅ |
| Primera migración de base de datos | ✅ (ejecutar con npm run db:migrate) |
| Seed inicial (niveles, año lectivo, períodos) | ✅ |
| Auth.js v5 configurado con Google OAuth | ✅ |
| Middleware Next.js de protección de rutas | ✅ |
| Página de Login (HTML prototipo + Next.js) | ✅ |
| Página "Sin asignaciones" | ✅ |
| Guardar sesión de usuario en BD | ✅ |
| Integración ALLOWED_EMAIL_DOMAIN | ✅ |
| Tests de autenticación (dominio inválido → 403) | 📋 Fase 5 |

---

## Fase 3 — Flujo Docente: Wizard + Editor PUM 📋

**Objetivo:** El docente puede navegar la jerarquía, completar y guardar la tabla PUM, previsualizar y exportar.

| Tarea | Estado |
|-------|--------|
| Página selección Año Lectivo | 📋 |
| Página selección Período | 📋 |
| Página lista de materias con nivel y estado | 📋 |
| AppShell docente (topbar, breadcrumb, nav) | 📋 |
| PlanificationTable (tabla PUM 5 columnas, editable) | 📋 |
| MetodologiaPanel (editor con iconos PNG y colores) | 📋 |
| Server Action: guardar filas (Zod + PlanificationService) | 📋 |
| StatusBadge y DeadlineBanner | 📋 |
| Implementación real de PlanificationService (Prisma) | 📋 |
| Página de previsualización HTML | 📋 |
| FinalizeDialog (confirmación con doble verificación) | 📋 |
| ExportMenu (botones Word y PDF) | 📋 |
| DocxBuilder (generación desde plantilla .docm) | 📋 |
| PdfBuilder (conversión DOCX → PDF) | 📋 |
| API Route /api/export/:planId | 📋 |
| Manejo de estado OVERDUE (plazo vencido) | 📋 |

---

## Fase 4 — Panel Administrador + FTP 📋

**Objetivo:** El admin gestiona catálogos, asignaciones, plazos y exportaciones masivas al NAS.

| Tarea | Estado |
|-------|--------|
| AppShell admin (sidebar + layout) | 📋 |
| Dashboard admin (KPIs: completados, pendientes, vencidos) | 📋 |
| CRUD: Años lectivos | 📋 |
| CRUD: Períodos | 📋 |
| CRUD: Niveles educativos (con order_index) | 📋 |
| CRUD: Materias | 📋 |
| AssignmentManager (docente → materia + nivel) | 📋 |
| Configuración de plazos por período | 📋 |
| ExportZipPanel (filtros + descarga masiva) | 📋 |
| ZipBuilder (generación en memoria con TTL) | 📋 |
| FtpPushPanel (test conexión + push con progreso) | 📋 |
| FtpService implementado (basic-ftp) | 📋 |
| Estructura de carpetas NAS: {año}/{materia}/{nivel}/ | 📋 |
| Log de auditoría de push FTP | 📋 |
| AdminService implementado (asignaciones, plazos, stats) | 📋 |

---

## Fase 5 — Calidad y Producción 📋

**Objetivo:** Sistema listo para despliegue en infraestructura institucional.

| Tarea | Estado |
|-------|--------|
| Responsive: tablet (editor colapsado) | 📋 |
| Responsive: móvil (wizard vertical) | 📋 |
| Páginas de error (403, 404, 500) | 📋 |
| E2E tests Playwright: flujo docente completo | 📋 |
| E2E tests: admin FTP push (NAS mock) | 📋 |
| E2E tests: plazo vencido → 403 | 📋 |
| Headers de seguridad verificados (OWASP) | 📋 |
| Análisis Sonar / gitleaks | 📋 |
| Documentación de despliegue (VM/K8s) | 📋 |
| Piloto con docentes reales | 📋 |
| Capacitación admin (FTP, jerarquía NAS, plazos) | 📋 |

---

## Dependencias entre fases

```
Fase 1 → Fase 2 (requiere: estructura de proyecto)
Fase 2 → Fase 3 (requiere: BD conectada + Auth funcionando)
Fase 3 → Fase 4 (requiere: flujo docente completo)
Fase 4 → Fase 5 (requiere: funcionalidad completa)
```

## Estimación de tiempo (1 desarrollador)

| Fase | Estimación |
|------|------------|
| Fase 1 | ✅ 1-2 días |
| Fase 2 | ✅ 1 día |
| Fase 3 | 3-4 semanas |
| Fase 4 | 2-3 semanas |
| Fase 5 | 1-2 semanas |
| **Total** | **8-11 semanas** |
