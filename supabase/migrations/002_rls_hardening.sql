-- ============================================================================
-- SpotMe: RLS Hardening Migration (SEC-1)
-- ============================================================================
-- Security audit findings and fixes for Row Level Security policies.
-- Applied on top of 001_initial_schema.sql.
--
-- AUDIT DATE: 2026-04-10
-- ============================================================================

-- ============================================================================
-- FINDING 1: Unauthenticated users can read default exercises
-- ============================================================================
-- The exercises_select policy allows rows where `is_default = true` regardless
-- of whether auth.uid() is NULL (i.e., unauthenticated/anon-key-only requests).
-- While default exercises are not sensitive data, this violates the principle
-- that all data access requires authentication.
--
-- FIX: Add `auth.uid() IS NOT NULL` guard to the exercises SELECT policy so
-- that only authenticated users can read default exercises.
-- ============================================================================

DROP POLICY IF EXISTS exercises_select ON exercises;

CREATE POLICY exercises_select ON exercises
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND (
            auth.uid() = user_id
            OR (is_default = true AND user_id IS NULL)
        )
    );

-- ============================================================================
-- FINDING 2: No text length limits on name columns
-- ============================================================================
-- The `routines.name`, `exercises.name`, and `exercises.muscle_group` columns
-- are unbounded TEXT. A malicious user could insert megabytes of text, causing
-- storage abuse and potential UI rendering issues.
--
-- FIX: Add CHECK constraints to enforce reasonable max lengths.
-- ============================================================================

ALTER TABLE routines
    ADD CONSTRAINT routines_name_length CHECK (char_length(name) <= 200);

ALTER TABLE exercises
    ADD CONSTRAINT exercises_name_length CHECK (char_length(name) <= 200);

ALTER TABLE exercises
    ADD CONSTRAINT exercises_muscle_group_length CHECK (
        muscle_group IS NULL OR char_length(muscle_group) <= 100
    );

-- ============================================================================
-- FINDING 3: No constraint preventing user_id mutation on UPDATE for routines
-- ============================================================================
-- The RLS UPDATE policy on `routines` uses `WITH CHECK (auth.uid() = user_id)`,
-- which prevents a user from changing user_id to someone else's ID (because the
-- new row must still satisfy `auth.uid() = user_id`). However, as a defense-in-
-- depth measure, we add a trigger that explicitly prevents changing user_id on
-- any table that has a direct user_id column. This protects against future
-- policy regressions or bugs.
--
-- The same applies to exercises and workout_sessions.
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_user_id_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'Changing user_id is not allowed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_routines_no_user_id_change
    BEFORE UPDATE ON routines
    FOR EACH ROW
    EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER trg_exercises_no_user_id_change
    BEFORE UPDATE ON exercises
    FOR EACH ROW
    EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER trg_workout_sessions_no_user_id_change
    BEFORE UPDATE ON workout_sessions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_user_id_change();

-- ============================================================================
-- FINDING 4: workout_sessions UPDATE policy allows changing user_id and
-- routine_id to arbitrary values (within RLS bounds)
-- ============================================================================
-- A user could UPDATE a workout_session to point to a different routine_id that
-- belongs to them, which is arguably valid. However, they should not be able to
-- change their own user_id (handled by Finding 3 trigger above). The existing
-- RLS policy is correct for the UPDATE case. No change needed.
--
-- CONFIRMED: workout_sessions UPDATE policy has both USING and WITH CHECK
-- requiring auth.uid() = user_id. This is correct.

-- ============================================================================
-- FINDING 5: routine_exercises UPDATE could move an exercise to a different
-- routine owned by the same user
-- ============================================================================
-- The routine_exercises UPDATE policy checks ownership of the routine_id via
-- JOIN in both USING and WITH CHECK. This means a user can move a
-- routine_exercise row from one of their routines to another. This is
-- acceptable behavior (no cross-user data leak), but worth noting.
--
-- CONFIRMED: No fix needed. The WITH CHECK clause ensures the new routine_id
-- must also belong to the authenticated user.

-- ============================================================================
-- FINDING 6: workout_sets UPDATE could move a set to a different session
-- owned by the same user
-- ============================================================================
-- Similar to Finding 5. The workout_sets UPDATE policy checks ownership via
-- session_id JOIN in both USING and WITH CHECK. A user can move a set from
-- one of their sessions to another. This is acceptable (no cross-user leak).
--
-- CONFIRMED: No fix needed.

-- ============================================================================
-- FINDING 7: exercises INSERT does not prevent is_default = true
-- ============================================================================
-- The exercises_insert policy checks `auth.uid() = user_id`. Since the
-- CHECK constraint `exercises_default_no_user` requires `is_default = true`
-- to have `user_id IS NULL`, and `auth.uid() = NULL` is always false, a user
-- cannot insert a default exercise. The constraint and policy work together.
--
-- However, as defense-in-depth, add an explicit check to the INSERT policy.
-- ============================================================================

DROP POLICY IF EXISTS exercises_insert ON exercises;

CREATE POLICY exercises_insert ON exercises
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND is_default = false
    );

-- ============================================================================
-- FINDING 8: Missing unique constraint on routine_exercises
-- ============================================================================
-- Without a unique constraint on (routine_id, exercise_id), the same exercise
-- can be added to a routine multiple times. While not strictly a security issue,
-- it can lead to data integrity problems and confusing UI states.
--
-- FIX: Add unique constraint.
-- ============================================================================

ALTER TABLE routine_exercises
    ADD CONSTRAINT routine_exercises_unique_exercise
    UNIQUE (routine_id, exercise_id);

-- ============================================================================
-- FINDING 9: workout_sets should validate exercise belongs to the session's
-- routine
-- ============================================================================
-- Currently, a user can log a set for any exercise_id (even one not in the
-- routine) as long as they own the session. This is a data integrity issue
-- rather than a security issue, but it could lead to confusing data.
--
-- NOTE: This is intentional per SPEC.md which allows "Add extra sets beyond
-- the routine's default" and exercises can be skipped. A user might want to
-- log an ad-hoc exercise during a session. No fix applied, but documented.

-- ============================================================================
-- SUMMARY OF CHANGES APPLIED:
-- ============================================================================
-- 1. exercises_select: Added auth.uid() IS NOT NULL guard
-- 2. routines.name: Added max length 200 CHECK constraint
-- 3. exercises.name: Added max length 200 CHECK constraint
-- 4. exercises.muscle_group: Added max length 100 CHECK constraint
-- 5. prevent_user_id_change() trigger on routines, exercises, workout_sessions
-- 6. exercises_insert: Added explicit is_default = false check
-- 7. routine_exercises: Added UNIQUE(routine_id, exercise_id) constraint
--
-- NO CHANGES NEEDED (confirmed correct):
-- - routines RLS policies (SELECT, INSERT, UPDATE, DELETE)
-- - routine_exercises RLS policies (ownership via JOIN is correct)
-- - workout_sessions RLS policies (direct user_id ownership is correct)
-- - workout_sets RLS policies (ownership via session JOIN is correct)
-- - Default exercises are read-only (INSERT/UPDATE/DELETE all require
--   auth.uid() = user_id, which is NULL for defaults)
-- - WITH CHECK on INSERT prevents spoofing user_id
-- - WITH CHECK on UPDATE prevents changing user_id to another user
-- ============================================================================
