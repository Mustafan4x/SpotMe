"use client";

import { useEffect, useState, type ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * PageTransition -- wraps page content and applies a fade + subtle slide-up
 * animation on mount. Uses CSS animations (no external deps).
 *
 * Usage: wrap the content of each page in <PageTransition>...</PageTransition>
 * or apply once in the root layout around {children}.
 */
export function PageTransition({ children, className = "" }: PageTransitionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger on next frame to ensure the initial state is painted first
    const raf = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={[
        "transition-all duration-300 ease-out",
        mounted
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
