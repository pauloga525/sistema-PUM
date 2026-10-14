# Base de datos — PUM Web

**Última actualización:** 2026-06-15 (Fase 1)

## Motor y ORM

- **Motor:** PostgreSQL 15+
- **ORM:** Prisma 7.x
- **Schema:** `prisma/schema.prisma` (fuente única de verdad del modelo)

## Principio fundamental

La base de datos almacena **ÚNICAMENTE información estructurada**. Ningún archivo binario (Word, PDF, imagen) se almacena en PostgreSQL. Ver ADR 0004.

## Modelo de datos (Fase 2 — pendiente de implementación)

```
┌─────────────┐       ┌────────────────┐       ┌──────────────┐
│   users      │       │ academic_years  │       │   periods    │
│─────────────│       │────────────────│       │──────────────│
│ id (uuid)   │       │ id (uuid)      │       │ id (uuid)    │
│ email       │       │ label          │       │ name         │
│ name        │       │ year_start     │       │ number       │
│ role        │       └────────────────┘       │ academic_    │
│ image       │                                │ year_id (fk) │
└──────┬──────┘                                └──────────────┘
       │
       │ has many
       ▼
┌─────────────────────┐     ┌─────────────┐     ┌─────────────┐
│ teacher_assignments  │     │  subjects   │     │   levels    │
│─────────────────────│     │─────────────│     │─────────────│
│ id (uuid)           │────▶│ id (uuid)   │     │ id (uuid)   │
│ teacher_id (fk)     │     │ name        │     │ name        │
│ subject_id (fk)     │     │ code (uk)   │     │ code (uk)   │
│ level_id (fk)       │◀────│             │     │ order_index │
│ academic_year_id    │     └─────────────┘     │ track       │
│ active              │                         └─────────────┘
└─────────────────────┘

┌───────────────────────────────────────────────────────────┐
│                      planifications                        │
│───────────────────────────────────────────────────────────│
│ id (uuid)                                                 │
│ teacher_id (fk → users)                                   │
│ academic_year_id (fk → academic_years)                    │
│ period_id (fk → periods)                                  │
│ subject_id (fk → subjects)                               │
│ level_id (fk → levels)                                    │
│ status (DRAFT | FINALIZED)                                │
│ edit_deadline_at (timestamp nullable)                     │
│ finalized_at (timestamp nullable)                         │
│ cloned_from_id (fk → planifications, nullable)            │
│                                                           │
│ UNIQUE (teacher_id, academic_year_id, period_id,          │
│         subject_id, level_id)                             │
└───────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│         planification_rows          │
│─────────────────────────────────────│
│ id (uuid)                           │
│ planification_id (fk)               │
│ row_index (int)                     │
│ data (jsonb) → { dcd, indicator,    │
│                  methodology,        │
│                  resources,          │
│                  evaluation }        │
│ methodology_icons (jsonb) → [...]   │
└─────────────────────────────────────┘
```

## Índices importantes

| Tabla | Índice | Propósito |
|---|---|---|
| `planifications` | UNIQUE(teacher, year, period, subject, level) | Un PUM por combinación |
| `planification_rows` | INDEX(planification_id, row_index) | Carga ordenada de filas |
| `teacher_assignments` | INDEX(teacher_id, academic_year_id) | Lista de materias del docente |
| `levels` | INDEX(order_index) | Orden en UI y FTP |

## Qué NO hay en la base de datos

- Columnas `file_blob`, `file_path`, `file_url`
- Tablas `exports`, `documents`, `files`
- Datos de archivos Word o PDF

## Conexión

El cliente Prisma está en `src/lib/prisma/client.ts`. Es un singleton para evitar múltiples conexiones en desarrollo con hot-reload. En producción, la variable `DATABASE_URL` en `.env.local` configura la conexión.

## Scripts de base de datos

```bash
npm run db:migrate    # Desarrollo: crea una migración a partir de los cambios del schema y la aplica
npm run db:deploy     # Producción: aplica las migraciones pendientes (no genera nada nuevo)
npm run db:seed       # Carga datos iniciales (niveles, año lectivo)
npm run db:check      # Verifica conectividad
npm run db:studio     # Abre Prisma Studio (interfaz visual)
```

## Migraciones

El esquema se versiona con Prisma Migrate (`prisma/migrations/`). Ya no se usa
`prisma db push`: no deja historial y, al cambiar el tipo de una columna, puede
borrar datos.

- **Cambiar el esquema:** editar `prisma/schema.prisma` y ejecutar
  `npm run db:migrate -- --name descripcion_corta`. Revisar el SQL generado
  antes de confirmarlo; si convierte columnas con `DROP COLUMN`/`ADD COLUMN`,
  reescribirlo con `ALTER COLUMN ... USING` (ver
  `20261014120000_integridad_datos`).
- **Producción:** respaldo de la base y luego `npm run db:deploy`.

### Paso único: adoptar migraciones en una base existente

Las bases creadas con `db push` no tienen historial. `0_init` describe el
esquema tal como quedó tras el plan de seguridad (incluye
`users.tempPasswordExpiresAt` y `rate_limits`). Una sola vez por base:

```bash
# 1. Respaldo
pg_dump "$DATABASE_URL" > respaldo-antes-de-migraciones.sql

# 2. Si aún no se aplicó el cambio del plan de seguridad (tempPasswordExpiresAt):
npx prisma db push          # sin --accept-data-loss

# 3. Comprobar que la base coincide con 0_init (la salida debe ser una migración vacía)
npx prisma migrate diff --from-config-datasource   --to-schema <(git show 4ba5828:prisma/schema.prisma) --script

# 4. Marcar 0_init como aplicada y aplicar el resto
npx prisma migrate resolve --applied 0_init
npm run db:deploy
```

Si el paso 3 muestra diferencias, no continuar: la base se desvió del esquema y
hay que revisarla antes.
