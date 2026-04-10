'use client';

import React from 'react';
import { Zap } from 'lucide-react';

interface StreakCounterProps {
  /** Number of consecutive weeks with at least one workout */
  weeks: number;
}

/**
 * Visual streak display with a prominent number and Zap icon.
 * Shows consecutive weeks of workout activity.
 */
export default function StreakCounter({ weeks }: StreakCounterProps) {
  const isActive = weeks > 0;

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      <h3 className="text-sm font-semibold text-white/70 mb-3">Streak</h3>
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-12 h-12 rounded-2xl ${
            isActive ? 'bg-amber-500/20' : 'bg-white/5'
          }`}
        >
          <Zap
            size={24}
            className={isActive ? 'text-amber-400' : 'text-white/30'}
            fill={isActive ? 'currentColor' : 'none'}
          />
        </div>
        <div>
          <span className="text-3xl font-bold text-white">{weeks}</span>
          <p className="text-xs text-white/50">
            {weeks === 1 ? 'week' : 'weeks'} in a row
          </p>
        </div>
      </div>
    </div>
  );
}
