"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Weight,
  Layers,
  Target,
  Calendar,
} from "lucide-react";
import { useRoutines } from "@/hooks/useRoutines";
import { useExerciseProgress, useRoutineProgress, useDashboardData } from "@/hooks/useProgress";
import { getRecentSessions, getExercises } from "@/lib/database";
import type { TrendDirection, WorkoutSessionWithDetails, Exercise } from "@/lib/types";

type TimeRange = "1w" | "1m" | "3m" | "6m" | "1y" | "all";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "1w", label: "1W" },
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "ALL" },
];

// ============================================================================
// Trend Indicator
// ============================================================================

function TrendIndicator({
  direction,
  label,
}: {
  direction: TrendDirection;
  label: string;
}) {
  const config: Record<
    TrendDirection,
    { icon: typeof TrendingUp; color: string; bg: string }
  > = {
    up: {
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/15",
    },
    steady: {
      icon: Minus,
      color: "text-amber-400",
      bg: "bg-amber-500/15",
    },
    down: {
      icon: TrendingDown,
      color: "text-red-400",
      bg: "bg-red-500/15",
    },
  };

  const { icon: Icon, color, bg } = config[direction];

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${bg}`}>
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span className={`text-xs font-medium ${color}`}>{label}</span>
    </div>
  );
}

// ============================================================================
// Chart Placeholder Card
// ============================================================================

function ChartCard({
  title,
  icon,
  trend,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  trend?: { direction: TrendDirection; label: string } | null;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle>{title}</CardTitle>
          </div>
          {trend && (
            <TrendIndicator direction={trend.direction} label={trend.label} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {children || (
          <div className="flex h-40 items-center justify-center rounded-xl bg-accent/30">
            <p className="text-sm text-muted-foreground">
              Chart will appear here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Exercise Selector
// ============================================================================

function ExerciseSelector({
  exercises,
  selectedId,
  onChange,
}: {
  exercises: { id: string; name: string }[];
  selectedId: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={selectedId ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[48px] w-full appearance-none rounded-xl border border-border bg-card px-4 py-3 pr-10 text-sm text-card-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="" disabled>
          Select an exercise
        </option>
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id}>
            {ex.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

// ============================================================================
// Time Range Selector
// ============================================================================

function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-accent/50 p-1">
      {TIME_RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={[
            "flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all min-h-[36px] active:scale-95",
            value === range.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Workout Calendar
// ============================================================================

interface CalendarDayData {
  date: string;
  sessions: {
    routineName: string;
    exercises: {
      name: string;
      sets: { reps: number; weight: number }[];
    }[];
  }[];
}

function WorkoutCalendar() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [sessions, setSessions] = useState<WorkoutSessionWithDetails[]>([]);
  const [exerciseMap, setExerciseMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Fetch sessions and exercises
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [fetchedSessions, fetchedExercises] = await Promise.all([
          getRecentSessions(200),
          getExercises(),
        ]);
        if (!cancelled) {
          setSessions(fetchedSessions);
          setExerciseMap(new Map(fetchedExercises.map((e) => [e.id, e.name])));
        }
      } catch (err) {
        console.error("Failed to load calendar data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Build a map of date -> session data for the current month
  const calendarData = useMemo(() => {
    const map = new Map<string, CalendarDayData>();

    for (const session of sessions) {
      const date = session.started_at.split("T")[0];
      if (!map.has(date)) {
        map.set(date, { date, sessions: [] });
      }
      const dayData = map.get(date)!;

      // Group sets by exercise
      const exerciseGroups = new Map<string, { reps: number; weight: number }[]>();
      for (const set of session.sets) {
        if (!exerciseGroups.has(set.exercise_id)) {
          exerciseGroups.set(set.exercise_id, []);
        }
        exerciseGroups.get(set.exercise_id)!.push({
          reps: set.reps,
          weight: set.weight,
        });
      }

      const exercises = Array.from(exerciseGroups.entries()).map(
        ([exerciseId, sets]) => ({
          name: exerciseMap.get(exerciseId) ?? "Unknown",
          sets,
        })
      );

      dayData.sessions.push({
        routineName: session.routine.name,
        exercises,
      });
    }

    return map;
  }, [sessions, exerciseMap]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Day of week the month starts on (0 = Sunday)
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthLabel = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(null);
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(null);
  }, []);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const selectedDayData = selectedDay ? calendarData.get(selectedDay) : null;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <CardTitle>Workout Calendar</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton height="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <CardTitle>Workout Calendar</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {/* Month navigation */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={goToPreviousMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
          <button
            onClick={goToNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day of week headers */}
        <div className="mb-1 grid grid-cols-7 text-center">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-1 text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells for days before the month starts */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const hasWorkout = calendarData.has(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDay;

            return (
              <button
                key={dateStr}
                onClick={() => {
                  if (hasWorkout) {
                    setSelectedDay(isSelected ? null : dateStr);
                  }
                }}
                className={[
                  "relative flex aspect-square flex-col items-center justify-center rounded-lg text-xs transition-colors",
                  hasWorkout ? "cursor-pointer" : "cursor-default",
                  isSelected
                    ? "bg-primary/20 text-primary"
                    : isToday
                    ? "text-primary font-bold"
                    : "text-foreground",
                ].join(" ")}
              >
                <span>{day}</span>
                {hasWorkout && (
                  <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day details */}
        {selectedDayData && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground">
              {new Date(selectedDayData.date + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            {selectedDayData.sessions.map((session, si) => (
              <div key={si} className="rounded-lg border border-border bg-accent/20 p-3">
                <p className="mb-2 text-sm font-semibold text-foreground">
                  {session.routineName}
                </p>
                <div className="space-y-1.5">
                  {session.exercises.map((exercise, ei) => (
                    <div key={ei}>
                      <p className="text-xs font-medium text-foreground">
                        {exercise.name}
                      </p>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                        {exercise.sets.map((set, setIdx) => (
                          <span key={setIdx} className="text-xs text-muted-foreground">
                            {set.weight}lb x {set.reps}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function ProgressPage() {
  const { exercises, routines, loading: routinesLoading } = useRoutines();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("3m");

  // Only show user-created exercises, not pre-loaded defaults
  const userExercises = exercises.filter((e) => !e.is_default);

  const { data: exerciseData, isLoading: exerciseLoading } = useExerciseProgress(
    selectedExerciseId,
    timeRange
  );

  const { data: routineData, isLoading: routineLoading } = useRoutineProgress(
    selectedRoutineId
  );

  // Auto-select first user exercise when exercises load
  useEffect(() => {
    if (userExercises.length > 0 && !selectedExerciseId) {
      setSelectedExerciseId(userExercises[0].id);
    }
  }, [userExercises, selectedExerciseId]);

  // Auto-select first routine when routines load
  useEffect(() => {
    if (routines.length > 0 && !selectedRoutineId) {
      setSelectedRoutineId(routines[0].id);
    }
  }, [routines, selectedRoutineId]);

  const trend = exerciseData?.trend ?? null;

  return (
    <div>
      <Header title="Progress" />

      <div className="space-y-4 px-4 py-6">
        {/* Workout Calendar */}
        <WorkoutCalendar />

        {/* Exercise Selector */}
        {routinesLoading ? (
          <Skeleton height="h-12" />
        ) : userExercises.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No exercises yet"
            description="Add exercises to your routines and start logging workouts to see your progress."
          />
        ) : (
          <>
            <ExerciseSelector
              exercises={userExercises}
              selectedId={selectedExerciseId}
              onChange={setSelectedExerciseId}
            />

            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />

            {/* Chart Cards */}
            <div className="space-y-4">
              <ChartCard
                title="Weight Over Time"
                icon={<Weight className="h-4 w-4 text-primary" />}
                trend={trend}
              >
                <div className="flex h-40 items-center justify-center rounded-xl bg-accent/30">
                  {exerciseLoading ? (
                    <Skeleton height="h-full" width="w-full" />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Line chart -- max weight per session
                    </p>
                  )}
                </div>
              </ChartCard>

              <ChartCard
                title="Volume Over Time"
                icon={<Layers className="h-4 w-4 text-primary" />}
                trend={trend}
              >
                <div className="flex h-40 items-center justify-center rounded-xl bg-accent/30">
                  {exerciseLoading ? (
                    <Skeleton height="h-full" width="w-full" />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Bar chart -- total volume per session
                    </p>
                  )}
                </div>
              </ChartCard>

              <ChartCard
                title="Rep Progression"
                icon={<TrendingUp className="h-4 w-4 text-primary" />}
                trend={trend}
              >
                <div className="flex h-40 items-center justify-center rounded-xl bg-accent/30">
                  {exerciseLoading ? (
                    <Skeleton height="h-full" width="w-full" />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Line chart -- reps at given weight
                    </p>
                  )}
                </div>
              </ChartCard>

              <ChartCard
                title="Estimated 1RM"
                icon={<Target className="h-4 w-4 text-primary" />}
                trend={trend}
              >
                <div className="flex h-40 items-center justify-center rounded-xl bg-accent/30">
                  {exerciseLoading ? (
                    <Skeleton height="h-full" width="w-full" />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Estimated max you could lift once
                    </p>
                  )}
                </div>
              </ChartCard>
            </div>

            {/* Routine Frequency Section */}
            {routines.length > 0 && (
              <div className="space-y-4 pt-4">
                <h2 className="text-base font-semibold text-foreground">
                  Routine Frequency
                </h2>

                <div className="relative">
                  <select
                    value={selectedRoutineId ?? ""}
                    onChange={(e) => setSelectedRoutineId(e.target.value)}
                    className="min-h-[48px] w-full appearance-none rounded-xl border border-border bg-card px-4 py-3 pr-10 text-sm text-card-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="" disabled>
                      Select a routine
                    </option>
                    {routines.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>

                <ChartCard
                  title="Session Frequency"
                  icon={<Calendar className="h-4 w-4 text-primary" />}
                >
                  <div className="flex h-32 items-center justify-center rounded-xl bg-accent/30">
                    {routineLoading ? (
                      <Skeleton height="h-full" width="w-full" />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Calendar heatmap -- how often performed
                      </p>
                    )}
                  </div>
                </ChartCard>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
