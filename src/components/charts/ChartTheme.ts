import type React from 'react';

// ============================================================================
// SpotMe: Shared Recharts Theme Configuration
// ============================================================================
// Dark-mode-first color palette, axis styling, tooltip styling, and grid
// configuration used by every chart component.
// ============================================================================

// ---------------------------------------------------------------------------
// Color Palette
// ---------------------------------------------------------------------------

/** Background color for chart containers */
export const CHART_BG = '#1a1a2e';

/** Subtle grid lines */
export const GRID_COLOR = 'rgba(255, 255, 255, 0.08)';

/** Axis tick and label color */
export const AXIS_COLOR = 'rgba(255, 255, 255, 0.5)';

/** Primary data series colors (ordered for multi-series / stacked charts) */
export const SERIES_COLORS = [
  '#6366f1', // indigo-500
  '#22d3ee', // cyan-400
  '#f472b6', // pink-400
  '#facc15', // yellow-400
  '#34d399', // emerald-400
  '#fb923c', // orange-400
  '#a78bfa', // violet-400
  '#f87171', // red-400
] as const;

/** Accent color used for trend / reference lines */
export const TREND_LINE_COLOR = '#facc15';

/** Tooltip background */
export const TOOLTIP_BG = '#0f0f23';

/** Tooltip border */
export const TOOLTIP_BORDER = 'rgba(255, 255, 255, 0.12)';

/** Tooltip text */
export const TOOLTIP_TEXT = '#e2e8f0';

// ---------------------------------------------------------------------------
// Trend indicator colors
// ---------------------------------------------------------------------------

export const TREND_COLORS = {
  up: '#34d399',   // emerald-400
  steady: '#facc15', // yellow-400
  down: '#f87171',   // red-400
} as const;

// ---------------------------------------------------------------------------
// Font settings
// ---------------------------------------------------------------------------

export const FONT_FAMILY = 'Inter, system-ui, -apple-system, sans-serif';
export const FONT_SIZE_AXIS = 11;
export const FONT_SIZE_TOOLTIP = 13;
export const FONT_SIZE_LABEL = 12;

// ---------------------------------------------------------------------------
// Shared axis props
// ---------------------------------------------------------------------------

export const xAxisProps = {
  stroke: AXIS_COLOR,
  tick: { fill: AXIS_COLOR, fontSize: FONT_SIZE_AXIS, fontFamily: FONT_FAMILY },
  tickLine: false,
  axisLine: { stroke: GRID_COLOR },
} as const;

export const yAxisProps = {
  stroke: AXIS_COLOR,
  tick: { fill: AXIS_COLOR, fontSize: FONT_SIZE_AXIS, fontFamily: FONT_FAMILY },
  tickLine: false,
  axisLine: false,
  width: 45,
} as const;

// ---------------------------------------------------------------------------
// Shared tooltip style
// ---------------------------------------------------------------------------

export const tooltipContentStyle: React.CSSProperties = {
  backgroundColor: TOOLTIP_BG,
  border: `1px solid ${TOOLTIP_BORDER}`,
  borderRadius: '8px',
  padding: '8px 12px',
  color: TOOLTIP_TEXT,
  fontSize: FONT_SIZE_TOOLTIP,
  fontFamily: FONT_FAMILY,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
};

export const tooltipLabelStyle: React.CSSProperties = {
  color: TOOLTIP_TEXT,
  fontWeight: 600,
  marginBottom: '4px',
};

export const tooltipItemStyle: React.CSSProperties = {
  color: TOOLTIP_TEXT,
};

// ---------------------------------------------------------------------------
// Shared grid props
// ---------------------------------------------------------------------------

export const cartesianGridProps = {
  strokeDasharray: '3 3',
  stroke: GRID_COLOR,
  vertical: false,
} as const;

// ---------------------------------------------------------------------------
// Responsive container defaults
// ---------------------------------------------------------------------------

/** Minimum chart height on mobile */
export const CHART_MIN_HEIGHT = 220;

/** Default chart aspect ratio (width:height) — unused when height is fixed */
export const CHART_ASPECT = 1.6;

// ---------------------------------------------------------------------------
// Time range helpers
// ---------------------------------------------------------------------------

export type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

const TIME_RANGE_DAYS: Record<Exclude<TimeRange, 'ALL'>, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
};

/**
 * Filter an array of objects that have a `date: string` field to only include
 * entries within the given time range.
 */
export function filterByTimeRange<T extends { date: string }>(
  data: T[],
  timeRange: TimeRange,
): T[] {
  if (timeRange === 'ALL') return data;
  const days = TIME_RANGE_DAYS[timeRange];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return data.filter((d) => new Date(d.date) >= cutoff);
}

/**
 * Format a date string for axis labels. Short month + day on mobile.
 */
export function formatDateLabel(label: string | number | React.ReactNode): string {
  const dateStr = String(label);
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format a number for axis labels (e.g. 12500 -> "12.5k").
 */
export function formatNumber(value: number): string {
  if (value >= 10000) return `${(value / 1000).toFixed(1)}k`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toLocaleString();
}
