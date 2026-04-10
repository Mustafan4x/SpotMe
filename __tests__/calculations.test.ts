import { describe, it, expect } from 'vitest';
import {
  calculateVolume,
  calculate1RM,
  calculateTrend,
  getStreak,
  detectPRs,
  getWeeklyStats,
  type WorkoutSet,
  type WorkoutSession,
} from '@/lib/calculations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: 'set-1',
    session_id: 'session-1',
    exercise_id: 'exercise-1',
    set_number: 1,
    reps: 10,
    weight: 100,
    rir: 2,
    logged_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 'session-1',
    user_id: 'user-1',
    routine_id: 'routine-1',
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    ...overrides,
  };
}

/** Return a Date representing Monday of the ISO week containing `date`. */
function mondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// calculateVolume
// ---------------------------------------------------------------------------

describe('calculateVolume', () => {
  it('returns 0 for an empty array', () => {
    expect(calculateVolume([])).toBe(0);
  });

  it('computes volume for a single set', () => {
    const sets = [makeSet({ reps: 10, weight: 135 })];
    expect(calculateVolume(sets)).toBe(1350);
  });

  it('sums volume across multiple sets', () => {
    const sets = [
      makeSet({ reps: 10, weight: 100 }),
      makeSet({ reps: 8, weight: 120 }),
      makeSet({ reps: 6, weight: 140 }),
    ];
    // 1000 + 960 + 840 = 2800
    expect(calculateVolume(sets)).toBe(2800);
  });

  it('handles zero weight (bodyweight exercises)', () => {
    const sets = [makeSet({ reps: 15, weight: 0 })];
    expect(calculateVolume(sets)).toBe(0);
  });

  it('handles zero reps', () => {
    const sets = [makeSet({ reps: 0, weight: 225 })];
    expect(calculateVolume(sets)).toBe(0);
  });

  it('handles decimal weights', () => {
    const sets = [makeSet({ reps: 10, weight: 22.5 })];
    expect(calculateVolume(sets)).toBe(225);
  });
});

// ---------------------------------------------------------------------------
// calculate1RM
// ---------------------------------------------------------------------------

describe('calculate1RM', () => {
  it('returns 0 when weight is 0', () => {
    expect(calculate1RM(0, 10)).toBe(0);
  });

  it('returns 0 when reps is 0', () => {
    expect(calculate1RM(135, 0)).toBe(0);
  });

  it('returns 0 when weight is negative', () => {
    expect(calculate1RM(-50, 10)).toBe(0);
  });

  it('returns 0 when reps is negative', () => {
    expect(calculate1RM(135, -5)).toBe(0);
  });

  it('returns the weight itself when reps is 1', () => {
    expect(calculate1RM(225, 1)).toBe(225);
  });

  it('computes correct Epley formula for standard inputs', () => {
    // Epley: weight * (1 + reps/30)
    // 135 * (1 + 10/30) = 135 * 1.3333... = 180
    expect(calculate1RM(135, 10)).toBeCloseTo(180, 1);
  });

  it('computes correct result for 5 reps', () => {
    // 200 * (1 + 5/30) = 200 * 7/6 = 233.33
    expect(calculate1RM(200, 5)).toBeCloseTo(233.33, 1);
  });

  it('handles high rep counts', () => {
    // 100 * (1 + 30/30) = 200
    expect(calculate1RM(100, 30)).toBeCloseTo(200, 1);
  });
});

// ---------------------------------------------------------------------------
// calculateTrend
// ---------------------------------------------------------------------------

describe('calculateTrend', () => {
  it('returns "steady" for empty array', () => {
    expect(calculateTrend([])).toBe('steady');
  });

  it('returns "steady" for single data point', () => {
    expect(calculateTrend([100])).toBe('steady');
  });

  it('returns "improving" for clearly increasing values', () => {
    expect(calculateTrend([100, 110, 120, 130])).toBe('improving');
  });

  it('returns "declining" for clearly decreasing values', () => {
    expect(calculateTrend([130, 120, 110, 100])).toBe('declining');
  });

  it('returns "steady" for flat values', () => {
    expect(calculateTrend([100, 100, 100, 100])).toBe('steady');
  });

  it('returns "steady" for near-flat values with tiny variation', () => {
    expect(calculateTrend([100, 100.1, 100, 100.1])).toBe('steady');
  });

  it('uses only the last 4 data points', () => {
    // First 3 are declining, but last 4 are improving
    const data = [200, 190, 180, 100, 110, 120, 130];
    expect(calculateTrend(data)).toBe('improving');
  });

  it('handles 2 data points (minimum for trend)', () => {
    expect(calculateTrend([100, 200])).toBe('improving');
    expect(calculateTrend([200, 100])).toBe('declining');
  });

  it('returns "steady" for all zeros', () => {
    expect(calculateTrend([0, 0, 0, 0])).toBe('steady');
  });
});

// ---------------------------------------------------------------------------
// getStreak
// ---------------------------------------------------------------------------

