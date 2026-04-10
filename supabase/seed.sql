-- ============================================================================
-- SpotMe: Seed Data — Default Exercises
-- ============================================================================
-- These exercises are available to all authenticated users (is_default = true).
-- user_id is NULL because they are not owned by any specific user.
-- ============================================================================

INSERT INTO exercises (name, muscle_group, is_default) VALUES
    -- Chest
    ('Bench Press',         'Chest',     true),
    ('Incline Bench Press', 'Chest',     true),
    ('Dumbbell Fly',        'Chest',     true),
    ('Push-Up',             'Chest',     true),
    ('Cable Crossover',     'Chest',     true),

    -- Back
    ('Deadlift',            'Back',      true),
    ('Barbell Row',         'Back',      true),
    ('Pull-Up',             'Back',      true),
    ('Lat Pulldown',        'Back',      true),
    ('Seated Cable Row',    'Back',      true),

    -- Shoulders
    ('Overhead Press',      'Shoulders', true),
    ('Lateral Raise',       'Shoulders', true),
    ('Face Pull',           'Shoulders', true),
    ('Arnold Press',        'Shoulders', true),
    ('Rear Delt Fly',       'Shoulders', true),

    -- Legs
    ('Squat',               'Legs',      true),
    ('Leg Press',           'Legs',      true),
    ('Romanian Deadlift',   'Legs',      true),
    ('Leg Curl',            'Legs',      true),
    ('Leg Extension',       'Legs',      true),
    ('Calf Raise',          'Legs',      true),

    -- Arms
    ('Barbell Curl',        'Arms',      true),
    ('Tricep Pushdown',     'Arms',      true),
    ('Hammer Curl',         'Arms',      true),
    ('Skull Crusher',       'Arms',      true),
    ('Preacher Curl',       'Arms',      true),

    -- Core
    ('Plank',               'Core',      true),
    ('Hanging Leg Raise',   'Core',      true),
    ('Cable Crunch',        'Core',      true),
    ('Ab Wheel Rollout',    'Core',      true);
