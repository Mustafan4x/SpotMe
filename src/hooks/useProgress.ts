'use client';

import useSWR from 'swr';
import type {
  WeightOverTimePoint,
  VolumeDataPoint,
  SessionFrequencyPoint,
  WeeklyStats,
  PersonalRecord,
  RecentWorkout,
  Trend,
} from '@/lib/types';
import {
  getRecentSessions,
  getSessionsByRoutine,
} from '@/lib/database';
import {
  calculateVolume,
  calculate1RM,
  calculateTrend,
  getWeeklyStats,
  getStreak,
  detectPRs,
} from '@/lib/calculations';

// ============================================================================
// Helpers
// ============================================================================

/** Map a trend string from calculations.ts to the Trend type from types.ts. */
function mapTrend(
  direction: 'improving' | 'steady' | 'declining',
  sessionCount: number
): Trend {
  const labelMap: Record<string, { direction: Trend['direction']; label: string }> = {
    improving: { direction: 'up', label: "You're improving" },
    steady: { direction: 'steady', label: 'Holding steady' },
    declining: { direction: 'down', label: 'Trending down' },
  };

  const mapped = labelMap[direction];
  return {
    direction: mapped.direction,
    label: mapped.label,
    session_count: sessionCount,
  };
}

/** Filter a time range. */
function filterByTimeRange<T extends { date: string }>(
  points: T[],
  timeRange: '1m' | '3m' | '6m' | '1y' | 'all'
): T[] {
  if (timeRange === 'all') return points;

  const now = new Date();
  const months: Record<string, number> = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 };
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months[timeRange]);

  return points.filter((p) => new Date(p.date) >= cutoff);
}

