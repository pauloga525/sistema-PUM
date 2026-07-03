# ADR 0002 — Usar Prisma como ORM

**Estado:** Aceptado  
**Fecha:** 2026-06-15

## Contexto

El sistema necesita interactuar con PostgreSQL para leer y escribir datos estructurados de planificaciones, asignaciones, usuarios y catálogos.

## Decisión

Usar **Prisma ORM** con **PostgreSQL**.

## Razones

1. **Tipado automático**: Prisma genera tipos TypeScript desde el `schema.prisma`. Cualquier cambio en el modelo se refleja automáticamente en el código TypeScript en el próximo `prisma generate`.
2. **Migrations versionadas**: `prisma migrate dev` mantiene el schema de la BD sincronizado con el código. Cada migración queda en `prisma/migrations/` y se puede revertir.
3. **Prisma Studio**: Interfaz visual de base de datos incluida, útil para administradores sin conocimientos de SQL.
4. **Singleton seguro en Next.js**: El patrón de cliente singleton en `src/lib/prisma/client.ts` evita conexiones múltiples durante hot-reload en desarrollo.

## Alternativas descartadas

| Alternativa | Motivo del descarte |
|---|---|
| Drizzle ORM | Excelente, pero menor cantidad de recursos de aprendizaje y comunidad para el equipo actual |
| TypeORM | Decorators experimentales, peor soporte para Next.js App Router |
| SQL nativo (pg) | Sin migraciones automáticas, sin tipado de queries |

## Consecuencias

- **Positivo**: Desarrollo más rápido, menos errores de tipo en queries.
- **Negativo**: Abstracción puede ocultar queries ineficientes.
- **Mitigación**: En `src/lib/prisma/client.ts` se activa logging de queries en desarrollo para detectar N+1 y queries lentas.
