"use client";

import React, { useEffect, useCallback } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";

      // Scroll focused inputs into view when keyboard opens on mobile
      const handleFocusIn = () => {
        setTimeout(() => {
          const active = document.activeElement as HTMLElement;
          active?.scrollIntoView?.({ behavior: "smooth", block: "center" });
        }, 300);
      };
      document.addEventListener("focusin", handleFocusIn);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("focusin", handleFocusIn);
        document.body.style.overflow = "";
      };
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          "relative z-10 w-full max-w-lg",
          "rounded-t-2xl border-t border-border bg-card",
          "shadow-[0_-4px_32px_rgba(0,0,0,0.4)]",
          "animate-[slideUp_300ms_cubic-bezier(0.32,0.72,0,1)]",
          "max-h-[85vh] overflow-y-auto",
        ].join(" ")}
      >
        {/* Drag indicator */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pt-1 pb-3">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent/70"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* No title — just a close button */}
        {!title && (
          <div className="flex justify-end px-5 pt-1 pb-1">
            <button
              onClick={onClose}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent/70"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="safe-bottom px-5 pb-8">{children}</div>
      </div>

    </div>
  );
}
