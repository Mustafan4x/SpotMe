'use client';

import React from 'react';
import { Dumbbell, Layers, Weight } from 'lucide-react';
import type { WeeklyStats } from '@/lib/types';
import { formatNumber } from './ChartTheme';

interface WeeklySummaryProps {
  stats: WeeklyStats;
}

interface StatItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}

function StatItem({ icon: Icon, label, value, color }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <div
        className="flex items-center justify-center w-9 h-9 rounded-xl"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <span className="text-lg font-bold text-white">{value}</span>
      <span className="text-[11px] text-white/50 text-center leading-tight">{label}</span>
    </div>
  );
}

/**
 * Dashboard card showing total workouts, total sets, and total volume
 * for the current week.
 */
export default function WeeklySummary({ stats }: WeeklySummaryProps) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      <h3 className="text-sm font-semibold text-white/70 mb-3">This Week</h3>
      <div className="flex items-start justify-between gap-2">
        <StatItem
          icon={Dumbbell}
          label="Workouts"
          value={String(stats.total_workouts)}
          color="#6366f1"
        />
        <StatItem
          icon={Layers}
          label="Sets"
          value={String(stats.total_sets)}
          color="#22d3ee"
        />
        <StatItem
          icon={Weight}
          label="Volume"
          value={formatNumber(stats.total_volume)}
          color="#34d399"
        />
      </div>
    </div>
  );
}
