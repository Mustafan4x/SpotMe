"use client";

import { useState } from "react";
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
} from "lucide-react";
import { useRoutines } from "@/hooks/useRoutines";

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

export default function RoutinesPage() {
  const {
    routines,
    loading,
    createRoutine,
  } = useRoutines();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState("");

  const handleCreateRoutine = async () => {
    const name = newRoutineName.trim();
    if (!name) return;
    await createRoutine(name);
    setNewRoutineName("");
    setShowCreateModal(false);
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
                <Link key={routine.id} href={`/routines/${routine.id}`}>
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
