"use client";

interface WorkoutProgressProps {
  currentIndex: number;
  total: number;
  className?: string;
}

export function WorkoutProgress({
  currentIndex,
  total,
  className = "",
}: WorkoutProgressProps) {
  const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

  return (
    <div className={["space-y-1.5", className].join(" ")}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          Exercise {currentIndex + 1} of {total}
        </p>
        <p className="text-xs text-muted-foreground">
          {Math.round(progress)}%
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-accent">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
