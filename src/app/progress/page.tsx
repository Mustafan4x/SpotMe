"use client";

import { useState, useEffect } from "react";
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
  Weight,
  Layers,
  Target,
  Calendar,
} from "lucide-react";
import { useRoutines } from "@/hooks/useRoutines";
import { useExerciseProgress, useRoutineProgress } from "@/hooks/useProgress";
import type { TrendDirection } from "@/lib/types";

type TimeRange = "1m" | "3m" | "6m" | "1y" | "all";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "All" },
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
  const selected = exercises.find((e) => e.id === selectedId);

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
// Main Page
// ============================================================================

export default function ProgressPage() {
  const { exercises, routines, loading: routinesLoading } = useRoutines();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("3m");

  const { data: exerciseData, isLoading: exerciseLoading } = useExerciseProgress(
    selectedExerciseId,
    timeRange
  );

  const { data: routineData, isLoading: routineLoading } = useRoutineProgress(
    selectedRoutineId
  );

  // Auto-select first exercise when exercises load
  useEffect(() => {
    if (exercises.length > 0 && !selectedExerciseId) {
      setSelectedExerciseId(exercises[0].id);
    }
  }, [exercises, selectedExerciseId]);

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
        {/* Exercise Selector */}
        {routinesLoading ? (
          <Skeleton height="h-12" />
        ) : exercises.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No exercises yet"
            description="Add exercises to your routines and start logging workouts to see your progress."
          />
        ) : (
          <>
            <ExerciseSelector
              exercises={exercises}
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
