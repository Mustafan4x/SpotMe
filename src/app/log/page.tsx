"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { WorkoutProgress } from "@/components/workout/WorkoutProgress";
import { ExerciseCard } from "@/components/workout/ExerciseCard";
import {
  Play,
  Dumbbell,
  ChevronRight,
  CheckCircle2,
  X,
  Layers,
  Clock,
} from "lucide-react";
import { useRoutines } from "@/hooks/useRoutines";
import { useWorkout } from "@/hooks/useWorkout";
import type { RoutineWithExercises, WorkoutSet } from "@/lib/types";

// ============================================================================
// Routine Selector
// ============================================================================

function RoutineSelector({
  routines,
  onSelect,
  loading,
}: {
  routines: { id: string; name: string; exerciseCount: number }[];
  onSelect: (routineId: string) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3 px-4 py-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center gap-3">
              <Skeleton circle width="w-10" height="h-10" />
              <div className="flex-1 space-y-2">
                <Skeleton height="h-4" width="w-32" />
                <Skeleton height="h-3" width="w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (routines.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="No routines yet"
        description="Create a routine first, then come back here to start logging your workouts."
        action={{
          label: "Create Routine",
          onClick: () => {
            window.location.href = "/routines";
          },
          icon: <Dumbbell className="h-4 w-4" />,
        }}
      />
    );
  }

  return (
    <div className="space-y-3 px-4 py-6">
      <p className="text-sm text-muted-foreground">
        Select a routine to start your workout
      </p>
      {routines.map((routine) => (
        <button
          key={routine.id}
          onClick={() => onSelect(routine.id)}
          className="w-full text-left"
        >
          <Card className="transition-colors hover:bg-accent/20 active:bg-accent/40">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Play className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {routine.name}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Layers className="h-3 w-3" />
                    {routine.exerciseCount}{" "}
                    {routine.exerciseCount === 1 ? "exercise" : "exercises"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Active Workout View
// ============================================================================

function ActiveWorkoutView({
  routine,
  currentExerciseIndex,
  sets,
  lastSessionData,
  onLogSet,
  onSkip,
  onGoToExercise,
  onFinish,
  onCancel,
  startedAt,
  loading: workoutLoading,
  error: workoutError,
}: {
  routine: RoutineWithExercises;
  currentExerciseIndex: number;
  sets: WorkoutSet[];
  lastSessionData: Record<string, WorkoutSet[]>;
  onLogSet: (data: {
    set_number: number;
    reps: number;
    weight: number;
    rir: number;
  }) => void;
  onSkip: () => void;
  onGoToExercise: (index: number) => void;
  onFinish: () => void;
  onCancel: () => void;
  startedAt: string;
  loading: boolean;
  error: string | null;
}) {
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [elapsed, setElapsed] = useState("");

  // Timer
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => {
      const diff = Date.now() - start;
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(`${mins}:${secs.toString().padStart(2, "0")}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const exercises = routine.routine_exercises;
  const currentRE = exercises[currentExerciseIndex];
  const totalExercises = exercises.length;
  const isFirst = currentExerciseIndex === 0;
  const isLast = currentExerciseIndex === totalExercises - 1;

  // Get sets for the current exercise
  const currentExerciseSets = sets.filter(
    (s) => s.exercise_id === currentRE?.exercise_id
  );

  // Get last session data for current exercise
  const lastSets = currentRE
    ? (lastSessionData[currentRE.exercise_id] ?? [])
    : [];

  const totalLoggedSets = sets.length;

  return (
    <div>
      <Header
        title={routine.name}
        rightAction={
          <div className="flex items-center gap-1">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {elapsed}
            </span>
            <button
              onClick={() => setShowCancelModal(true)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Cancel workout"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        }
      />

      <div className="space-y-4 px-4 py-4">
        {/* Progress indicator */}
        <WorkoutProgress
          currentIndex={currentExerciseIndex}
          total={totalExercises}
        />

        {/* Error display */}
        {workoutError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
            <p className="text-sm text-destructive">{workoutError}</p>
          </div>
        )}

        {/* Current Exercise */}
        {currentRE && (
          <ExerciseCard
            routineExercise={currentRE}
            exerciseIndex={currentExerciseIndex}
            totalExercises={totalExercises}
            loggedSets={currentExerciseSets}
            lastSessionSets={lastSets}
            onLogSet={onLogSet}
            onSkip={onSkip}
            onPrevious={() => onGoToExercise(currentExerciseIndex - 1)}
            onNext={() => onGoToExercise(currentExerciseIndex + 1)}
            isFirst={isFirst}
            isLast={isLast}
          />
        )}

        {/* Finish Workout */}
        <Button
          fullWidth
          size="lg"
          icon={<CheckCircle2 className="h-5 w-5" />}
          onClick={() => setShowFinishModal(true)}
          loading={workoutLoading}
        >
          Finish Workout ({totalLoggedSets} sets logged)
        </Button>
      </div>

      {/* Finish Confirmation Modal */}
      <Modal
        open={showFinishModal}
        onClose={() => setShowFinishModal(false)}
        title="Finish Workout"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You logged {totalLoggedSets} sets across your workout. Are you ready
            to finish?
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowFinishModal(false)}
            >
              Keep Going
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setShowFinishModal(false);
                onFinish();
              }}
            >
              Finish
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Workout"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel? Any logged sets will be lost.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowCancelModal(false)}
            >
              Keep Going
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => {
                setShowCancelModal(false);
                onCancel();
              }}
            >
              Cancel Workout
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================================
// Workout Complete View
// ============================================================================

function WorkoutCompleteView({
  totalSets,
  onDone,
}: {
  totalSets: number;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15">
        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
      </div>
      <h2 className="mb-2 text-xl font-bold text-foreground">Workout Complete</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Great job! You logged {totalSets} sets this session.
      </p>
      <Button
        onClick={onDone}
        icon={<Dumbbell className="h-4 w-4" />}
      >
        Back to Home
      </Button>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function LogWorkoutPage() {
  const {
    routines,
    loading: routinesLoading,
    getRoutineWithExercises,
  } = useRoutines();

  const {
    session,
    exercises: workoutExercises,
    currentExerciseIndex,
    sets,
    lastSessionData,
    loading: workoutLoading,
    error: workoutError,
    startWorkout,
    logSet,
    skipExercise,
    completeWorkout,
    goToExercise,
  } = useWorkout();

  const [justFinished, setJustFinished] = useState(false);
  const [finishedSetCount, setFinishedSetCount] = useState(0);
  const [activeRoutine, setActiveRoutine] = useState<RoutineWithExercises | null>(null);
  const [routineList, setRoutineList] = useState<{ id: string; name: string; exerciseCount: number }[]>([]);

  // Build routine list asynchronously
  useEffect(() => {
    if (routinesLoading || routines.length === 0) {
      setRoutineList([]);
      return;
    }

    let cancelled = false;
    async function loadRoutineList() {
      const list = await Promise.all(
        routines.map(async (r) => {
          const detail = await getRoutineWithExercises(r.id);
          return {
            id: r.id,
            name: r.name,
            exerciseCount: detail?.routine_exercises.length ?? 0,
          };
        })
      );
      if (!cancelled) {
        setRoutineList(list);
      }
    }
    loadRoutineList();
    return () => { cancelled = true; };
  }, [routines, routinesLoading, getRoutineWithExercises]);

  const handleSelectRoutine = async (routineId: string) => {
    // Get full routine with exercises from hook for display
    const fullRoutine = await getRoutineWithExercises(routineId);
    setActiveRoutine(fullRoutine);

    try {
      await startWorkout(routineId);
    } catch {
      // If Supabase isn't configured, the workout will fail to start.
      // The error will be shown in the UI via workoutError.
    }
  };

  const handleLogSet = async (data: {
    set_number: number;
    reps: number;
    weight: number;
    rir: number;
  }) => {
    try {
      await logSet(data);
    } catch {
      // Error handled by hook
    }
  };

  const handleFinish = async () => {
    const count = sets.length;
    try {
      await completeWorkout();
      setFinishedSetCount(count);
      setJustFinished(true);
      setActiveRoutine(null);
    } catch {
      // Error handled by hook
    }
  };

  const handleCancel = () => {
    setActiveRoutine(null);
    // Reset by reloading - the hook doesn't have an explicit cancel
    window.location.reload();
  };

  const handleDone = () => {
    setJustFinished(false);
    window.location.href = "/";
  };

  // Determine the routine to display during an active workout
  // Prefer the routine from the workout hook (workoutExercises), but fallback to local
  const displayRoutine: RoutineWithExercises | null =
    session && workoutExercises.length > 0
      ? {
          id: session.routine_id,
          user_id: session.user_id,
          name: activeRoutine?.name ?? "Workout",
          created_at: "",
          updated_at: "",
          routine_exercises: workoutExercises,
        }
      : activeRoutine;

  // Show completion screen
  if (justFinished) {
    return (
      <div>
        <Header title="Log Workout" />
        <WorkoutCompleteView totalSets={finishedSetCount} onDone={handleDone} />
      </div>
    );
  }

  // Show active workout
  if (session && displayRoutine) {
    return (
      <ActiveWorkoutView
        routine={displayRoutine}
        currentExerciseIndex={currentExerciseIndex}
        sets={sets}
        lastSessionData={lastSessionData}
        onLogSet={handleLogSet}
        onSkip={skipExercise}
        onGoToExercise={goToExercise}
        onFinish={handleFinish}
        onCancel={handleCancel}
        startedAt={session.started_at}
        loading={workoutLoading}
        error={workoutError}
      />
    );
  }

  // Show loading/error state when starting workout
  if (workoutLoading && activeRoutine) {
    return (
      <div>
        <Header title="Log Workout" />
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
          <p className="text-sm text-muted-foreground">Starting workout...</p>
        </div>
      </div>
    );
  }

  // Show error starting workout
  if (workoutError && !session) {
    return (
      <div>
        <Header title="Log Workout" />
        <div className="px-4 py-6">
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
            <p className="text-sm text-destructive">{workoutError}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Make sure Supabase is configured, or the workout functionality may be limited.
            </p>
          </div>
          <RoutineSelector
            routines={routineList}
            onSelect={handleSelectRoutine}
            loading={routinesLoading}
          />
        </div>
      </div>
    );
  }

  // Show routine selector
  return (
    <div>
      <Header title="Log Workout" />
      <RoutineSelector
        routines={routineList}
        onSelect={handleSelectRoutine}
        loading={routinesLoading}
      />
    </div>
  );
}
