// ============================================================================
// SpotMe: Database Query Functions
// ============================================================================
// All CRUD operations for the SpotMe application.
// Every function uses the shared Supabase client and returns typed results.
// ============================================================================

import { supabase } from './supabase';
import type {
  Routine,
  Exercise,
  RoutineExercise,
  RoutineExerciseWithExercise,
  RoutineWithExercises,
  WorkoutSession,
  WorkoutSessionWithDetails,
  WorkoutSet,
  UpdateRoutineRequest,
  LogSetRequest,
  UpdateSetRequest,
} from './types';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Unwrap a Supabase query result, throwing on error.
 */
function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) {
    throw new Error(result.error.message);
  }
  if (result.data === null) {
    throw new Error('Query returned no data');
  }
  return result.data;
}

// ============================================================================
// Routines
// ============================================================================

/** Fetch all routines for the authenticated user, ordered by most recent. */
export async function getRoutines(): Promise<Routine[]> {
  const result = await supabase
    .from('routines')
    .select('*')
    .order('updated_at', { ascending: false });
  return unwrap(result);
}

/** Fetch a single routine by ID, including its exercises. */
export async function getRoutine(id: string): Promise<RoutineWithExercises> {
  const result = await supabase
    .from('routines')
    .select(`
      *,
      routine_exercises (
        *,
        exercise:exercises (*)
      )
    `)
    .eq('id', id)
    .order('order_index', { referencedTable: 'routine_exercises', ascending: true })
    .single();
  return unwrap(result) as RoutineWithExercises;
}

/** Create a new routine with the given name. */
export async function createRoutine(name: string): Promise<Routine> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const result = await supabase
    .from('routines')
    .insert({ name, user_id: user.id })
    .select()
    .single();
  return unwrap(result);
}

/** Update a routine's mutable fields. */
export async function updateRoutine(
  id: string,
  data: UpdateRoutineRequest
): Promise<Routine> {
  const result = await supabase
    .from('routines')
    .update({ name: data.name })
    .eq('id', id)
    .select()
    .single();
  return unwrap(result);
}

/** Delete a routine and all associated data (cascade). */
export async function deleteRoutine(id: string): Promise<void> {
  const result = await supabase.from('routines').delete().eq('id', id);
  if (result.error) throw new Error(result.error.message);
}

/** Duplicate a routine including all its exercises. */
export async function duplicateRoutine(id: string): Promise<Routine> {
  // 1. Fetch the original routine with exercises
  const original = await getRoutine(id);

  // 2. Create a new routine with " (Copy)" suffix
  const newRoutine = await createRoutine(`${original.name} (Copy)`);

  // 3. Copy all routine_exercises to the new routine
  if (original.routine_exercises.length > 0) {
    const copies = original.routine_exercises.map((re) => ({
      routine_id: newRoutine.id,
      exercise_id: re.exercise_id,
      order_index: re.order_index,
      default_sets: re.default_sets,
    }));

    const result = await supabase.from('routine_exercises').insert(copies);
    if (result.error) throw new Error(result.error.message);
  }

  return newRoutine;
}

// ============================================================================
// Exercises
// ============================================================================

/** Fetch all exercises visible to the user (own + defaults). */
export async function getExercises(): Promise<Exercise[]> {
  const result = await supabase
    .from('exercises')
    .select('*')
    .order('name', { ascending: true });
  return unwrap(result);
}

/** Search exercises by name (case-insensitive partial match). */
export async function searchExercises(query: string): Promise<Exercise[]> {
  const result = await supabase
    .from('exercises')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true });
  return unwrap(result);
}

/** Create a custom exercise for the authenticated user. */
export async function createExercise(
  name: string,
  muscleGroup?: string
): Promise<Exercise> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const result = await supabase
    .from('exercises')
    .insert({
      name,
      muscle_group: muscleGroup ?? null,
      user_id: user.id,
      is_default: false,
    })
    .select()
    .single();
  return unwrap(result);
}

/** Fetch only default (pre-populated) exercises. */
export async function getDefaultExercises(): Promise<Exercise[]> {
  const result = await supabase
    .from('exercises')
    .select('*')
    .eq('is_default', true)
    .order('name', { ascending: true });
  return unwrap(result);
}

// ============================================================================
// Routine Exercises
// ============================================================================

/** Fetch all exercises for a routine, ordered by order_index. */
export async function getRoutineExercises(
  routineId: string
): Promise<RoutineExerciseWithExercise[]> {
  const result = await supabase
    .from('routine_exercises')
    .select(`
      *,
      exercise:exercises (*)
    `)
    .eq('routine_id', routineId)
    .order('order_index', { ascending: true });
  return unwrap(result) as RoutineExerciseWithExercise[];
}

