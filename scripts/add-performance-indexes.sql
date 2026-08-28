-- ============================================================
-- PUM Web — Performance Indexes
-- Run AFTER taking a full DB backup.
--
-- All indexes use CONCURRENTLY to avoid locking tables in
-- production. Run each statement outside a transaction block.
-- If psql is used, add \timing for progress feedback.
-- ============================================================

-- H1: planification_teachers.teacher_id
-- Used in: getSubjectsForYear, getPeriodsForYear, getSubjectsWithStatus,
--          getTeacherNotifications, getAssignedTeachers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_planification_teachers_teacher_id
  ON planification_teachers (teacher_id);

-- H2: teacher_assignments(teacher_id, academic_year_id) WHERE active
-- Used in: getSubjectsForYear, getSubjectsWithStatus, getPeriodsForYear,
--          getOrCreatePlanification, getAssignedTeachers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teacher_assignments_teacher_year_active
  ON teacher_assignments (teacher_id, academic_year_id)
  WHERE active = true;

-- H3: plan_audit_events(planification_id, created_at DESC)
-- Used in: audit log queries on coordinator review page
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_plan_audit_events_plan_created
  ON plan_audit_events (planification_id, created_at DESC);

-- H4: planifications(status) — for status-filtered queries (dashboard, export)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_planifications_status
  ON planifications (status);

-- H5: planifications(academic_year_id, period_id, status)
-- Used in: buildZip filter, admin dashboard, coordinator view
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_planifications_year_period_status
  ON planifications (academic_year_id, period_id, status);

-- M1: rate_limits.window_start — for periodic cleanup of expired records
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_window_start
  ON rate_limits (window_start);

-- coordinator_assignments(coordinator_id) — for getCoordinators, getFinalizedPlans
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coordinator_assignments_coordinator_id
  ON coordinator_assignments (coordinator_id);

-- coordinator_assignments(teacher_id) — for reverse lookup from teacher
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coordinator_assignments_teacher_id
  ON coordinator_assignments (teacher_id);

-- planification_teachers(planification_id) — for plan→teacher joins
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_planification_teachers_planification_id
  ON planification_teachers (planification_id);

-- teacher_assignments(academic_year_id) — for year-scoped queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teacher_assignments_academic_year_id
  ON teacher_assignments (academic_year_id);

-- plan_audit_events(actor_id) — for user-scoped audit history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_plan_audit_events_actor_id
  ON plan_audit_events (actor_id);
