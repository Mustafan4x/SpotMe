'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  WorkoutSession,
  WorkoutSet,
  RoutineExerciseWithExercise,
  LogSetRequest,
} from '@/lib/types';
import {
  startSession,
  completeSession,
  getRoutine,
  logSet as dbLogSet,
  getSetsForSession,
  getLastSessionSets,
} from '@/lib/database';

// ============================================================================
// Types
// ============================================================================

/** Previous session data keyed by exercise ID. */
export type LastSessionData = Record<string, WorkoutSet[]>;

export interface WorkoutState {
  /** The active session, or null if no workout is running. */
  session: WorkoutSession | null;
  /** Ordered list of exercises for this routine. */
  exercises: RoutineExerciseWithExercise[];
  /** Index of the currently active exercise. */
  currentExerciseIndex: number;
  /** All sets logged during the current session. */
  sets: WorkoutSet[];
  /** Previous session's sets for "Last time" reference, keyed by exercise ID. */
  lastSessionData: LastSessionData;
  /** True while starting or completing a workout. */
  loading: boolean;
  /** Error message from the last failed operation, if any. */
  error: string | null;
}

export interface WorkoutActions {
  /** Begin a new workout session for the given routine. */
  startWorkout: (routineId: string) => Promise<void>;
  /** Log a set for the current exercise and persist it immediately. */
  logSet: (data: Omit<LogSetRequest, 'session_id' | 'exercise_id'>) => Promise<void>;
  /** Advance to the next exercise without logging a set. */
  skipExercise: () => void;
  /** Mark the current session as completed. */
  completeWorkout: () => Promise<void>;
  /** Navigate to a specific exercise by index. */
  goToExercise: (index: number) => void;
}

export type UseWorkoutReturn = WorkoutState & WorkoutActions;

// ============================================================================
// Hook
// ============================================================================

export function useWorkout(): UseWorkoutReturn {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<RoutineExerciseWithExercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [lastSessionData, setLastSessionData] = useState<LastSessionData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Start a workout
  // -------------------------------------------------------------------------
  const startWorkout = useCallback(async (routineId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch the routine with its exercises
      const routine = await getRoutine(routineId);
      const routineExercises = routine.routine_exercises;

      // Start a new session
      const newSession = await startSession(routineId);

      // Load "Last time" data for each exercise in parallel
      const lastDataEntries = await Promise.all(
        routineExercises.map(async (re) => {
          const lastSets = await getLastSessionSets(routineId, re.exercise_id);
          return [re.exercise_id, lastSets] as const;
        })
      );

      const lastData: LastSessionData = {};
      for (const [exerciseId, lastSets] of lastDataEntries) {
        if (lastSets.length > 0) {
          lastData[exerciseId] = lastSets;
        }
      }

      setSession(newSession);
      setExercises(routineExercises);
      setCurrentExerciseIndex(0);
      setSets([]);
      setLastSessionData(lastData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start workout');
    } finally {
      setLoading(false);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Log a set (auto-saves to database)
  // -------------------------------------------------------------------------
  const logSet = useCallback(
    async (data: Omit<LogSetRequest, 'session_id' | 'exercise_id'>) => {
      if (!session) {
        setError('No active session');
        return;
      }

      const currentExercise = exercises[currentExerciseIndex];
      if (!currentExercise) {
        setError('No current exercise');
        return;
      }

      setError(null);

      try {
        const newSet = await dbLogSet(session.id, currentExercise.exercise_id, data);
        setSets((prev) => [...prev, newSet]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to log set');
      }
    },
    [session, exercises, currentExerciseIndex]
  );

  // -------------------------------------------------------------------------
  // Skip / navigate exercises
  // -------------------------------------------------------------------------
  const skipExercise = useCallback(() => {
    setCurrentExerciseIndex((prev) =>
      Math.min(prev + 1, exercises.length - 1)
    );
  }, [exercises.length]);

  const goToExercise = useCallback(
    (index: number) => {
      if (index >= 0 && index < exercises.length) {
        setCurrentExerciseIndex(index);
      }
    },
    [exercises.length]
  );

  // -------------------------------------------------------------------------
  // Complete the workout
  // -------------------------------------------------------------------------
  const completeWorkout = useCallback(async () => {
    if (!session) {
      setError('No active session');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const completed = await completeSession(session.id);
      setSession(completed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete workout');
    } finally {
      setLoading(false);
    }
  }, [session]);

  return {
    session,
    exercises,
    currentExerciseIndex,
    sets,
    lastSessionData,
    loading,
    error,
    startWorkout,
    logSet,
    skipExercise,
    completeWorkout,
    goToExercise,
  };
}
