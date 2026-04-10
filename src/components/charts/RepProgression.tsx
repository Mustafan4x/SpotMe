'use client';

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  SERIES_COLORS,
  CHART_MIN_HEIGHT,
  AXIS_COLOR,
  FONT_SIZE_AXIS,
  FONT_FAMILY,
  xAxisProps,
  yAxisProps,
  cartesianGridProps,
  tooltipContentStyle,
  tooltipLabelStyle,
  tooltipItemStyle,
  filterByTimeRange,
  formatDateLabel,
  type TimeRange,
} from './ChartTheme';

export interface RepProgressionPoint {
  date: string;
  reps: number;
  weight: number;
}

interface RepProgressionProps {
  data: RepProgressionPoint[];
  timeRange?: TimeRange;
}

/**
 * Line chart showing reps performed at a given weight over time.
 * Users can filter by weight using a tap-to-select row of weight pills.
 */
export default function RepProgression({ data, timeRange = 'ALL' }: RepProgressionProps) {
  const filtered = useMemo(() => filterByTimeRange(data, timeRange), [data, timeRange]);

  // Extract unique weights for the filter
  const weights = useMemo(() => {
    const set = new Set(filtered.map((d) => d.weight));
    return Array.from(set).sort((a, b) => a - b);
  }, [filtered]);

  const [selectedWeight, setSelectedWeight] = useState<number | null>(null);

  // Auto-select the most common weight if none selected
  const activeWeight = useMemo(() => {
    if (selectedWeight !== null && weights.includes(selectedWeight)) return selectedWeight;
    if (weights.length === 0) return null;
    // Default: most frequently used weight
    const freq = new Map<number, number>();
    for (const d of filtered) {
      freq.set(d.weight, (freq.get(d.weight) ?? 0) + 1);
    }
    let maxW = weights[0];
    let maxC = 0;
    for (const [w, c] of freq) {
      if (c > maxC) { maxW = w; maxC = c; }
    }
    return maxW;
  }, [selectedWeight, weights, filtered]);

  const chartData = useMemo(
    () => (activeWeight !== null ? filtered.filter((d) => d.weight === activeWeight) : []),
    [filtered, activeWeight],
  );

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-white/40 text-sm">
        No data yet
      </div>
    );
  }

  return (
    <div>
      {/* Weight filter pills */}
      {weights.length > 1 && (
        <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1 scrollbar-none">
          {weights.map((w) => (
            <button
              key={w}
              onClick={() => setSelectedWeight(w)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                w === activeWeight
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {w} lbs
            </button>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={CHART_MIN_HEIGHT}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid {...cartesianGridProps} />
          <XAxis dataKey="date" tickFormatter={formatDateLabel} {...xAxisProps} />
          <YAxis {...yAxisProps} allowDecimals={false} label={{ value: 'Reps', angle: -90, position: 'insideLeft', fill: AXIS_COLOR, fontSize: FONT_SIZE_AXIS, fontFamily: FONT_FAMILY }} />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            labelFormatter={formatDateLabel}
            formatter={(value: any) => [`${value} reps`, `@ ${activeWeight} lbs`]}
          />
          <Line
            type="monotone"
            dataKey="reps"
            stroke={SERIES_COLORS[2]}
            strokeWidth={2}
            dot={{ r: 4, fill: SERIES_COLORS[2], strokeWidth: 0 }}
            activeDot={{ r: 6, fill: SERIES_COLORS[2], strokeWidth: 2, stroke: '#fff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
