"use client";

import { useEffect, useState, type ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * PageTransition -- wraps page content and applies a simple opacity fade
 * on mount. Uses CSS transition on opacity only for smooth, fast rendering.
 */
export function PageTransition({ children, className = "" }: PageTransitionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      style={{
        opacity: mounted ? 1 : 0,
        transition: "opacity 150ms ease-out",
      }}
      className={className}
    >
      {children}
    </div>
  );
}
