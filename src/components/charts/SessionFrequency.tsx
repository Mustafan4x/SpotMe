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
import type { SessionFrequencyPoint } from '@/lib/types';
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
  type TimeRange,
} from './ChartTheme';

interface SessionFrequencyProps {
  data: SessionFrequencyPoint[];
  timeRange?: TimeRange;
}

/**
 * Bar chart showing how often a routine was performed per week/month.
 * X-axis: weeks or months. Y-axis: session count.
 */
export default function SessionFrequency({
  data,
  timeRange = 'ALL',
}: SessionFrequencyProps) {
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
        <YAxis {...yAxisProps} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          labelFormatter={formatDateLabel}
          formatter={(value: any) => [`${value} session${Number(value) !== 1 ? 's' : ''}`, 'Count']}
        />
        <Bar
          dataKey="count"
          fill={SERIES_COLORS[5]}
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
