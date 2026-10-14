-- =============================================================
-- Integridad de datos (plan de desarrollo, fase 1.3)
--
-- Escrita a mano: el SQL que genera Prisma para pasar columnas de texto a
-- enum hace DROP COLUMN + ADD COLUMN y perdería los datos. Aquí se usa
-- ALTER COLUMN ... TYPE ... USING para conservarlos.
--
-- Hacer respaldo de la base antes de aplicarla en producción.
-- =============================================================

-- -------------------------------------------------------------
-- 0. Verificación previa: aborta sin tocar nada si hay valores
--    que no caben en los enums nuevos.
-- -------------------------------------------------------------
DO $$
DECLARE
  bad TEXT;
BEGIN
  SELECT string_agg(DISTINCT role, ', ') INTO bad FROM "users"
    WHERE role NOT IN ('TEACHER', 'COORDINATOR', 'ADMIN', 'SUPERADMIN');
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'users.role con valores no válidos: %', bad; END IF;

  SELECT string_agg(DISTINCT status, ', ') INTO bad FROM "planifications"
    WHERE status NOT IN ('DRAFT', 'FINALIZED', 'FEEDBACK_RECEIVED', 'APPROVED', 'PENDING_SIGNATURE', 'SIGNED', 'ADMIN_REJECTED');
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'planifications.status con valores no válidos: %', bad; END IF;

  SELECT string_agg(DISTINCT status, ', ') INTO bad FROM "plan_reviews"
    WHERE status NOT IN ('IN_REVIEW', 'FEEDBACK_SENT', 'APPROVED');
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'plan_reviews.status con valores no válidos: %', bad; END IF;

  SELECT string_agg(DISTINCT track, ', ') INTO bad FROM "levels"
    WHERE track NOT IN ('BASICA', 'BACHILLERATO');
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'levels.track con valores no válidos: %', bad; END IF;
END $$;

-- -------------------------------------------------------------
-- 1. Enums
-- -------------------------------------------------------------
CREATE TYPE "Role" AS ENUM ('TEACHER', 'COORDINATOR', 'ADMIN', 'SUPERADMIN');
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'FINALIZED', 'FEEDBACK_RECEIVED', 'APPROVED', 'PENDING_SIGNATURE', 'SIGNED', 'ADMIN_REJECTED');
CREATE TYPE "ReviewStatus" AS ENUM ('IN_REVIEW', 'FEEDBACK_SENT', 'APPROVED');
CREATE TYPE "LevelTrack" AS ENUM ('BASICA', 'BACHILLERATO');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'TEACHER';

ALTER TABLE "planifications" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "planifications" ALTER COLUMN "status" TYPE "PlanStatus" USING "status"::"PlanStatus";
ALTER TABLE "planifications" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "plan_reviews" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "plan_reviews" ALTER COLUMN "status" TYPE "ReviewStatus" USING "status"::"ReviewStatus";
ALTER TABLE "plan_reviews" ALTER COLUMN "status" SET DEFAULT 'IN_REVIEW';

ALTER TABLE "levels" ALTER COLUMN "track" TYPE "LevelTrack" USING "track"::"LevelTrack";

-- -------------------------------------------------------------
-- 2. Rechazo del administrador: de metadata (JSON) a columnas
-- -------------------------------------------------------------
ALTER TABLE "planifications"
  ADD COLUMN "adminRejectionComment" TEXT,
  ADD COLUMN "adminRejectedAt" TIMESTAMP(3);

UPDATE "planifications"
SET "adminRejectionComment" = "metadata"->>'adminRejectionComment',
    "adminRejectedAt" = CASE
      WHEN "metadata"->>'adminRejectedAt' ~ '^\d{4}-\d{2}-\d{2}'
      THEN ("metadata"->>'adminRejectedAt')::timestamptz AT TIME ZONE 'UTC'
    END
WHERE jsonb_typeof("metadata") = 'object'
  AND ("metadata" ? 'adminRejectionComment' OR "metadata" ? 'adminRejectedAt');

UPDATE "planifications"
SET "metadata" = "metadata" - 'adminRejectionComment' - 'adminRejectedAt'
WHERE jsonb_typeof("metadata") = 'object'
  AND ("metadata" ? 'adminRejectionComment' OR "metadata" ? 'adminRejectedAt');

-- -------------------------------------------------------------
-- 3. Un único editor por PUM
--    Si algún PUM tiene más de un editor, se conserva el vínculo más
--    antiguo como editor y el resto pasa a solo lectura.
-- -------------------------------------------------------------
UPDATE "planification_teachers" pt
SET "isEditor" = false
FROM (
  SELECT id, row_number() OVER (PARTITION BY "planificationId" ORDER BY "joinedAt", id) AS rn
  FROM "planification_teachers"
  WHERE "isEditor"
) ranked
WHERE pt.id = ranked.id AND ranked.rn > 1;

CREATE UNIQUE INDEX "planification_teachers_single_editor"
  ON "planification_teachers"("planificationId") WHERE ("isEditor" = true);

-- -------------------------------------------------------------
-- 4. Claves foráneas faltantes (los ids que ya no existen se anulan)
-- -------------------------------------------------------------
UPDATE "system_settings" SET "maintenanceEnabledBy" = NULL
WHERE "maintenanceEnabledBy" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = "maintenanceEnabledBy");

UPDATE "system_error_logs" SET "resolvedBy" = NULL
WHERE "resolvedBy" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = "resolvedBy");

ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_maintenanceEnabledBy_fkey"
  FOREIGN KEY ("maintenanceEnabledBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "system_error_logs" ADD CONSTRAINT "system_error_logs_resolvedBy_fkey"
  FOREIGN KEY ("resolvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- -------------------------------------------------------------
-- 5. Índices
-- -------------------------------------------------------------
DROP INDEX IF EXISTS "planification_rows_planificationId_idx"; -- cubierto por el unique (planificationId, rowIndex)

CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "planifications_academicYearId_status_idx" ON "planifications"("academicYearId", "status");
CREATE INDEX "planifications_subjectId_levelId_academicYearId_idx" ON "planifications"("subjectId", "levelId", "academicYearId");
CREATE INDEX "teacher_assignments_subjectId_levelId_academicYearId_active_idx" ON "teacher_assignments"("subjectId", "levelId", "academicYearId", "active");
CREATE INDEX "coordinator_assignments_teacherId_idx" ON "coordinator_assignments"("teacherId");
CREATE INDEX "plan_reviews_coordinatorId_idx" ON "plan_reviews"("coordinatorId");

-- -------------------------------------------------------------
-- 6. Tablas de @auth/prisma-adapter sin uso (la sesión es JWT)
-- -------------------------------------------------------------
DROP TABLE IF EXISTS "accounts";
DROP TABLE IF EXISTS "sessions";
DROP TABLE IF EXISTS "verification_tokens";
