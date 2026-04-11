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
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - startXRef.current;
    // Only allow swiping left
    const clampedDiff = Math.min(0, Math.max(-100, diff));
    currentXRef.current = clampedDiff;
    setOffset(clampedDiff);
  }, []);

  const handleTouchEnd = useCallback(() => {
    // If swiped far enough, snap to reveal delete button
    if (currentXRef.current < -50) {
      setOffset(-80);
    } else {
      setOffset(0);
    }
  }, []);

  const handleDelete = () => {
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    onDelete();
    setShowConfirm(false);
    setOffset(0);
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl">
        {/* Delete button behind */}
        <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-destructive">
          <button
            onClick={handleDelete}
            className="flex h-full w-full items-center justify-center text-white"
            aria-label="Delete routine"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        {/* Swipeable content */}
        <div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ transform: `translateX(${offset}px)`, transition: offset === -80 || offset === 0 ? 'transform 0.2s ease-out' : 'none' }}
          className="relative z-10"
        >
          <Link href={`/routines/${routine.id}`}>
            <Card className="transition-colors hover:bg-accent/20 active:bg-accent/40">
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

      {/* Delete confirmation modal */}
      <Modal
        open={showConfirm}
        onClose={() => { setShowConfirm(false); setOffset(0); }}
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
              onClick={() => { setShowConfirm(false); setOffset(0); }}
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
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-primary transition-colors hover:bg-accent active:bg-accent/70"
            aria-label="Create routine"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      <div className="px-4 py-6">
        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card p-5"
              >
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

        {/* Empty State */}
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

        {/* Routines List */}
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

      {/* Create Routine Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewRoutineName("");
        }}
        title="New Routine"
      >
        <div className="space-y-4">
          <Input
            label="Routine Name"
            placeholder="e.g., Push Day, Full Body, Leg Day"
            value={newRoutineName}
            onChange={(e) => setNewRoutineName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateRoutine();
            }}
            autoFocus
          />
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <Button
            fullWidth
            onClick={handleCreateRoutine}
            disabled={!newRoutineName.trim()}
          >
            Create Routine
          </Button>
        </div>
      </Modal>
    </div>
  );
}
