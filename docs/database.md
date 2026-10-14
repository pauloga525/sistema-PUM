# Base de datos — PUM Web

**Última actualización:** 2026-10-14

## Motor y ORM

- **Motor:** PostgreSQL 15+
- **ORM:** Prisma 7.x
- **Schema:** `prisma/schema.prisma` (fuente única de verdad del modelo)

## Principio fundamental

La base de datos almacena **ÚNICAMENTE información estructurada**. Ningún archivo binario (Word, PDF, imagen) se almacena en PostgreSQL. Ver ADR 0004.

## Modelo de datos

`prisma/schema.prisma` es la referencia; aquí, el resumen.

| Grupo | Tablas | Notas |
|---|---|---|
| Usuarios | `users` | `role` (enum `Role`), `isActive` (desactivar en vez de borrar), contraseña temporal con vencimiento |
| Catálogo | `academic_years`, `periods`, `subjects`, `levels`, `subject_levels` | `levels.track` (enum `LevelTrack`) |
| Asignaciones | `teacher_assignments` | Una por docente+materia+nivel+año; `coordinatorId` da acceso al coordinador |
| Coordinación | `coordinator_assignments`, `coordinator_subject_assignments` | Vínculo coordinador→docentes y materias habilitadas |
| PUM | `planifications`, `planification_rows`, `planification_teachers` | Un PUM por año+periodo+materia+nivel; filas como JSON; un único editor por PUM |
| Revisión | `plan_reviews` | `status` (enum `ReviewStatus`); `sectionStates` JSON por sección/fila |
| Auditoría | `plan_audit_events`, `user_audit_logs` | El historial del PUM no se purga |
| Sistema | `system_settings`, `system_error_logs`, `rate_limits` | Mantenimiento, errores, límite de intentos |

### Estados del PUM (`planifications.status`, enum `PlanStatus`)

`DRAFT`, `FINALIZED`, `FEEDBACK_RECEIVED`, `APPROVED`, `PENDING_SIGNATURE`,
`SIGNED`, `ADMIN_REJECTED`. Transiciones válidas: `PLAN_TRANSITIONS` en
`src/modules/planification/planification.domain.ts`. El último rechazo del
admin queda en `adminRejectionComment` / `adminRejectedAt`.

## Restricciones e índices relevantes

| Tabla | Restricción / índice | Propósito |
|---|---|---|
| `planifications` | UNIQUE(academicYearId, periodId, subjectId, levelId) | Un PUM por combinación |
| `planification_teachers` | UNIQUE parcial (planificationId) WHERE isEditor | Un solo editor por PUM |
| `planification_rows` | UNIQUE(planificationId, rowIndex) | Filas ordenadas, sin duplicados |
| `teacher_assignments` | UNIQUE(teacherId, subjectId, levelId, academicYearId) | Una asignación por combinación |
| `planifications` | INDEX(academicYearId, status) | Tableros y bandejas por año |

## Qué NO hay en la base de datos

- Columnas `file_blob`, `file_path`, `file_url`
- Tablas `exports`, `documents`, `files`
- Datos de archivos Word o PDF

## Conexión

El cliente Prisma está en `src/lib/prisma/client.ts`. Es un singleton para evitar múltiples conexiones en desarrollo con hot-reload. La conexión se configura con `DATABASE_URL` (ver `.env.example` para el pool y los tiempos máximos).

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
