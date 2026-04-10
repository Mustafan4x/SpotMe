import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width — accepts Tailwind class like "w-24" or inline style */
  width?: string;
  /** Height — accepts Tailwind class like "h-4" or inline style */
  height?: string;
  /** Renders as a circle (equal width and height, rounded-full) */
  circle?: boolean;
}

export function Skeleton({
  width,
  height,
  circle = false,
  className = "",
  style,
  ...props
}: SkeletonProps) {
  // Determine if width/height are Tailwind classes or CSS values
  const isTwWidth = width?.startsWith("w-");
  const isTwHeight = height?.startsWith("h-");

  const inlineStyle: React.CSSProperties = {
    ...style,
    ...(width && !isTwWidth ? { width } : {}),
    ...(height && !isTwHeight ? { height } : {}),
  };

  return (
    <div
      className={[
        "animate-pulse rounded-xl bg-muted",
        "relative overflow-hidden",
        circle ? "rounded-full" : "",
        isTwWidth ? width : "",
        isTwHeight ? height : "",
        // Default size if none given
        !width && !circle ? "w-full" : "",
        !height && !circle ? "h-4" : "",
        circle && !width ? "h-10 w-10" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={inlineStyle}
      aria-hidden="true"
      {...props}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}

/** Pre-composed skeleton for a text block with multiple lines */
interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className = "" }: SkeletonTextProps) {
  return (
    <div className={["space-y-2.5", className].join(" ")}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="h-3.5"
          width={i === lines - 1 ? "w-2/3" : "w-full"}
        />
      ))}
    </div>
  );
}

/** Pre-composed skeleton for a card */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "rounded-2xl border border-border bg-card p-5 space-y-4",
        className,
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <Skeleton circle width="w-10" height="h-10" />
        <div className="flex-1 space-y-2">
          <Skeleton height="h-4" width="w-1/2" />
          <Skeleton height="h-3" width="w-1/3" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}
