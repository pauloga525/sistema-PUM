# ADR 0001 — Usar Next.js 15 como framework principal

**Estado:** Aceptado  
**Fecha:** 2026-06-15  
**Decisores:** Equipo PUM Web

## Contexto

Se necesita una aplicación web institucional que maneje:
- Autenticación OAuth (Google)
- Renderizado de tablas complejas con datos del servidor
- Formularios con guardado frecuente
- Generación de documentos bajo demanda (Word, PDF)
- Panel de administración con operaciones de gestión

## Decisión

Usar **Next.js 15 con App Router** como framework completo (frontend + backend en el mismo proyecto).

## Razones

1. **App Router + RSC**: Los Server Components cargan datos directamente en el servidor al renderizar la página, eliminando waterfalls de datos y estados de loading manuales.
2. **Server Actions**: Permiten mutations (guardar, finalizar) con un mínimo de código sin construir una API REST separada.
3. **API Routes**: Para los endpoints que necesitan streaming binario (exportación Word/PDF), Next.js provee route handlers completos.
4. **TypeScript nativo**: Tipado de extremo a extremo sin configuración extra.
5. **Un solo repositorio**: Frontend y backend en el mismo proyecto simplifica el despliegue en la infraestructura del colegio.

## Alternativas descartadas

| Alternativa | Motivo del descarte |
|---|---|
| Express + React SPA | Requiere dos servidores, CORS, y más configuración de despliegue |
| Remix | Menor ecosistema institucional, menos integración con shadcn/ui |
| NestJS + Next.js por separado | Overhead de dos proyectos para un sistema de una sola institución |

## Consecuencias

- **Positivo**: Menos código de integración, TypeScript end-to-end, routing basado en archivos.
- **Negativo**: El App Router de Next.js 15 tiene curva de aprendizaje respecto a Pages Router.
- **Mitigación**: Documentar patrones RSC/Server Actions en `docs/frontend.md`.