/** Add an exercise to a routine at a given position. */
export async function addExerciseToRoutine(
  routineId: string,
  exerciseId: string,
  order: number
): Promise<RoutineExercise> {
  const result = await supabase
    .from('routine_exercises')
    .insert({
      routine_id: routineId,
      exercise_id: exerciseId,
      order_index: order,
    })
    .select()
    .single();
  return unwrap(result);
}

/** Remove an exercise from a routine by routine_exercise ID. */
export async function removeExerciseFromRoutine(id: string): Promise<void> {
  const result = await supabase.from('routine_exercises').delete().eq('id', id);
  if (result.error) throw new Error(result.error.message);
}

/**
 * Reorder exercises within a routine.
 * Accepts an array of routine_exercise IDs in the desired order.
 */
export async function reorderRoutineExercises(
  routineId: string,
  orderedIds: string[]
): Promise<void> {
  // Update each routine_exercise's order_index to match its array position.
  // We run these in parallel since each targets a different row.
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('routine_exercises')
      .update({ order_index: index })
      .eq('id', id)
      .eq('routine_id', routineId)
  );

  const results = await Promise.all(updates);
  for (const result of results) {
    if (result.error) throw new Error(result.error.message);
  }
}

// ============================================================================
// Workout Sessions
// ============================================================================

/** Start a new workout session for a routine. */
export async function startSession(routineId: string): Promise<WorkoutSession> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const result = await supabase
    .from('workout_sessions')
    .insert({
      routine_id: routineId,
      user_id: user.id,
    })
    .select()
    .single();
  return unwrap(result);
}

/** Mark a session as completed (sets completed_at to now). */
export async function completeSession(id: string): Promise<WorkoutSession> {
  const result = await supabase
    .from('workout_sessions')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return unwrap(result);
}

/** Fetch the most recent completed sessions with routine name and sets. */
export async function getRecentSessions(
  limit: number = 10
): Promise<WorkoutSessionWithDetails[]> {
  const result = await supabase
    .from('workout_sessions')
    .select(`
      *,
      routine:routines ( id, name ),
      sets:workout_sets (*)
    `)
    .not('completed_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit);
  return unwrap(result) as WorkoutSessionWithDetails[];
}

/** Fetch all sessions for a specific routine. */
export async function getSessionsByRoutine(
  routineId: string
): Promise<WorkoutSessionWithDetails[]> {
  const result = await supabase
    .from('workout_sessions')
    .select(`
      *,
      routine:routines ( id, name ),
      sets:workout_sets (*)
    `)
    .eq('routine_id', routineId)
    .not('completed_at', 'is', null)
    .order('started_at', { ascending: false });
  return unwrap(result) as WorkoutSessionWithDetails[];
}

// ============================================================================
// Workout Sets
// ============================================================================

/** Log a new set during an active session. */
export async function logSet(
  sessionId: string,
  exerciseId: string,
  data: Omit<LogSetRequest, 'session_id' | 'exercise_id'>
): Promise<WorkoutSet> {
  const result = await supabase
    .from('workout_sets')
    .insert({
      session_id: sessionId,
      exercise_id: exerciseId,
      set_number: data.set_number,
      reps: data.reps,
      weight: data.weight,
      rir: data.rir,
    })
    .select()
    .single();
  return unwrap(result);
}

/** Update an existing set's data. */
export async function updateSet(
  id: string,
  data: UpdateSetRequest
): Promise<WorkoutSet> {
  const result = await supabase
    .from('workout_sets')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  return unwrap(result);
}

/** Delete a set. */
export async function deleteSet(id: string): Promise<void> {
  const result = await supabase.from('workout_sets').delete().eq('id', id);
  if (result.error) throw new Error(result.error.message);
}

/** Fetch all sets for a given session. */
export async function getSetsForSession(
  sessionId: string
): Promise<WorkoutSet[]> {
  const result = await supabase
    .from('workout_sets')
    .select('*')
    .eq('session_id', sessionId)
    .order('exercise_id', { ascending: true })
    .order('set_number', { ascending: true });
  return unwrap(result);
}

/**
 * Fetch the sets from the last completed session of a routine for a specific exercise.
 * Used to show "Last time" reference during a workout.
 */
export async function getLastSessionSets(
  routineId: string,
  exerciseId: string
): Promise<WorkoutSet[]> {
  // Find the most recent completed session for this routine
  const sessionResult = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('routine_id', routineId)
    .not('completed_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (sessionResult.error || !sessionResult.data) {
    return []; // No previous session
  }

  const result = await supabase
    .from('workout_sets')
    .select('*')
    .eq('session_id', sessionResult.data.id)
    .eq('exercise_id', exerciseId)
    .order('set_number', { ascending: true });

  if (result.error) throw new Error(result.error.message);
  return result.data ?? [];
}
