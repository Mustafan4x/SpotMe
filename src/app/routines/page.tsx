"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Plus,
  Dumbbell,
  ChevronRight,
  Calendar,
  Trash2,
} from "lucide-react";
import { useRoutines } from "@/hooks/useRoutines";
import type { Routine } from "@/lib/types";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SwipeableRoutineCard({
  routine,
  onDelete,
}: {
  routine: Routine;
  onDelete: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const draggingRef = useRef(false);
  const lockedRef = useRef<"x" | "y" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    draggingRef.current = false;
    lockedRef.current = null;
    if (containerRef.current) {
      containerRef.current.style.transition = "none";
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;

    // Lock direction after 8px of movement
    if (!lockedRef.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      lockedRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }

    // If scrolling vertically, don't interfere
    if (lockedRef.current !== "x") return;

    draggingRef.current = true;
    e.preventDefault();

    const base = revealed ? -72 : 0;
    const offset = Math.min(0, Math.max(-72, base + dx));

    if (containerRef.current) {
      containerRef.current.style.transform = `translateX(${offset}px)`;
    }
  }, [revealed]);

  const handleTouchEnd = useCallback(() => {
    if (!draggingRef.current) return;

    const el = containerRef.current;
    if (!el) return;

    // Read current position from the transform
    const match = el.style.transform.match(/translateX\((-?\d+\.?\d*)px\)/);
    const current = match ? parseFloat(match[1]) : 0;

    el.style.transition = "transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)";

    if (current < -36) {
      el.style.transform = "translateX(-72px)";
      setRevealed(true);
    } else {
      el.style.transform = "translateX(0px)";
      setRevealed(false);
    }
  }, []);

  const confirmDelete = () => {
    onDelete();
    setShowConfirm(false);
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl" style={{ touchAction: "pan-y" }}>
        {/* Delete button behind */}
        <div className="absolute inset-y-0 right-0 flex w-[72px] items-center justify-center bg-red-600">
          <button
            onClick={() => setShowConfirm(true)}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-white"
            aria-label="Delete routine"
          >
            <Trash2 className="h-5 w-5" />
            <span className="text-[10px] font-medium">Delete</span>
          </button>
        </div>

        {/* Swipeable card */}
        <div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative z-10 bg-background"
          style={{ willChange: "transform" }}
        >
          <Link href={`/routines/${routine.id}`}>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Dumbbell className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {routine.name}
                    </p>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(routine.updated_at)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Delete confirmation */}
      <Modal
        open={showConfirm}
        onClose={() => { setShowConfirm(false); }}
        title="Delete Routine"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &ldquo;{routine.name}&rdquo;? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function RoutinesPage() {
  const {
    routines,
    loading,
    createRoutine,
    deleteRoutine,
  } = useRoutines();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoutine = async () => {
    const name = newRoutineName.trim();
    if (!name) return;
    setError(null);
    try {
      await createRoutine(name);
      setNewRoutineName("");
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err?.message || "Failed to create routine");
      console.error("Create routine error:", err);
    }
  };

  return (
    <div>
      <Header
        title="Routines"
        rightAction={
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-primary transition-colors hover:bg-accent"
            aria-label="Create routine"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      <div className="px-4 py-6">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <Skeleton circle width="w-10" height="h-10" />
                  <div className="flex-1 space-y-2">
                    <Skeleton height="h-4" width="w-32" />
                    <Skeleton height="h-3" width="w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && routines.length === 0 && (
          <EmptyState
            icon={Dumbbell}
            title="No routines yet"
            description="Create your first routine to organize your exercises and start tracking your workouts."
            action={{
              label: "Create Routine",
              onClick: () => setShowCreateModal(true),
              icon: <Plus className="h-4 w-4" />,
            }}
          />
        )}

        {!loading && routines.length > 0 && (
          <div className="space-y-3">
            {routines.map((routine) => (
              <SwipeableRoutineCard
                key={routine.id}
                routine={routine}
                onDelete={() => deleteRoutine(routine.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); setNewRoutineName(""); }}
        title="New Routine"
      >
        <div className="space-y-4">
          <Input
            label="Routine Name"
            placeholder="e.g., Push Day, Full Body, Leg Day"
            value={newRoutineName}
            onChange={(e) => setNewRoutineName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateRoutine(); }}
            autoFocus
          />
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <Button fullWidth onClick={handleCreateRoutine} disabled={!newRoutineName.trim()}>
            Create Routine
          </Button>
        </div>
      </Modal>
    </div>
  );
}
