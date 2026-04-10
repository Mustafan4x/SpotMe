'use client';

import React, { useMemo } from 'react';
import { TrendingUp, Minus, TrendingDown } from 'lucide-react';
import { calculateTrend } from '@/lib/calculations';
import { TREND_COLORS } from './ChartTheme';

interface TrendIndicatorProps {
  /** Array of recent numeric values (e.g. weights, volumes, 1RM estimates) */
  dataPoints: number[];
}

const TREND_CONFIG = {
  improving: {
    icon: TrendingUp,
    label: "You're improving",
    color: TREND_COLORS.up,
  },
  steady: {
    icon: Minus,
    label: 'Holding steady',
    color: TREND_COLORS.steady,
  },
  declining: {
    icon: TrendingDown,
    label: 'Trending down',
    color: TREND_COLORS.down,
  },
} as const;

/**
 * Compact trend indicator that sits alongside any chart.
 * Calculates trend from data points using linear regression and shows
 * a color-coded icon + label.
 */
export default function TrendIndicator({ dataPoints }: TrendIndicatorProps) {
  const direction = useMemo(() => calculateTrend(dataPoints), [dataPoints]);
  const config = TREND_CONFIG[direction];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-1.5" style={{ color: config.color }}>
      <Icon size={16} strokeWidth={2.5} />
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  );
}
