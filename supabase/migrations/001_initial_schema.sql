-- ============================================================================
-- SpotMe: Initial Database Schema Migration
-- ============================================================================
-- This migration creates all tables, indexes, triggers, and RLS policies
-- for the SpotMe fitness tracking application.
-- Users are managed by Supabase Auth (auth.users).
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Routines: user-created workout templates
CREATE TABLE routines (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Exercises: both default (shared) and user-created
CREATE TABLE exercises (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    muscle_group  TEXT,
    is_default    BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT exercises_default_no_user CHECK (
        (is_default = true AND user_id IS NULL) OR
        (is_default = false AND user_id IS NOT NULL)
    )
);

-- Routine Exercises: join table linking exercises to routines with ordering
CREATE TABLE routine_exercises (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id    UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    exercise_id   UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    order_index   INTEGER NOT NULL,
    default_sets  INTEGER NOT NULL DEFAULT 3,
    CONSTRAINT routine_exercises_order_positive CHECK (order_index >= 0),
    CONSTRAINT routine_exercises_sets_positive CHECK (default_sets > 0)
);

-- Workout Sessions: a single instance of performing a routine
CREATE TABLE workout_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    routine_id    UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ
);

-- Workout Sets: individual set data logged during a session
CREATE TABLE workout_sets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    set_number  INTEGER NOT NULL,
    reps        INTEGER NOT NULL,
    weight      DECIMAL NOT NULL,
    rir         INTEGER NOT NULL,
    logged_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT workout_sets_reps_positive CHECK (reps > 0),
    CONSTRAINT workout_sets_weight_non_negative CHECK (weight >= 0),
    CONSTRAINT workout_sets_rir_range CHECK (rir >= 0 AND rir <= 5),
    CONSTRAINT workout_sets_set_number_positive CHECK (set_number > 0)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Routines
CREATE INDEX idx_routines_user_id ON routines(user_id);

-- Exercises
CREATE INDEX idx_exercises_user_id ON exercises(user_id);

-- Routine Exercises
CREATE INDEX idx_routine_exercises_routine_id ON routine_exercises(routine_id);
CREATE INDEX idx_routine_exercises_exercise_id ON routine_exercises(exercise_id);

-- Workout Sessions
CREATE INDEX idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX idx_workout_sessions_routine_id ON workout_sessions(routine_id);

-- Workout Sets
CREATE INDEX idx_workout_sets_session_id ON workout_sets(session_id);
CREATE INDEX idx_workout_sets_exercise_id ON workout_sets(exercise_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Automatically update `updated_at` on routines when modified
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_routines_updated_at
    BEFORE UPDATE ON routines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- Routines: direct user_id ownership
-- --------------------------------------------------------------------------
CREATE POLICY routines_select ON routines
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY routines_insert ON routines
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY routines_update ON routines
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY routines_delete ON routines
    FOR DELETE USING (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- Exercises: user-owned OR default exercises readable by all authenticated
-- --------------------------------------------------------------------------
CREATE POLICY exercises_select ON exercises
    FOR SELECT USING (
        auth.uid() = user_id
        OR (is_default = true AND user_id IS NULL)
    );

CREATE POLICY exercises_insert ON exercises
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY exercises_update ON exercises
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY exercises_delete ON exercises
    FOR DELETE USING (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- Routine Exercises: ownership verified through routines join
-- --------------------------------------------------------------------------
CREATE POLICY routine_exercises_select ON routine_exercises
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM routines
            WHERE routines.id = routine_exercises.routine_id
            AND routines.user_id = auth.uid()
        )
    );

CREATE POLICY routine_exercises_insert ON routine_exercises
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM routines
            WHERE routines.id = routine_exercises.routine_id
            AND routines.user_id = auth.uid()
        )
    );

CREATE POLICY routine_exercises_update ON routine_exercises
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM routines
            WHERE routines.id = routine_exercises.routine_id
            AND routines.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM routines
            WHERE routines.id = routine_exercises.routine_id
            AND routines.user_id = auth.uid()
        )
    );

CREATE POLICY routine_exercises_delete ON routine_exercises
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM routines
            WHERE routines.id = routine_exercises.routine_id
            AND routines.user_id = auth.uid()
        )
    );

-- --------------------------------------------------------------------------
-- Workout Sessions: direct user_id ownership
-- --------------------------------------------------------------------------
CREATE POLICY workout_sessions_select ON workout_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY workout_sessions_insert ON workout_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY workout_sessions_update ON workout_sessions
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY workout_sessions_delete ON workout_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- Workout Sets: ownership verified through workout_sessions join
-- --------------------------------------------------------------------------
CREATE POLICY workout_sets_select ON workout_sets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workout_sessions
            WHERE workout_sessions.id = workout_sets.session_id
            AND workout_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY workout_sets_insert ON workout_sets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workout_sessions
            WHERE workout_sessions.id = workout_sets.session_id
            AND workout_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY workout_sets_update ON workout_sets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workout_sessions
            WHERE workout_sessions.id = workout_sets.session_id
            AND workout_sessions.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM workout_sessions
            WHERE workout_sessions.id = workout_sets.session_id
            AND workout_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY workout_sets_delete ON workout_sets
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM workout_sessions
            WHERE workout_sessions.id = workout_sets.session_id
            AND workout_sessions.user_id = auth.uid()
        )
    );
