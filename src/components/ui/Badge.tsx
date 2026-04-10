import React from "react";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muscle";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-accent text-accent-foreground border-border",
  primary: "bg-primary/15 text-primary border-primary/20",
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  danger: "bg-destructive/15 text-red-400 border-destructive/20",
  info: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  muscle: "bg-violet-500/15 text-violet-400 border-violet-500/20",
};

export function Badge({
  variant = "default",
  children,
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-lg border px-2.5 py-1",
        "text-xs font-medium leading-none",
        "select-none whitespace-nowrap",
        variantStyles[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}
