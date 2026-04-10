"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  Routine,
  Exercise,
  RoutineExercise,
  RoutineWithExercises,
  RoutineExerciseWithExercise,
} from "@/lib/types";

// ============================================================================
// Default exercise library
// ============================================================================

const DEFAULT_EXERCISES: Exercise[] = [
  { id: "ex-1", user_id: null, name: "Bench Press", muscle_group: "Chest", is_default: true },
  { id: "ex-2", user_id: null, name: "Squat", muscle_group: "Legs", is_default: true },
  { id: "ex-3", user_id: null, name: "Deadlift", muscle_group: "Back", is_default: true },
  { id: "ex-4", user_id: null, name: "Overhead Press", muscle_group: "Shoulders", is_default: true },
  { id: "ex-5", user_id: null, name: "Barbell Row", muscle_group: "Back", is_default: true },
  { id: "ex-6", user_id: null, name: "Pull-up", muscle_group: "Back", is_default: true },
  { id: "ex-7", user_id: null, name: "Dumbbell Curl", muscle_group: "Arms", is_default: true },
  { id: "ex-8", user_id: null, name: "Tricep Pushdown", muscle_group: "Arms", is_default: true },
  { id: "ex-9", user_id: null, name: "Leg Press", muscle_group: "Legs", is_default: true },
  { id: "ex-10", user_id: null, name: "Lateral Raise", muscle_group: "Shoulders", is_default: true },
  { id: "ex-11", user_id: null, name: "Cable Fly", muscle_group: "Chest", is_default: true },
  { id: "ex-12", user_id: null, name: "Plank", muscle_group: "Core", is_default: true },
  { id: "ex-13", user_id: null, name: "Romanian Deadlift", muscle_group: "Legs", is_default: true },
  { id: "ex-14", user_id: null, name: "Incline Dumbbell Press", muscle_group: "Chest", is_default: true },
  { id: "ex-15", user_id: null, name: "Lat Pulldown", muscle_group: "Back", is_default: true },
  { id: "ex-16", user_id: null, name: "Leg Curl", muscle_group: "Legs", is_default: true },
  { id: "ex-17", user_id: null, name: "Face Pull", muscle_group: "Shoulders", is_default: true },
  { id: "ex-18", user_id: null, name: "Hammer Curl", muscle_group: "Arms", is_default: true },
];

// ============================================================================
// Hook
// ============================================================================

interface UseRoutinesReturn {
  routines: Routine[];
  loading: boolean;
  exercises: Exercise[];
  createRoutine: (name: string) => Routine;
  deleteRoutine: (id: string) => void;
  duplicateRoutine: (id: string) => Routine | null;
  updateRoutineName: (id: string, name: string) => void;
  getRoutineWithExercises: (id: string) => RoutineWithExercises | null;
  addExerciseToRoutine: (routineId: string, exerciseId: string, defaultSets?: number) => void;
  removeExerciseFromRoutine: (routineId: string, routineExerciseId: string) => void;
  reorderExercise: (routineId: string, routineExerciseId: string, direction: "up" | "down") => void;
  updateDefaultSets: (routineExerciseId: string, sets: number) => void;
  createExercise: (name: string, muscleGroup?: string) => Exercise;
  searchExercises: (query: string) => Exercise[];
}

