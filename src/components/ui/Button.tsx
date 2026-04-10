"use client";

import React from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/85 active:bg-primary/75 shadow-[0_1px_12px_rgba(99,102,241,0.25)]",
  secondary:
    "bg-accent text-accent-foreground border border-border hover:bg-accent/80 active:bg-accent/60",
  ghost:
    "bg-transparent text-foreground hover:bg-accent/50 active:bg-accent/70",
  danger:
    "bg-destructive text-white hover:bg-destructive/85 active:bg-destructive/75 shadow-[0_1px_12px_rgba(239,68,68,0.2)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "min-h-[44px] px-4 py-2 text-sm gap-1.5",
  md: "min-h-[48px] px-5 py-2.5 text-sm gap-2",
  lg: "min-h-[52px] px-6 py-3 text-base gap-2.5",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={[
        "inline-flex items-center justify-center rounded-xl font-medium",
        "transition-all duration-200 ease-out active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "select-none touch-manipulation",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? "w-full" : "",
        isDisabled ? "pointer-events-none opacity-40" : "cursor-pointer",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}
