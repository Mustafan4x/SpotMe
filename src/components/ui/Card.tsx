import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={[
        "rounded-2xl border border-border bg-card text-card-foreground",
        "shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
        "transition-colors duration-150 ease-out",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={["px-5 pt-5 pb-2", className].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
  ...props
}: CardTitleProps) {
  return (
    <h3
      className={[
        "text-base font-semibold leading-tight tracking-tight text-foreground",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({
  children,
  className = "",
  ...props
}: CardContentProps) {
  return (
    <div className={["px-5 pb-5", className].join(" ")} {...props}>
      {children}
    </div>
  );
}
