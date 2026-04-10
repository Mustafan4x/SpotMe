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
  Legend,
} from 'recharts';
import type { VolumeDataPoint } from '@/lib/types';
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
  formatNumber,
  type TimeRange,
} from './ChartTheme';

interface RoutineVolumeProps {
  data: VolumeDataPoint[];
  timeRange?: TimeRange;
}

/**
 * Stacked bar chart showing total volume per session, broken down by exercise.
 * Each exercise gets a different color from the SERIES_COLORS palette.
 * Expects `data[].by_exercise` to be populated.
 */
export default function RoutineVolume({ data, timeRange = 'ALL' }: RoutineVolumeProps) {
  const filtered = useMemo(() => filterByTimeRange(data, timeRange), [data, timeRange]);

  // Collect all unique exercise names across all data points
  const exerciseNames = useMemo(() => {
    const names = new Set<string>();
    for (const d of filtered) {
      if (d.by_exercise) {
        for (const name of Object.keys(d.by_exercise)) {
          names.add(name);
        }
      }
    }
    return Array.from(names);
  }, [filtered]);

  // Flatten by_exercise into top-level keys for Recharts
  const chartData = useMemo(
    () =>
      filtered.map((d) => ({
        date: d.date,
        volume: d.volume,
        ...(d.by_exercise ?? {}),
      })),
    [filtered],
  );

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-white/40 text-sm">
        No data yet
      </div>
    );
  }

  // Fallback: if no by_exercise breakdown, show a simple bar
  if (exerciseNames.length === 0) {
    return (
      <ResponsiveContainer width="100%" height={CHART_MIN_HEIGHT}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
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
          <Bar dataKey="volume" fill={SERIES_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_MIN_HEIGHT + 40}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid {...cartesianGridProps} />
        <XAxis dataKey="date" tickFormatter={formatDateLabel} {...xAxisProps} />
        <YAxis {...yAxisProps} tickFormatter={formatNumber} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          labelFormatter={formatDateLabel}
          formatter={(value: any, name: any) => [formatNumber(Number(value)) + ' lbs', name]}
        />
        <Legend
          wrapperStyle={{
            fontSize: FONT_SIZE_AXIS,
            fontFamily: FONT_FAMILY,
            color: AXIS_COLOR,
            paddingTop: '8px',
          }}
        />
        {exerciseNames.map((name, i) => (
          <Bar
            key={name}
            dataKey={name}
            stackId="volume"
            fill={SERIES_COLORS[i % SERIES_COLORS.length]}
            radius={i === exerciseNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            maxBarSize={32}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
