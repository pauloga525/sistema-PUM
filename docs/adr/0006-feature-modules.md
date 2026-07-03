# ADR 0006 — Organización por módulos funcionales (feature modules)

**Estado:** Aceptado  
**Fecha:** 2026-06-15

## Contexto

Se debe elegir entre organizar el código por tipo de archivo (todos los servicios juntos, todos los tipos juntos, etc.) o por funcionalidad (todo lo de planificación junto, todo lo de auth junto, etc.).

## Decisión

Organizar el código fuente en **módulos funcionales** en `src/modules/`:

```
src/modules/
  auth/           → autenticación y autorización
  planification/  → gestión del PUM
  export/         → generación de documentos
  ftp/            → transferencia al NAS
  admin/          → operaciones administrativas
```

Cada módulo contiene: `.service.ts`, `.types.ts`, `.schema.ts` (Zod), `.domain.ts` (reglas de negocio).

## Razones

1. **Alta cohesión**: Todo lo relacionado a planificación está en `modules/planification/`. Para agregar una función nueva, se modifica un solo directorio.
2. **Bajo acoplamiento**: Los módulos se comunican a través de tipos e interfaces exportadas, no importando directamente el interior del otro.
3. **Escalabilidad**: Si el sistema crece para múltiples colegios (multi-tenant), cada módulo puede evolucionar independientemente.
4. **Onboarding**: Un nuevo desarrollador entiende `modules/planification/` sin leer todo el proyecto.

## Alternativas descartadas

| Alternativa | Motivo del descarte |
|---|---|
| Organización por tipo (`services/`, `types/`, `schemas/`) | Requiere leer 3 carpetas distintas para entender una sola funcionalidad |
| Un único archivo por tipo | No escala, archivos de 2000+ líneas |

## Consecuencias

- **Positivo**: Código más fácil de mantener y navegar.
- **Negativo**: Requiere disciplina para no romper los límites entre módulos.
- **Mitigación**: Las importaciones entre módulos se revisan en code review. Un módulo no debe importar el `.service.ts` interno de otro módulo; debe pasar por la interfaz pública.
