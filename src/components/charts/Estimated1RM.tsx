'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { WeightOverTimePoint } from '@/lib/types';
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

interface Estimated1RMProps {
  data: WeightOverTimePoint[];
  timeRange?: TimeRange;
}

/**
 * Line chart showing estimated 1RM trend over time.
 * Label: "Estimated max you could lift once"
 * Uses the Epley formula data already computed in WeightOverTimePoint.estimated_1rm.
 */
export default function Estimated1RM({ data, timeRange = 'ALL' }: Estimated1RMProps) {
  const filtered = useMemo(() => filterByTimeRange(data, timeRange), [data, timeRange]);

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-white/40 text-sm">
        No data yet
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-white/50 mb-2">
        Estimated max you could lift once
      </p>
      <ResponsiveContainer width="100%" height={CHART_MIN_HEIGHT}>
        <LineChart data={filtered} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid {...cartesianGridProps} />
          <XAxis dataKey="date" tickFormatter={formatDateLabel} {...xAxisProps} />
          <YAxis {...yAxisProps} unit=" lbs" />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            labelFormatter={formatDateLabel}
            formatter={(value: any) => [`${Math.round(Number(value))} lbs`, 'Est. 1RM']}
          />
          <Line
            type="monotone"
            dataKey="estimated_1rm"
            stroke={SERIES_COLORS[4]}
            strokeWidth={2}
            dot={{ r: 4, fill: SERIES_COLORS[4], strokeWidth: 0 }}
            activeDot={{ r: 6, fill: SERIES_COLORS[4], strokeWidth: 2, stroke: '#fff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
