"use client";

import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Check, Trash2 } from "lucide-react";

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
    <div className="flex items-start gap-3">
      {/* Set number outside the card */}
      <div className="flex flex-col items-center gap-1 pt-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-foreground">
          {setNumber}
        </span>
        {isSaved && (
          <Badge variant="success">Logged</Badge>
        )}
      </div>

      {/* Card with stacked inputs */}
      <div
        className={[
          "flex-1 rounded-xl border p-3 transition-colors",
          isSaved
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-border bg-card",
        ].join(" ")}
      >
        <div className="space-y-3">
          <div className="w-full">
            <Input
              variant="number"
              label="Weight"
              placeholder="0"
              value={weight}
              onChange={(e) => onWeightChange(e.target.value)}
              disabled={isSaved}
            />
          </div>
          <div className="w-full">
            <Input
              variant="number"
              label="Reps"
              placeholder="0"
              value={reps}
              onChange={(e) => onRepsChange(e.target.value)}
              disabled={isSaved}
            />
          </div>
          <div className="w-full">
            <Input
              variant="number"
              label="RIR"
              placeholder="3"
              value={String(rir)}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (e.target.value === "") {
                  onRirChange(0);
                } else if (!isNaN(v) && v >= 0 && v <= 5) {
                  onRirChange(v);
                }
              }}
              disabled={isSaved}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex items-center justify-end gap-2">
          {onDelete && !isSaved && (
            <button
              onClick={onDelete}
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Delete set"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {!isSaved && (
            <button
              onClick={onSave}
              disabled={!reps || !weight || Number(reps) <= 0 || Number(weight) <= 0}
              className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/85 active:bg-primary/75 disabled:opacity-40"
              aria-label="Log set"
            >
              <Check className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
