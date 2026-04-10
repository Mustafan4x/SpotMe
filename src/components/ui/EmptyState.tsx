import React from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className,
      ].join(" ")}
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
        <Icon className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
      </div>

      <h3 className="mb-1.5 text-lg font-semibold text-foreground">{title}</h3>

      <p className="max-w-[260px] text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      {action && (
        <div className="mt-6">
          <Button
            variant="primary"
            size="md"
            icon={action.icon}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
