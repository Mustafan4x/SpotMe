"use client";

import { Input } from "@/components/ui/Input";
import { Check } from "lucide-react";

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
  isSaved,
}: SetRowProps) {
  return (
    <div className="flex gap-2">
      {/* Set number — stretches full height of the inputs card */}
      <div
        className={[
          "flex w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold",
          isSaved
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-accent text-foreground",
        ].join(" ")}
      >
        {setNumber}
      </div>

      {/* Compact stacked inputs */}
      <div
        className={[
          "flex-1 rounded-xl border p-2 transition-colors",
          isSaved
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-border bg-card",
        ].join(" ")}
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-xs text-muted-foreground">Weight</span>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              placeholder="0"
              value={weight}
              onChange={(e) => onWeightChange(e.target.value)}
              disabled={isSaved}
              className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground/50 disabled:opacity-50"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-xs text-muted-foreground">Reps</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0"
              value={reps}
              onChange={(e) => onRepsChange(e.target.value)}
              disabled={isSaved}
              className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground/50 disabled:opacity-50"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-xs text-muted-foreground">RIR</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-5]"
              placeholder="3"
              value={String(rir)}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (e.target.value === "") onRirChange(0);
                else if (!isNaN(v) && v >= 0 && v <= 5) onRirChange(v);
              }}
              disabled={isSaved}
              className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground/50 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Save button */}
        {!isSaved && (
          <div className="mt-2 flex justify-end">
            <button
              onClick={onSave}
              disabled={!reps || !weight || Number(reps) <= 0 || Number(weight) <= 0}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-40"
              aria-label="Log set"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
