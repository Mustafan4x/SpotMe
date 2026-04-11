"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Dumbbell,
  Flame,
  Trophy,
  Calendar,
  ChevronRight,
  Play,
  TrendingUp,
} from "lucide-react";
import type { WeeklyStats, RecentWorkout, PersonalRecord } from "@/lib/types";
import { useDashboardData } from "@/hooks/useProgress";

function formatVolume(volume: number): string {
  if (volume >= 10000) {
    return `${(volume / 1000).toFixed(1)}k`;
  }
  return volume.toLocaleString();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return "--";
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

// ============================================================================
// Weekly Summary Card
// ============================================================================

function WeeklySummaryCard({ stats }: { stats: WeeklyStats }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <CardTitle>This Week</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-accent/50 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">
              {stats.total_workouts}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Workouts</p>
          </div>
          <div className="rounded-xl bg-accent/50 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">
              {stats.total_sets}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Sets</p>
          </div>
          <div className="rounded-xl bg-accent/50 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">
              {formatVolume(stats.total_volume)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Volume (lbs)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Streak Card
// ============================================================================

function StreakCard({ streak }: { streak: number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15">
            <Flame className="h-6 w-6 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold text-foreground">{streak}</p>
            <p className="text-sm text-muted-foreground">
              {streak === 1 ? "Week streak" : "Week streak"}
            </p>
          </div>
          {streak > 0 && (
            <Badge variant="warning">
              {streak >= 4 ? "On fire" : "Keep going"}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Recent Workouts List
// ============================================================================

function RecentWorkoutsList({ workouts }: { workouts: RecentWorkout[] }) {
  if (workouts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            <CardTitle>Recent Workouts</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No workouts logged yet. Start your first workout to see your history
            here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-primary" />
          <CardTitle>Recent Workouts</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 px-0 pb-2">
        {workouts.map((workout) => (
          <div
            key={workout.session_id}
            className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {workout.routine_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(workout.date)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <p className="text-xs text-muted-foreground">
                {workout.total_sets} sets
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(workout.duration_minutes)}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Progress Highlights
// ============================================================================

function ProgressHighlights({ records }: { records: PersonalRecord[] }) {
  if (records.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-400" />
          <CardTitle>Progress Highlights</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {records.map((pr, i) => (
          <div
            key={`${pr.exercise_id}-${pr.type}-${i}`}
            className="flex items-start gap-3 rounded-xl bg-emerald-500/8 p-3"
          >
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <p className="text-sm text-foreground">
              <span className="font-medium">New best!</span>{" "}
              {pr.exercise_name}: {pr.weight} lbs x {pr.reps} reps
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function DashboardSkeleton() {
  return (
    <div className="space-y-4 px-4 py-6">
      {/* Weekly summary skeleton */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <Skeleton height="h-4" width="w-24" className="mb-4" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl bg-accent/50 p-3 text-center"
            >
              <Skeleton height="h-7" width="w-12" className="mx-auto mb-1" />
              <Skeleton height="h-3" width="w-16" className="mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Streak skeleton */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4">
        <div className="flex items-center gap-4">
          <Skeleton circle width="w-12" height="h-12" />
          <div className="flex-1 space-y-2">
            <Skeleton height="h-7" width="w-12" />
            <Skeleton height="h-3" width="w-20" />
          </div>
        </div>
      </div>

      {/* Recent workouts skeleton */}
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function HomePage() {
  const { data, error, isLoading } = useDashboardData();

  // Determine if there is no data at all (fresh user)
  const isEmpty =
    !isLoading &&
    !error &&
    data &&
    data.recentWorkouts.length === 0 &&
    data.weeklyStats.total_workouts === 0;

  return (
    <div>
      <Header title="SpotMe" />

      {isLoading && <DashboardSkeleton />}

      {!isLoading && (error || !data) && (
        <div className="space-y-4 px-4 py-6">
          {/* Fallback empty dashboard when Supabase is not configured */}
          <WeeklySummaryCard
            stats={{
              total_workouts: 0,
              total_sets: 0,
              total_volume: 0,
              streak_weeks: 0,
            }}
          />
          <StreakCard streak={0} />
          <EmptyState
            icon={Dumbbell}
            title="No workouts yet"
            description="Start logging your workouts to see your stats, streaks, and personal records."
            action={{
              label: "Start Workout",
              onClick: () => {
                window.location.href = "/log";
              },
              icon: <Play className="h-4 w-4" />,
            }}
          />
        </div>
      )}

      {!isLoading && !error && data && isEmpty && (
        <div className="space-y-4 px-4 py-6">
          <WeeklySummaryCard stats={data.weeklyStats} />
          <StreakCard streak={data.streak} />
          <EmptyState
            icon={Dumbbell}
            title="No workouts yet"
            description="Start logging your workouts to see your stats, streaks, and personal records."
            action={{
              label: "Start Workout",
              onClick: () => {
                window.location.href = "/log";
              },
              icon: <Play className="h-4 w-4" />,
            }}
          />
        </div>
      )}

      {!isLoading && !error && data && !isEmpty && (
        <div className="space-y-4 px-4 py-6">
          <WeeklySummaryCard stats={data.weeklyStats} />
          <StreakCard streak={data.streak} />
          <RecentWorkoutsList workouts={data.recentWorkouts} />
          <ProgressHighlights records={data.personalRecords} />

          {/* Start Workout CTA */}
          <div className="pt-2">
            <Link href="/log">
              <Button
                fullWidth
                size="lg"
                icon={<Play className="h-5 w-5" />}
              >
                Start Workout
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
