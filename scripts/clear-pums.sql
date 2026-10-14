-- ⚠ BORRA TODOS LOS PUM (filas, revisiones, auditoría y vínculos).
-- Solo para bases de desarrollo o pruebas. Nunca en producción.
--
--   psql "$DATABASE_URL" -f scripts/clear-pums.sql
BEGIN;
DELETE FROM plan_audit_events;
DELETE FROM plan_reviews;
DELETE FROM planification_rows;
DELETE FROM planification_teachers;
DELETE FROM planifications;
COMMIT;
