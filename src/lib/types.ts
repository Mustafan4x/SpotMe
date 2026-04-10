// ============================================================================
// SpotMe: TypeScript Type Definitions
// ============================================================================
// Single source of truth for all data shapes used across the application.
// ============================================================================

// ============================================================================
// Database Table Interfaces
// ============================================================================

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  user_id: string | null;
  name: string;
  muscle_group: string | null;
  is_default: boolean;
}

export interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: string;
  order_index: number;
  default_sets: number;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  routine_id: string;
  started_at: string;
  completed_at: string | null;
}

export interface WorkoutSet {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
  rir: number;
  logged_at: string;
}

// ============================================================================
// Joined / Expanded Types
// ============================================================================

/** RoutineExercise with the full Exercise object attached */
export interface RoutineExerciseWithExercise extends RoutineExercise {
  exercise: Exercise;
}

/** Routine with its ordered exercises expanded */
export interface RoutineWithExercises extends Routine {
  routine_exercises: RoutineExerciseWithExercise[];
}

/** WorkoutSession with its sets and routine name */
export interface WorkoutSessionWithDetails extends WorkoutSession {
  routine: Pick<Routine, 'id' | 'name'>;
  sets: WorkoutSet[];
}

// ============================================================================
// CRUD Request / Response Types
// ============================================================================

// -- Routines --

export interface CreateRoutineRequest {
  name: string;
}

export interface UpdateRoutineRequest {
  name: string;
}

// -- Exercises --

export interface CreateExerciseRequest {
  name: string;
  muscle_group?: string;
}

export interface UpdateExerciseRequest {
  name?: string;
  muscle_group?: string;
}

// -- Routine Exercises --

export interface AddExerciseToRoutineRequest {
  routine_id: string;
  exercise_id: string;
  order_index: number;
  default_sets?: number;
}

export interface ReorderRoutineExercisesRequest {
  routine_id: string;
  /** Ordered list of routine_exercise IDs in their new order */
  exercise_order: string[];
}

// -- Workout Sessions --

export interface StartWorkoutSessionRequest {
  routine_id: string;
}

export interface CompleteWorkoutSessionRequest {
  session_id: string;
}

// -- Workout Sets --

export interface LogSetRequest {
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
  rir: number;
}

export interface UpdateSetRequest {
  reps?: number;
  weight?: number;
  rir?: number;
}

// ============================================================================
// Chart / Visualization Data Types
// ============================================================================

/** A single data point for weight-over-time line charts */
export interface WeightOverTimePoint {
  date: string;
  weight: number;
  reps: number;
  estimated_1rm: number;
}

/** A single data point for volume bar charts */
export interface VolumeDataPoint {
  date: string;
  volume: number;
  /** Volume broken down by exercise (for stacked bar charts) */
  by_exercise?: Record<string, number>;
}

/** A single data point for session frequency charts */
export interface SessionFrequencyPoint {
  date: string;
  count: number;
}

// ============================================================================
// RIR Labels
// ============================================================================

export const RIR_LABELS: Record<number, string> = {
  0: 'Nothing left',
  1: 'Maybe 1 more',
  2: 'Could do 2 more',
  3: 'Comfortable',
  4: 'Easy',
  5: 'Very easy',
} as const;

// ============================================================================
// Dashboard & Stats Types
// ============================================================================

/** Weekly summary shown on the home dashboard */
export interface WeeklyStats {
  total_workouts: number;
  total_sets: number;
  total_volume: number;
  streak_weeks: number;
}

/** A personal record detected for a given exercise */
export interface PersonalRecord {
  exercise_id: string;
  exercise_name: string;
  weight: number;
  reps: number;
  date: string;
  type: 'weight' | 'reps' | 'volume' | 'estimated_1rm';
}

/** Trend direction for progress indicators */
export type TrendDirection = 'up' | 'steady' | 'down';

/** Trend analysis result for an exercise or metric */
export interface Trend {
  direction: TrendDirection;
  /** Human-readable label: "You're improving", "Holding steady", "Trending down" */
  label: string;
  /** Number of sessions used to calculate the trend */
  session_count: number;
}

/** Recent workout entry for the dashboard */
export interface RecentWorkout {
  session_id: string;
  routine_name: string;
  date: string;
  total_sets: number;
  total_volume: number;
  duration_minutes: number | null;
}

// ============================================================================
// Muscle Group Type
// ============================================================================

export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Legs'
  | 'Arms'
  | 'Core';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Legs',
  'Arms',
  'Core',
];
