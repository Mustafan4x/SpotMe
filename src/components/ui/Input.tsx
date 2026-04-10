"use client";

import React, { forwardRef } from "react";
import { AlertCircle } from "lucide-react";

type InputVariant = "text" | "number" | "search" | "password" | "email";

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  variant?: InputVariant;
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = "text",
      label,
      error,
      helperText,
      icon,
      id,
      className = "",
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    const typeMap: Record<InputVariant, string> = {
      text: "text",
      number: "text",
      search: "search",
      password: "password",
      email: "email",
    };
    const inputType = typeMap[variant];
    const inputMode = variant === "number" ? "numeric" as const : undefined;
    const pattern = variant === "number" ? "[0-9]*\\.?[0-9]*" : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            type={inputType}
            inputMode={inputMode}
            pattern={pattern}
            className={[
              "min-h-[48px] w-full rounded-xl border bg-card px-4 py-3",
              "text-sm text-card-foreground placeholder-muted-foreground",
              "outline-none transition-all duration-200",
              "focus:ring-2 focus:ring-offset-1 focus:ring-offset-background",
              icon ? "pl-11" : "",
              error
                ? "border-destructive/60 focus:border-destructive focus:ring-destructive/30"
                : "border-border focus:border-primary focus:ring-primary/30",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            {...props}
          />

          {error && (
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-destructive">
              <AlertCircle className="h-4 w-4" />
            </span>
          )}
        </div>

        {error && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="mt-1.5 text-xs text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