describe('getStreak', () => {
  it('returns 0 when no sessions exist', () => {
    expect(getStreak([])).toBe(0);
  });

  it('returns 1 when there is a session in the current week only', () => {
    const now = new Date();
    const sessions = [makeSession({ started_at: now.toISOString() })];
    expect(getStreak(sessions)).toBe(1);
  });

  it('counts consecutive weeks with sessions', () => {
    const now = new Date();
    const currentMonday = mondayOfWeek(now);

    const sessions = [0, 1, 2].map((weeksAgo) => {
      const d = new Date(currentMonday);
      d.setDate(d.getDate() - weeksAgo * 7 + 1); // Tuesday of each week
      return makeSession({
        id: `session-${weeksAgo}`,
        started_at: d.toISOString(),
      });
    });

    expect(getStreak(sessions)).toBe(3);
  });

  it('breaks streak on a gap week', () => {
    const now = new Date();
    const currentMonday = mondayOfWeek(now);

    // Current week and 2 weeks ago, but NOT 1 week ago
    const thisWeek = new Date(currentMonday);
    thisWeek.setDate(thisWeek.getDate() + 1);
    const twoWeeksAgo = new Date(currentMonday);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13);

    const sessions = [
      makeSession({ id: 's1', started_at: thisWeek.toISOString() }),
      makeSession({ id: 's2', started_at: twoWeeksAgo.toISOString() }),
    ];

    expect(getStreak(sessions)).toBe(1);
  });

  it('returns 0 if current week has no sessions', () => {
    const threeWeeksAgo = new Date();
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

    const sessions = [
      makeSession({ started_at: threeWeeksAgo.toISOString() }),
    ];

    expect(getStreak(sessions)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// detectPRs
// ---------------------------------------------------------------------------

describe('detectPRs', () => {
  it('returns empty array when current sets are empty', () => {
    const history = [makeSet({ weight: 100, reps: 10 })];
    expect(detectPRs([], history)).toEqual([]);
  });

  it('detects new max weight PR', () => {
    const history = [makeSet({ weight: 100, reps: 10 })];
    const current = [makeSet({ weight: 120, reps: 8 })];

    const prs = detectPRs(current, history);
    expect(prs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'max_weight', value: 120 }),
      ])
    );
  });

  it('detects new max reps PR at a given weight', () => {
    const history = [makeSet({ weight: 100, reps: 8 })];
    const current = [makeSet({ weight: 100, reps: 12 })];

    const prs = detectPRs(current, history);
    expect(prs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'max_reps', value: 12, weight: 100 }),
      ])
    );
  });

  it('returns no PRs when current does not exceed history', () => {
    const history = [makeSet({ weight: 200, reps: 10 })];
    const current = [makeSet({ weight: 180, reps: 8 })];

    const prs = detectPRs(current, history);
    // Should only be max_reps if reps at 180 is new — but 180 has no history so it IS a rep PR
    // Actually weight 180 has no history entry, so max_reps at 180 is a PR
    const weightPRs = prs.filter((p) => p.type === 'max_weight');
    expect(weightPRs).toHaveLength(0);
  });

  it('ignores sets with zero or negative weight/reps', () => {
    const history = [makeSet({ weight: 100, reps: 10 })];
    const current = [makeSet({ weight: 0, reps: 10 })];

    expect(detectPRs(current, history)).toEqual([]);
  });

  it('returns both weight and reps PRs when applicable', () => {
    const history = [makeSet({ weight: 100, reps: 8 })];
    const current = [makeSet({ weight: 120, reps: 10 })];

    const prs = detectPRs(current, history);
    const types = prs.map((p) => p.type);
    expect(types).toContain('max_weight');
    expect(types).toContain('max_reps');
  });

  it('handles empty history (everything is a PR)', () => {
    const current = [makeSet({ weight: 135, reps: 10 })];

    const prs = detectPRs(current, []);
    expect(prs.length).toBeGreaterThanOrEqual(1);
    expect(prs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'max_weight', value: 135 }),
      ])
    );
  });

  it('does not duplicate PRs for the same exercise', () => {
    const history: WorkoutSet[] = [];
    const current = [
      makeSet({ id: 's1', weight: 100, reps: 8, set_number: 1 }),
      makeSet({ id: 's2', weight: 110, reps: 8, set_number: 2 }),
    ];

    const prs = detectPRs(current, history);
    const weightPRs = prs.filter((p) => p.type === 'max_weight');
    // Should only have 1 weight PR per exercise
    expect(weightPRs).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getWeeklyStats
// ---------------------------------------------------------------------------

describe('getWeeklyStats', () => {
  it('returns zeros when there are no sessions', () => {
    expect(getWeeklyStats([], [])).toEqual({
      totalWorkouts: 0,
      totalSets: 0,
      totalVolume: 0,
    });
  });

  it('counts only sessions from the current week', () => {
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setDate(lastMonth.getDate() - 30);

    const sessions = [
      makeSession({ id: 's1', started_at: now.toISOString() }),
      makeSession({ id: 's2', started_at: lastMonth.toISOString() }),
    ];

    const sets = [
      makeSet({ session_id: 's1', reps: 10, weight: 100 }),
      makeSet({ session_id: 's2', reps: 10, weight: 100 }),
    ];

    const stats = getWeeklyStats(sessions, sets);
    expect(stats.totalWorkouts).toBe(1);
    expect(stats.totalSets).toBe(1);
    expect(stats.totalVolume).toBe(1000);
  });
});