export function useRoutines(): UseRoutinesReturn {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineExercises, setRoutineExercises] = useState<RoutineExercise[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>(DEFAULT_EXERCISES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem("spotme_routines");
    const storedRE = localStorage.getItem("spotme_routine_exercises");
    const storedEx = localStorage.getItem("spotme_custom_exercises");

    if (stored) setRoutines(JSON.parse(stored));
    if (storedRE) setRoutineExercises(JSON.parse(storedRE));
    if (storedEx) {
      const custom: Exercise[] = JSON.parse(storedEx);
      setExercises([...DEFAULT_EXERCISES, ...custom]);
    }
    setLoading(false);
  }, []);

  // Persist
  useEffect(() => {
    if (!loading) {
      localStorage.setItem("spotme_routines", JSON.stringify(routines));
      localStorage.setItem("spotme_routine_exercises", JSON.stringify(routineExercises));
    }
  }, [routines, routineExercises, loading]);

  const createRoutine = useCallback((name: string): Routine => {
    const now = new Date().toISOString();
    const routine: Routine = {
      id: `routine-${Date.now()}`,
      user_id: "mock-user-1",
      name,
      created_at: now,
      updated_at: now,
    };
    setRoutines((prev) => [...prev, routine]);
    return routine;
  }, []);

  const deleteRoutine = useCallback((id: string) => {
    setRoutines((prev) => prev.filter((r) => r.id !== id));
    setRoutineExercises((prev) => prev.filter((re) => re.routine_id !== id));
  }, []);

  const duplicateRoutine = useCallback(
    (id: string): Routine | null => {
      const original = routines.find((r) => r.id === id);
      if (!original) return null;
      const now = new Date().toISOString();
      const newRoutine: Routine = {
        id: `routine-${Date.now()}`,
        user_id: original.user_id,
        name: `${original.name} (Copy)`,
        created_at: now,
        updated_at: now,
      };
      const originalREs = routineExercises.filter((re) => re.routine_id === id);
      const newREs = originalREs.map((re, i) => ({
        ...re,
        id: `re-${Date.now()}-${i}`,
        routine_id: newRoutine.id,
      }));
      setRoutines((prev) => [...prev, newRoutine]);
      setRoutineExercises((prev) => [...prev, ...newREs]);
      return newRoutine;
    },
    [routines, routineExercises]
  );

  const updateRoutineName = useCallback((id: string, name: string) => {
    setRoutines((prev) =>
      prev.map((r) => (r.id === id ? { ...r, name, updated_at: new Date().toISOString() } : r))
    );
  }, []);

  const getRoutineWithExercises = useCallback(
    (id: string): RoutineWithExercises | null => {
      const routine = routines.find((r) => r.id === id);
      if (!routine) return null;
      const res = routineExercises
        .filter((re) => re.routine_id === id)
        .sort((a, b) => a.order_index - b.order_index)
        .map((re): RoutineExerciseWithExercise => {
          const exercise = exercises.find((e) => e.id === re.exercise_id)!;
          return { ...re, exercise };
        });
      return { ...routine, routine_exercises: res };
    },
    [routines, routineExercises, exercises]
  );

  const addExerciseToRoutine = useCallback(
    (routineId: string, exerciseId: string, defaultSets = 3) => {
      const existing = routineExercises.filter((re) => re.routine_id === routineId);
      const re: RoutineExercise = {
        id: `re-${Date.now()}`,
        routine_id: routineId,
        exercise_id: exerciseId,
        order_index: existing.length,
        default_sets: defaultSets,
      };
      setRoutineExercises((prev) => [...prev, re]);
    },
    [routineExercises]
  );

  const removeExerciseFromRoutine = useCallback(
    (routineId: string, routineExerciseId: string) => {
      setRoutineExercises((prev) => {
        const filtered = prev.filter((re) => re.id !== routineExerciseId);
        // Reindex
        let idx = 0;
        return filtered.map((re) => {
          if (re.routine_id === routineId) {
            return { ...re, order_index: idx++ };
          }
          return re;
        });
      });
    },
    []
  );

  const reorderExercise = useCallback(
    (routineId: string, routineExerciseId: string, direction: "up" | "down") => {
      setRoutineExercises((prev) => {
        const list = prev
          .filter((re) => re.routine_id === routineId)
          .sort((a, b) => a.order_index - b.order_index);
        const others = prev.filter((re) => re.routine_id !== routineId);

        const idx = list.findIndex((re) => re.id === routineExerciseId);
        if (idx === -1) return prev;
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= list.length) return prev;

        const copy = [...list];
        [copy[idx], copy[swapIdx]] = [copy[swapIdx], copy[idx]];
        return [...others, ...copy.map((re, i) => ({ ...re, order_index: i }))];
      });
    },
    []
  );

  const updateDefaultSets = useCallback((routineExerciseId: string, sets: number) => {
    setRoutineExercises((prev) =>
      prev.map((re) => (re.id === routineExerciseId ? { ...re, default_sets: sets } : re))
    );
  }, []);

  const createExercise = useCallback(
    (name: string, muscleGroup?: string): Exercise => {
      const exercise: Exercise = {
        id: `ex-custom-${Date.now()}`,
        user_id: "mock-user-1",
        name,
        muscle_group: muscleGroup || null,
        is_default: false,
      };
      setExercises((prev) => {
        const next = [...prev, exercise];
        const custom = next.filter((e) => !e.is_default);
        localStorage.setItem("spotme_custom_exercises", JSON.stringify(custom));
        return next;
      });
      return exercise;
    },
    []
  );

  const searchExercises = useCallback(
    (query: string): Exercise[] => {
      if (!query.trim()) return exercises;
      const q = query.toLowerCase();
      return exercises.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.muscle_group && e.muscle_group.toLowerCase().includes(q))
      );
    },
    [exercises]
  );

  return {
    routines,
    loading,
    exercises,
    createRoutine,
    deleteRoutine,
    duplicateRoutine,
    updateRoutineName,
    getRoutineWithExercises,
    addExerciseToRoutine,
    removeExerciseFromRoutine,
    reorderExercise,
    updateDefaultSets,
    createExercise,
    searchExercises,
  };
}
