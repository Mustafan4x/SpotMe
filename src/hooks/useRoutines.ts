"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  Routine,
  Exercise,
  RoutineWithExercises,
} from "@/lib/types";
import {
  getRoutines,
  getRoutine,
  createRoutine as dbCreateRoutine,
  deleteRoutine as dbDeleteRoutine,
  duplicateRoutine as dbDuplicateRoutine,
  updateRoutine as dbUpdateRoutine,
  getExercises,
  searchExercises as dbSearchExercises,
  createExercise as dbCreateExercise,
  addExerciseToRoutine as dbAddExercise,
  removeExerciseFromRoutine as dbRemoveExercise,
  reorderRoutineExercises as dbReorderExercises,
} from "@/lib/database";

interface UseRoutinesReturn {
  routines: Routine[];
  loading: boolean;
  exercises: Exercise[];
  createRoutine: (name: string) => Promise<Routine>;
  deleteRoutine: (id: string) => Promise<void>;
  duplicateRoutine: (id: string) => Promise<Routine | null>;
  updateRoutineName: (id: string, name: string) => Promise<void>;
  getRoutineWithExercises: (id: string) => Promise<RoutineWithExercises | null>;
  addExerciseToRoutine: (routineId: string, exerciseId: string, defaultSets?: number) => Promise<void>;
  removeExerciseFromRoutine: (routineId: string, routineExerciseId: string) => Promise<void>;
  reorderExercise: (routineId: string, routineExerciseId: string, direction: "up" | "down") => Promise<void>;
  updateDefaultSets: (routineExerciseId: string, sets: number) => Promise<void>;
  createExercise: (name: string, muscleGroup?: string) => Promise<Exercise>;
  searchExercises: (query: string) => Promise<Exercise[]>;
  refresh: () => Promise<void>;
}

export function useRoutines(): UseRoutinesReturn {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [r, e] = await Promise.all([getRoutines(), getExercises()]);
      setRoutines(r);
      setExercises(e);
    } catch (err) {
      console.error("Failed to load routines/exercises:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createRoutine = useCallback(async (name: string): Promise<Routine> => {
    const routine = await dbCreateRoutine(name);
    setRoutines((prev) => [...prev, routine]);
    return routine;
  }, []);

  const deleteRoutine = useCallback(async (id: string) => {
    await dbDeleteRoutine(id);
    setRoutines((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const duplicateRoutine = useCallback(async (id: string): Promise<Routine | null> => {
    try {
      const newRoutine = await dbDuplicateRoutine(id);
      setRoutines((prev) => [...prev, newRoutine]);
      return newRoutine;
    } catch {
      return null;
    }
  }, []);

  const updateRoutineName = useCallback(async (id: string, name: string) => {
    await dbUpdateRoutine(id, { name });
    setRoutines((prev) =>
      prev.map((r) => (r.id === id ? { ...r, name, updated_at: new Date().toISOString() } : r))
    );
  }, []);

  const getRoutineWithExercises = useCallback(async (id: string): Promise<RoutineWithExercises | null> => {
    try {
      return await getRoutine(id);
    } catch {
      return null;
    }
  }, []);

  const addExerciseToRoutine = useCallback(async (routineId: string, exerciseId: string, defaultSets = 3) => {
    // Get current count for order_index
    const routine = await getRoutine(routineId);
    const order = routine?.routine_exercises?.length ?? 0;
    await dbAddExercise(routineId, exerciseId, order);
  }, []);

  const removeExerciseFromRoutine = useCallback(async (_routineId: string, routineExerciseId: string) => {
    await dbRemoveExercise(routineExerciseId);
  }, []);

  const reorderExercise = useCallback(async (routineId: string, routineExerciseId: string, direction: "up" | "down") => {
    const routine = await getRoutine(routineId);
    if (!routine?.routine_exercises) return;

    const list = [...routine.routine_exercises].sort((a, b) => a.order_index - b.order_index);
    const idx = list.findIndex((re) => re.id === routineExerciseId);
    if (idx === -1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;

    [list[idx], list[swapIdx]] = [list[swapIdx], list[idx]];
    const orderedIds = list.map((re) => re.id);
    await dbReorderExercises(routineId, orderedIds);
  }, []);

  const updateDefaultSets = useCallback(async (_routineExerciseId: string, _sets: number) => {
    // The database schema supports default_sets but there's no dedicated update function
    // For now this is a no-op — sets are managed during workout logging
  }, []);

  const createExercise = useCallback(async (name: string, muscleGroup?: string): Promise<Exercise> => {
    const exercise = await dbCreateExercise(name, muscleGroup);
    setExercises((prev) => [...prev, exercise]);
    return exercise;
  }, []);

  const searchExercises = useCallback(async (query: string): Promise<Exercise[]> => {
    if (!query.trim()) return exercises;
    try {
      return await dbSearchExercises(query);
    } catch {
      // Fallback to local filter
      const q = query.toLowerCase();
      return exercises.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.muscle_group && e.muscle_group.toLowerCase().includes(q))
      );
    }
  }, [exercises]);

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
    refresh,
  };
}
