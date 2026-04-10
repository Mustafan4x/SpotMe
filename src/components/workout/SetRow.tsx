"use client";

import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Check, Copy, Trash2 } from "lucide-react";
import { RIR_LABELS } from "@/lib/types";
import type { WorkoutSet } from "@/lib/types";

interface SetRowProps {
  setNumber: number;
  reps: string;
  weight: string;
  rir: number;
  onRepsChange: (value: string) => void;
  onWeightChange: (value: string) => void;
  onRirChange: (value: number) => void;
  onSave: () => void;
  onDelete?: () => void;
  lastTimeData?: WorkoutSet | null;
  onQuickFill?: () => void;
  isSaved: boolean;
}

export function SetRow({
  setNumber,
  reps,
  weight,
  rir,
  onRepsChange,
  onWeightChange,
  onRirChange,
  onSave,
  onDelete,
  lastTimeData,
  onQuickFill,
  isSaved,
}: SetRowProps) {
  return (
    <div
      className={[
        "rounded-xl border p-3 transition-colors",
        isSaved
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border bg-card",
      ].join(" ")}
    >
      {/* Set header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-xs font-bold text-foreground">
            {setNumber}
          </span>
          {isSaved && (
            <Badge variant="success">Logged</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {lastTimeData && onQuickFill && !isSaved && (
            <button
              onClick={onQuickFill}
              className="flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-95"
              title="Copy last session values"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Last time</span>
            </button>
          )}
          {onDelete && !isSaved && (
            <button
              onClick={onDelete}
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Delete set"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Last time reference */}
      {lastTimeData && (
        <p className="mb-2 text-xs text-muted-foreground">
          Last time: {lastTimeData.weight} lbs x {lastTimeData.reps} reps
        </p>
      )}

      {/* Inputs row */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            variant="number"
            label="Weight"
            placeholder="0"
            value={weight}
            onChange={(e) => onWeightChange(e.target.value)}
            disabled={isSaved}
          />
        </div>
        <div className="flex-1">
          <Input
            variant="number"
            label="Reps"
            placeholder="0"
            value={reps}
            onChange={(e) => onRepsChange(e.target.value)}
            disabled={isSaved}
          />
        </div>
        {!isSaved && (
          <button
            onClick={onSave}
            disabled={!reps || !weight || Number(reps) <= 0 || Number(weight) <= 0}
            className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:bg-primary/85 active:bg-primary/75 active:scale-95 disabled:opacity-40"
            aria-label="Log set"
          >
            <Check className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* RIR selector */}
      <div className="mt-3">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          RIR (Reps in Reserve)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => onRirChange(value)}
              disabled={isSaved}
              className={[
                "rounded-lg px-2.5 py-1.5 text-xs transition-all min-h-[32px] active:scale-95",
                rir === value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40",
              ].join(" ")}
            >
              {value}: {RIR_LABELS[value]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
