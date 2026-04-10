// Types defined inline — replace with imports from ./types.ts when available

export interface WorkoutSet {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
  rir: number;
  logged_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  routine_id: string;
  started_at: string;
  completed_at: string | null;
}

export interface WeeklyStats {
  totalWorkouts: number;
  totalSets: number;
  totalVolume: number;
}

export interface PR {
  exercise_id: string;
  type: "max_weight" | "max_reps";
  value: number;
  /** For max_reps PRs, the weight at which the rep record was set */
  weight?: number;
}

/**
 * Calculate total volume across a list of sets.
 * Volume = sum of (reps * weight) for each set.
 */
export function calculateVolume(sets: WorkoutSet[]): number {
  if (sets.length === 0) return 0;
  return sets.reduce((total, set) => total + set.reps * set.weight, 0);
}

/**
 * Estimate one-rep max using the Epley formula: weight * (1 + reps / 30).
 * Returns 0 for invalid inputs (zero/negative weight or reps).
 * For a single rep (reps === 1) the 1RM equals the weight itself.
 */
export function calculate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Determine trend direction from recent data points using simple linear regression.
 * Requires at least 2 points; uses the last 4 data points.
 *
 * The normalised slope (relative to the mean) drives the classification:
 *   |normalised slope| < 0.02  ->  "steady"
 *   positive slope             ->  "improving"
 *   negative slope             ->  "declining"
 */
export function calculateTrend(
  dataPoints: number[]
): "improving" | "steady" | "declining" {
  if (dataPoints.length < 2) return "steady";

  const recent = dataPoints.slice(-4);
  const n = recent.length;

  // Simple linear regression: y = a + b*x  where x = 0,1,...,n-1
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += recent[i];
    sumXY += i * recent[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const mean = sumY / n;

  // Avoid division by zero when all values are 0
  if (mean === 0) return "steady";

  const normalisedSlope = slope / Math.abs(mean);

  if (Math.abs(normalisedSlope) < 0.02) return "steady";
  return normalisedSlope > 0 ? "improving" : "declining";
}

/**
 * Get the start of the current ISO week (Monday 00:00:00).
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Compute weekly stats (Mon-Sun) for the current week.
 */
export function getWeeklyStats(
  sessions: WorkoutSession[],
  sets: WorkoutSet[]
): WeeklyStats {
  if (sessions.length === 0) {
    return { totalWorkouts: 0, totalSets: 0, totalVolume: 0 };
  }

  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const thisWeekSessions = sessions.filter((s) => {
    const d = new Date(s.started_at);
    return d >= weekStart && d < weekEnd;
  });

  const sessionIds = new Set(thisWeekSessions.map((s) => s.id));
  const thisWeekSets = sets.filter((s) => sessionIds.has(s.session_id));

  return {
    totalWorkouts: thisWeekSessions.length,
    totalSets: thisWeekSets.length,
    totalVolume: calculateVolume(thisWeekSets),
  };
}

/**
 * Count consecutive weeks (going back from the current week) that contain
 * at least one workout session.
 */
export function getStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;

  const now = new Date();
  let currentWeekStart = getWeekStart(now);
  let streak = 0;

  // Build a set of week-start timestamps that have at least one session
  const weekTimestamps = new Set<number>();
  for (const session of sessions) {
    const ws = getWeekStart(new Date(session.started_at));
    weekTimestamps.add(ws.getTime());
  }

  while (weekTimestamps.has(currentWeekStart.getTime())) {
    streak++;
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  }

  return streak;
}

/**
 * Detect new personal records by comparing current workout sets against
 * historical sets.
 *
 * Two PR types:
 *  - max_weight: highest weight ever used for an exercise (any rep count)
 *  - max_reps: most reps at a specific weight for an exercise
 */
export function detectPRs(
  currentSets: WorkoutSet[],
  historySets: WorkoutSet[]
): PR[] {
  if (currentSets.length === 0) return [];

  const prs: PR[] = [];

  // Build history lookup maps per exercise
  const historyMaxWeight = new Map<string, number>();
  // Map<exercise_id, Map<weight, maxReps>>
  const historyMaxReps = new Map<string, Map<number, number>>();

  for (const set of historySets) {
    if (set.reps <= 0 || set.weight <= 0) continue;

    const currentMax = historyMaxWeight.get(set.exercise_id) ?? 0;
    if (set.weight > currentMax) {
      historyMaxWeight.set(set.exercise_id, set.weight);
    }

    if (!historyMaxReps.has(set.exercise_id)) {
      historyMaxReps.set(set.exercise_id, new Map());
    }
    const repsMap = historyMaxReps.get(set.exercise_id)!;
    const currentRepsMax = repsMap.get(set.weight) ?? 0;
    if (set.reps > currentRepsMax) {
      repsMap.set(set.weight, set.reps);
    }
  }

  // Track which PRs we've already found this session to avoid duplicates
  const foundWeightPRs = new Set<string>();
  const foundRepPRs = new Set<string>();

  for (const set of currentSets) {
    if (set.reps <= 0 || set.weight <= 0) continue;

    // Check max weight PR
    const prevMaxWeight = historyMaxWeight.get(set.exercise_id) ?? 0;
    if (set.weight > prevMaxWeight && !foundWeightPRs.has(set.exercise_id)) {
      prs.push({
        exercise_id: set.exercise_id,
        type: "max_weight",
        value: set.weight,
      });
      foundWeightPRs.add(set.exercise_id);
    }

    // Check max reps PR at this weight
    const repsMap = historyMaxReps.get(set.exercise_id);
    const prevMaxReps = repsMap?.get(set.weight) ?? 0;
    const repKey = `${set.exercise_id}:${set.weight}`;
    if (set.reps > prevMaxReps && !foundRepPRs.has(repKey)) {
      prs.push({
        exercise_id: set.exercise_id,
        type: "max_reps",
        value: set.reps,
        weight: set.weight,
      });
      foundRepPRs.add(repKey);
    }
  }

  return prs;
}