/** Compute duration in minutes between two ISO timestamps (null-safe). */
function durationMinutes(
  startedAt: string,
  completedAt: string | null
): number | null {
  if (!completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  return Math.round(ms / 60_000);
}

// ============================================================================
// useExerciseProgress
// ============================================================================

export interface ExerciseProgressData {
  weightOverTime: WeightOverTimePoint[];
  volumeOverTime: VolumeDataPoint[];
  repProgression: WeightOverTimePoint[];
  estimated1RM: WeightOverTimePoint[];
  trend: Trend;
}

/**
 * Fetch and format progress data for a single exercise across all sessions.
 */
export function useExerciseProgress(
  exerciseId: string | null,
  timeRange: '1m' | '3m' | '6m' | '1y' | 'all' = 'all'
) {
  return useSWR<ExerciseProgressData | null>(
    exerciseId ? ['exerciseProgress', exerciseId, timeRange] : null,
    async () => {
      if (!exerciseId) return null;

      // Get all recent sessions (up to 100) that may contain this exercise
      const sessions = await getRecentSessions(100);

      // Build data points from sessions that contain sets for this exercise
      const weightPoints: WeightOverTimePoint[] = [];
      const volumePoints: VolumeDataPoint[] = [];
      const e1rmValues: number[] = [];

      for (const session of sessions) {
        const exerciseSets = session.sets.filter(
          (s) => s.exercise_id === exerciseId
        );
        if (exerciseSets.length === 0) continue;

        const date = session.started_at.split('T')[0];

        // Weight over time: max weight in this session for this exercise
        const maxWeightSet = exerciseSets.reduce((best, s) =>
          s.weight > best.weight ? s : best
        );
        const best1RM = Math.max(
          ...exerciseSets.map((s) => calculate1RM(s.weight, s.reps))
        );

        weightPoints.push({
          date,
          weight: maxWeightSet.weight,
          reps: maxWeightSet.reps,
          estimated_1rm: best1RM,
        });

        // Volume over time
        volumePoints.push({
          date,
          volume: calculateVolume(exerciseSets),
        });

        e1rmValues.push(best1RM);
      }

      // Reverse so oldest is first (sessions come newest-first)
      weightPoints.reverse();
      volumePoints.reverse();
      e1rmValues.reverse();

      const trend = mapTrend(calculateTrend(e1rmValues), e1rmValues.length);

      return {
        weightOverTime: filterByTimeRange(weightPoints, timeRange),
        volumeOverTime: filterByTimeRange(volumePoints, timeRange),
        repProgression: filterByTimeRange(weightPoints, timeRange),
        estimated1RM: filterByTimeRange(weightPoints, timeRange),
        trend,
      };
    },
    { revalidateOnFocus: false }
  );
}

// ============================================================================
// useRoutineProgress
// ============================================================================

export interface RoutineProgressData {
  sessionFrequency: SessionFrequencyPoint[];
  volumePerSession: VolumeDataPoint[];
}

/**
 * Fetch and format progress data for a routine: session frequency and volume.
 */
export function useRoutineProgress(routineId: string | null) {
  return useSWR<RoutineProgressData | null>(
    routineId ? ['routineProgress', routineId] : null,
    async () => {
      if (!routineId) return null;

      const sessions = await getSessionsByRoutine(routineId);

      // Session frequency: count sessions per date
      const frequencyMap = new Map<string, number>();
      const volumePoints: VolumeDataPoint[] = [];

      for (const session of sessions) {
        const date = session.started_at.split('T')[0];

        // Frequency
        frequencyMap.set(date, (frequencyMap.get(date) ?? 0) + 1);

        // Volume per session, broken down by exercise
        const byExercise: Record<string, number> = {};
        for (const set of session.sets) {
          const key = set.exercise_id;
          byExercise[key] = (byExercise[key] ?? 0) + set.reps * set.weight;
        }

        volumePoints.push({
          date,
          volume: calculateVolume(session.sets),
          by_exercise: byExercise,
        });
      }

      const sessionFrequency: SessionFrequencyPoint[] = Array.from(
        frequencyMap.entries()
      )
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Volume is newest-first from the query; reverse for chronological order
      volumePoints.reverse();

      return {
        sessionFrequency,
        volumePerSession: volumePoints,
      };
    },
    { revalidateOnFocus: false }
  );
}

// ============================================================================
// useDashboardData
// ============================================================================

export interface DashboardData {
  weeklyStats: WeeklyStats;
  streak: number;
  recentWorkouts: RecentWorkout[];
  personalRecords: PersonalRecord[];
}

/**
 * Fetch all dashboard data: weekly stats, streak, recent workouts, and PRs.
 */
export function useDashboardData() {
  return useSWR<DashboardData>(
    'dashboardData',
    async () => {
      // Fetch recent sessions (more than needed for streak calculation)
      const sessions = await getRecentSessions(50);

      // Flatten all sets from all sessions
      const allSets = sessions.flatMap((s) => s.sets);

      // Weekly stats (uses calculations.ts which expects its own WorkoutSession type,
      // but the shapes are compatible)
      const weekly = getWeeklyStats(sessions, allSets);
      const weeklyStats: WeeklyStats = {
        total_workouts: weekly.totalWorkouts,
        total_sets: weekly.totalSets,
        total_volume: weekly.totalVolume,
        streak_weeks: getStreak(sessions),
      };

      const streak = weeklyStats.streak_weeks;

      // Recent workouts (last 5)
      const recentWorkouts: RecentWorkout[] = sessions.slice(0, 5).map((s) => ({
        session_id: s.id,
        routine_name: s.routine.name,
        date: s.started_at,
        total_sets: s.sets.length,
        total_volume: calculateVolume(s.sets),
        duration_minutes: durationMinutes(s.started_at, s.completed_at),
      }));

      // Detect PRs: compare the most recent session's sets against all older sets
      const personalRecords: PersonalRecord[] = [];
      if (sessions.length >= 2) {
        const latestSets = sessions[0].sets;
        const historySets = sessions.slice(1).flatMap((s) => s.sets);
        const prs = detectPRs(latestSets, historySets);

        for (const pr of prs) {
          personalRecords.push({
            exercise_id: pr.exercise_id,
            exercise_name: pr.exercise_id, // Will be resolved by UI with exercise data
            weight: pr.type === 'max_weight' ? pr.value : pr.weight ?? 0,
            reps: pr.type === 'max_reps' ? pr.value : 0,
            date: sessions[0].started_at,
            type: pr.type === 'max_weight' ? 'weight' : 'reps',
          });
        }
      }

      return {
        weeklyStats,
        streak,
        recentWorkouts,
        personalRecords,
      };
    },
    { revalidateOnFocus: true, refreshInterval: 60_000 }
  );
}
