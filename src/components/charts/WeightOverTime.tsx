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
  ReferenceLine,
} from 'recharts';
import type { WeightOverTimePoint } from '@/lib/types';
import {
  SERIES_COLORS,
  TREND_LINE_COLOR,
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

interface WeightOverTimeProps {
  data: WeightOverTimePoint[];
  timeRange?: TimeRange;
}

/**
 * Line chart showing max weight used per session over time with a trend line.
 */
export default function WeightOverTime({
  data,
  timeRange = 'ALL',
}: WeightOverTimeProps) {
  const filtered = useMemo(() => filterByTimeRange(data, timeRange), [data, timeRange]);

  // Compute linear trend line endpoints
  const trendLine = useMemo(() => {
    if (filtered.length < 2) return null;
    const n = filtered.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += filtered[i].weight;
      sumXY += i * filtered[i].weight;
      sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return filtered.map((point, i) => ({
      ...point,
      trend: Math.round((intercept + slope * i) * 10) / 10,
    }));
  }, [filtered]);

  const chartData = trendLine ?? filtered.map((p) => ({ ...p, trend: p.weight }));

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-white/40 text-sm">
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_MIN_HEIGHT}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid {...cartesianGridProps} />
        <XAxis dataKey="date" tickFormatter={formatDateLabel} {...xAxisProps} />
        <YAxis {...yAxisProps} unit=" lbs" />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          labelFormatter={formatDateLabel}
          formatter={(value: any, name: any) => {
            if (name === 'trend') return [`${value} lbs`, 'Trend'];
            return [`${value} lbs`, 'Weight'];
          }}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke={SERIES_COLORS[0]}
          strokeWidth={2}
          dot={{ r: 4, fill: SERIES_COLORS[0], strokeWidth: 0 }}
          activeDot={{ r: 6, fill: SERIES_COLORS[0], strokeWidth: 2, stroke: '#fff' }}
        />
        <Line
          type="monotone"
          dataKey="trend"
          stroke={TREND_LINE_COLOR}
          strokeWidth={1.5}
          strokeDasharray="6 3"
          dot={false}
          activeDot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
