"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SetRow } from "./SetRow";
import { Plus, SkipForward, ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import type { WorkoutSet, RoutineExerciseWithExercise } from "@/lib/types";

interface SetInput {
  id: string;
  reps: string;
  weight: string;
  rir: number;
  saved: boolean;
  savedSetId?: string;
}

interface ExerciseCardProps {
  routineExercise: RoutineExerciseWithExercise;
  exerciseIndex: number;
  totalExercises: number;
  loggedSets: WorkoutSet[];
  lastSessionSets: WorkoutSet[];
  onLogSet: (data: {
    set_number: number;
    reps: number;
    weight: number;
    rir: number;
  }) => void;
  onSkip: () => void;
  onPrevious: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function ExerciseCard({
  routineExercise,
  exerciseIndex,
  totalExercises,
  loggedSets,
  lastSessionSets,
  onLogSet,
  onSkip,
  onPrevious,
  onNext,
  isFirst,
  isLast,
}: ExerciseCardProps) {
  const exercise = routineExercise.exercise;
  const defaultSetCount = routineExercise.default_sets;

  // Initialize set inputs: fill with logged sets, then create empty rows up to default_sets
  const getInitialSets = (): SetInput[] => {
    const sets: SetInput[] = [];

    // Add already-logged sets
    for (const loggedSet of loggedSets) {
      sets.push({
        id: `logged-${loggedSet.id}`,
        reps: String(loggedSet.reps),
        weight: String(loggedSet.weight),
        rir: loggedSet.rir,
        saved: true,
        savedSetId: loggedSet.id,
      });
    }

    // Add empty rows to fill up to default_sets
    const remaining = Math.max(0, defaultSetCount - sets.length);
    for (let i = 0; i < remaining; i++) {
      sets.push({
        id: `empty-${Date.now()}-${i}`,
        reps: "",
        weight: "",
        rir: 3,
        saved: false,
      });
    }

    return sets;
  };

  const [setInputs, setSetInputs] = useState<SetInput[]>(getInitialSets);

  const handleUpdateField = (
    index: number,
    field: "reps" | "weight" | "rir",
    value: string | number
  ) => {
    setSetInputs((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      )
    );
  };

  const handleSaveSet = (index: number) => {
    const set = setInputs[index];
    const reps = Number(set.reps);
    const weight = Number(set.weight);
    if (reps <= 0 || weight <= 0) return;

    onLogSet({
      set_number: index + 1,
      reps,
      weight,
      rir: set.rir,
    });

    setSetInputs((prev) =>
      prev.map((s, i) => (i === index ? { ...s, saved: true } : s))
    );
  };

  const handleAddSet = () => {
    const lastSet = setInputs[setInputs.length - 1];
    setSetInputs((prev) => [
      ...prev,
      {
        id: `extra-${Date.now()}`,
        reps: lastSet?.reps ?? "",
        weight: lastSet?.weight ?? "",
        rir: lastSet?.rir ?? 3,
        saved: false,
      },
    ]);
  };

  const handleDeleteSet = (index: number) => {
    if (setInputs.length <= 1) return;
    setSetInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuickFill = (index: number) => {
    const lastData = lastSessionSets[index];
    if (!lastData) return;
    setSetInputs((prev) =>
      prev.map((s, i) =>
        i === index
          ? { ...s, reps: String(lastData.reps), weight: String(lastData.weight), rir: lastData.rir }
          : s
      )
    );
  };

  const savedCount = setInputs.filter((s) => s.saved).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Dumbbell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle>{exercise.name}</CardTitle>
              {exercise.muscle_group && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {exercise.muscle_group}
                </p>
              )}
            </div>
          </div>
          <Badge variant={savedCount === setInputs.length && savedCount > 0 ? "success" : "default"}>
            {savedCount}/{setInputs.length} sets
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {setInputs.map((setInput, index) => (
          <SetRow
            key={setInput.id}
            setNumber={index + 1}
            reps={setInput.reps}
            weight={setInput.weight}
            rir={setInput.rir}
            onRepsChange={(v) => handleUpdateField(index, "reps", v)}
            onWeightChange={(v) => handleUpdateField(index, "weight", v)}
            onRirChange={(v) => handleUpdateField(index, "rir", v)}
            onSave={() => handleSaveSet(index)}
            onDelete={
              setInputs.length > 1 && !setInput.saved
                ? () => handleDeleteSet(index)
                : undefined
            }
            lastTimeData={lastSessionSets[index] ?? null}
            onQuickFill={() => handleQuickFill(index)}
            isSaved={setInput.saved}
          />
        ))}

        {/* Add Extra Set */}
        <Button
          variant="ghost"
          size="sm"
          fullWidth
          icon={<Plus className="h-4 w-4" />}
          onClick={handleAddSet}
        >
          Add Set
        </Button>

        {/* Navigation */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<ChevronLeft className="h-4 w-4" />}
            onClick={onPrevious}
            disabled={isFirst}
            className="flex-1"
          >
            Previous
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={<SkipForward className="h-4 w-4" />}
            onClick={onSkip}
            disabled={isLast}
          >
            Skip
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<ChevronRight className="h-4 w-4" />}
            onClick={onNext}
            disabled={isLast}
            className="flex-1"
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
