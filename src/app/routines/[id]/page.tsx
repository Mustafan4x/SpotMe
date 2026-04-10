"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Plus,
  Trash2,
  Copy,
  Edit3,
  ChevronUp,
  ChevronDown,
  Search,
  ArrowLeft,
  Dumbbell,
  MoreVertical,
  Minus as MinusIcon,
} from "lucide-react";
import { useRoutines } from "@/hooks/useRoutines";
import type { RoutineWithExercises, Exercise, RoutineExerciseWithExercise } from "@/lib/types";

// ============================================================================
// Exercise Search Modal
// ============================================================================

function ExerciseSearchModal({
  open,
  onClose,
  exercises,
  onSelect,
  onCreateCustom,
  excludeIds,
}: {
  open: boolean;
  onClose: () => void;
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
  onCreateCustom: (name: string, muscleGroup?: string) => void;
  excludeIds: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customMuscle, setCustomMuscle] = useState("");

  const filtered = query.trim()
    ? exercises.filter(
        (e) =>
          !excludeIds.has(e.id) &&
          (e.name.toLowerCase().includes(query.toLowerCase()) ||
            (e.muscle_group &&
              e.muscle_group.toLowerCase().includes(query.toLowerCase())))
      )
    : exercises.filter((e) => !excludeIds.has(e.id));

  const handleCreate = () => {
    if (!customName.trim()) return;
    onCreateCustom(customName.trim(), customMuscle.trim() || undefined);
    setCustomName("");
    setCustomMuscle("");
    setShowCreate(false);
  };

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setShowCreate(false);
      setCustomName("");
      setCustomMuscle("");
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Add Exercise">
      <div className="space-y-4">
        {!showCreate ? (
          <>
            <Input
              variant="search"
              placeholder="Search exercises..."
              icon={<Search className="h-4 w-4" />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />

            <div className="max-h-[40vh] space-y-1 overflow-y-auto">
              {filtered.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => {
                    onSelect(exercise);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent active:bg-accent/70 min-h-[44px]"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Dumbbell className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {exercise.name}
                    </p>
                    {exercise.muscle_group && (
                      <p className="text-xs text-muted-foreground">
                        {exercise.muscle_group}
                      </p>
                    )}
                  </div>
                </button>
              ))}

              {filtered.length === 0 && query.trim() && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No exercises found for &ldquo;{query}&rdquo;
                </p>
              )}
            </div>

            <Button
              variant="secondary"
              fullWidth
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setShowCreate(true);
                setCustomName(query);
              }}
            >
              Create Custom Exercise
            </Button>
          </>
        ) : (
          <>
            <Input
              label="Exercise Name"
              placeholder="e.g., Bulgarian Split Squat"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              autoFocus
            />
            <Input
              label="Muscle Group (optional)"
              placeholder="e.g., Legs, Chest, Back"
              value={customMuscle}
              onChange={(e) => setCustomMuscle(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowCreate(false)}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreate}
                disabled={!customName.trim()}
              >
                Create
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ============================================================================
// Exercise Row
// ============================================================================

function ExerciseRow({
  re,
  index,
  total,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUpdateSets,
}: {
  re: RoutineExerciseWithExercise;
  index: number;
  total: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdateSets: (sets: number) => void;
}) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center gap-3">
          {/* Reorder buttons */}
          <div className="flex flex-col gap-0.5">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
              aria-label="Move up"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === total - 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
              aria-label="Move down"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Exercise info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {re.exercise.name}
            </p>
            <div className="mt-1 flex items-center gap-2">
              {re.exercise.muscle_group && (
                <Badge variant="muscle">{re.exercise.muscle_group}</Badge>
              )}
              {/* Default sets control */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onUpdateSets(Math.max(1, re.default_sets - 1))}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-muted-foreground hover:text-foreground"
                  aria-label="Decrease sets"
                >
                  <MinusIcon className="h-3 w-3" />
                </button>
                <span className="w-6 text-center text-xs text-muted-foreground">
                  {re.default_sets}
                </span>
                <button
                  onClick={() => onUpdateSets(re.default_sets + 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-muted-foreground hover:text-foreground"
                  aria-label="Increase sets"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <span className="text-xs text-muted-foreground">sets</span>
              </div>
            </div>
          </div>

          {/* Delete button */}
          <button
            onClick={onRemove}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20"
            aria-label="Remove exercise"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Page
// ============================================================================

interface RoutineDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function RoutineDetailPage({ params }: RoutineDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const {
    loading,
    exercises,
    getRoutineWithExercises,
    addExerciseToRoutine,
    removeExerciseFromRoutine,
    reorderExercise,
    updateDefaultSets,
    updateRoutineName,
    duplicateRoutine,
    deleteRoutine,
    createExercise,
  } = useRoutines();

  const [routine, setRoutine] = useState<RoutineWithExercises | null>(null);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Refresh routine data when hook data changes
  useEffect(() => {
    if (!loading) {
      const r = getRoutineWithExercises(id);
      setRoutine(r);
    }
  }, [id, loading, getRoutineWithExercises]);

  const handleAddExercise = (exercise: Exercise) => {
    addExerciseToRoutine(id, exercise.id);
    // Refresh
    setTimeout(() => {
      setRoutine(getRoutineWithExercises(id));
    }, 50);
  };

  const handleCreateAndAdd = (name: string, muscleGroup?: string) => {
    const exercise = createExercise(name, muscleGroup);
    addExerciseToRoutine(id, exercise.id);
    setShowExerciseSearch(false);
    setTimeout(() => {
      setRoutine(getRoutineWithExercises(id));
    }, 50);
  };

  const handleRemoveExercise = (routineExerciseId: string) => {
    removeExerciseFromRoutine(id, routineExerciseId);
    setTimeout(() => {
      setRoutine(getRoutineWithExercises(id));
    }, 50);
  };

  const handleReorder = (
    routineExerciseId: string,
    direction: "up" | "down"
  ) => {
    reorderExercise(id, routineExerciseId, direction);
    setTimeout(() => {
      setRoutine(getRoutineWithExercises(id));
    }, 50);
  };

  const handleUpdateSets = (routineExerciseId: string, sets: number) => {
    updateDefaultSets(routineExerciseId, sets);
    setTimeout(() => {
      setRoutine(getRoutineWithExercises(id));
    }, 50);
  };

  const handleSaveName = () => {
    const name = editedName.trim();
    if (!name) return;
    updateRoutineName(id, name);
    setShowEditName(false);
    setTimeout(() => {
      setRoutine(getRoutineWithExercises(id));
    }, 50);
  };

  const handleDuplicate = () => {
    duplicateRoutine(id);
    setShowMenu(false);
    router.push("/routines");
  };

  const handleDelete = () => {
    deleteRoutine(id);
    setShowDeleteConfirm(false);
    setShowMenu(false);
    router.push("/routines");
  };

  const excludeIds = new Set(
    routine?.routine_exercises.map((re) => re.exercise_id) ?? []
  );

  if (loading) {
    return (
      <div>
        <Header title="Routine Details" />
        <div className="space-y-3 px-4 py-6">
          <Skeleton height="h-8" width="w-48" />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-3">
                <Skeleton width="w-8" height="h-14" />
                <div className="flex-1 space-y-2">
                  <Skeleton height="h-4" width="w-32" />
                  <Skeleton height="h-3" width="w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!routine) {
    return (
      <div>
        <Header title="Routine Details" />
        <EmptyState
          icon={Dumbbell}
          title="Routine not found"
          description="This routine may have been deleted."
          action={{
            label: "Back to Routines",
            onClick: () => router.push("/routines"),
            icon: <ArrowLeft className="h-4 w-4" />,
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <Header
        title={routine.name}
        rightAction={
          <button
            onClick={() => setShowMenu(true)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent/70"
            aria-label="Routine options"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        }
      />

      <div className="space-y-3 px-4 py-6">
        {/* Exercise List */}
        {routine.routine_exercises.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="No exercises"
            description="Add exercises to this routine to get started."
            action={{
              label: "Add Exercise",
              onClick: () => setShowExerciseSearch(true),
              icon: <Plus className="h-4 w-4" />,
            }}
          />
        ) : (
          <>
            {routine.routine_exercises.map((re, index) => (
              <ExerciseRow
                key={re.id}
                re={re}
                index={index}
                total={routine.routine_exercises.length}
                onRemove={() => handleRemoveExercise(re.id)}
                onMoveUp={() => handleReorder(re.id, "up")}
                onMoveDown={() => handleReorder(re.id, "down")}
                onUpdateSets={(sets) => handleUpdateSets(re.id, sets)}
              />
            ))}

            <Button
              variant="secondary"
              fullWidth
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setShowExerciseSearch(true)}
            >
              Add Exercise
            </Button>
          </>
        )}
      </div>

      {/* Exercise Search Modal */}
      <ExerciseSearchModal
        open={showExerciseSearch}
        onClose={() => setShowExerciseSearch(false)}
        exercises={exercises}
        onSelect={handleAddExercise}
        onCreateCustom={handleCreateAndAdd}
        excludeIds={excludeIds}
      />

      {/* Options Menu Modal */}
      <Modal
        open={showMenu}
        onClose={() => setShowMenu(false)}
        title="Routine Options"
      >
        <div className="space-y-2">
          <button
            onClick={() => {
              setEditedName(routine.name);
              setShowEditName(true);
              setShowMenu(false);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-accent min-h-[44px]"
          >
            <Edit3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Edit Name</span>
          </button>
          <button
            onClick={handleDuplicate}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-accent min-h-[44px]"
          >
            <Copy className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Duplicate Routine</span>
          </button>
          <button
            onClick={() => {
              setShowDeleteConfirm(true);
              setShowMenu(false);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-destructive/10 min-h-[44px]"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">Delete Routine</span>
          </button>
        </div>
      </Modal>

      {/* Edit Name Modal */}
      <Modal
        open={showEditName}
        onClose={() => setShowEditName(false)}
        title="Edit Routine Name"
      >
        <div className="space-y-4">
          <Input
            label="Routine Name"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveName();
            }}
            autoFocus
          />
          <Button
            fullWidth
            onClick={handleSaveName}
            disabled={!editedName.trim()}
          >
            Save
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Routine"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &ldquo;{routine.name}&rdquo;? This
            action cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
