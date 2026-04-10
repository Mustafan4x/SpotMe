'use client';

import React from 'react';
import { Trophy } from 'lucide-react';
import type { PersonalRecord } from '@/lib/types';

interface PRHighlightProps {
  records: PersonalRecord[];
}

const PR_TYPE_LABELS: Record<PersonalRecord['type'], string> = {
  weight: 'Max Weight',
  reps: 'Max Reps',
  volume: 'Max Volume',
  estimated_1rm: 'Est. 1RM',
};

/**
 * Personal record callout card displaying one or more PRs.
 * Uses the Trophy Lucide icon.
 */
export default function PRHighlight({ records }: PRHighlightProps) {
  if (records.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      <h3 className="text-sm font-semibold text-white/70 mb-3">Personal Records</h3>
      <div className="flex flex-col gap-2.5">
        {records.map((pr, i) => (
          <div
            key={`${pr.exercise_id}-${pr.type}-${i}`}
            className="flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20 shrink-0">
              <Trophy size={16} className="text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-amber-400/80 font-medium">
                New best! {PR_TYPE_LABELS[pr.type]}
              </p>
              <p className="text-sm font-semibold text-white truncate">
                {pr.exercise_name}: {pr.weight} lbs x {pr.reps}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
