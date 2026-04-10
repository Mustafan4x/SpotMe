'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { VolumeDataPoint } from '@/lib/types';
import {
  SERIES_COLORS,
  CHART_MIN_HEIGHT,
  xAxisProps,
  yAxisProps,
  cartesianGridProps,
  tooltipContentStyle,
  tooltipLabelStyle,
  tooltipItemStyle,
  filterByTimeRange,
  formatDateLabel,
  formatNumber,
  type TimeRange,
} from './ChartTheme';

interface VolumeChartProps {
  data: VolumeDataPoint[];
  timeRange?: TimeRange;
}

/**
 * Bar chart showing total volume (sets x reps x weight) per session.
 */
export default function VolumeChart({ data, timeRange = 'ALL' }: VolumeChartProps) {
  const filtered = useMemo(() => filterByTimeRange(data, timeRange), [data, timeRange]);

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-white/40 text-sm">
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_MIN_HEIGHT}>
      <BarChart data={filtered} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid {...cartesianGridProps} />
        <XAxis dataKey="date" tickFormatter={formatDateLabel} {...xAxisProps} />
        <YAxis {...yAxisProps} tickFormatter={formatNumber} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          labelFormatter={formatDateLabel}
          formatter={(value: any) => [formatNumber(Number(value)) + ' lbs', 'Volume']}
        />
        <Bar
          dataKey="volume"
          fill={SERIES_COLORS[1]}
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
