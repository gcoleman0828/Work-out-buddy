/**
 * Warm-up set generator. The scheme (percent of working weight + reps for each
 * step) is user config; this function only does the arithmetic.
 */
export interface WarmupStep {
  /** Fraction of the working weight, 0 < pct < 1. */
  pct: number;
  reps: number;
}

export interface WarmupSet {
  weight: number;
  reps: number;
  pct: number;
}

export interface WarmupInput {
  workingWeight: number;
  /** Lightest allowed set (the empty bar). */
  barWeight: number;
  scheme: readonly WarmupStep[];
  /** Round each set to a multiple of this (the smallest loadable jump). 0 disables rounding. */
  increment: number;
}

function roundToIncrement(value: number, increment: number): number {
  return increment > 0 ? Math.round(value / increment) * increment : value;
}

/**
 * Steps below the bar are lifted to the bar; steps that round up to the working
 * weight (or repeat the previous weight) are dropped, so the list is strictly
 * increasing and never includes the working set itself.
 */
export function buildWarmup({ workingWeight, barWeight, scheme, increment }: WarmupInput): WarmupSet[] {
  const result: WarmupSet[] = [];
  let last = -Infinity;
  for (const step of scheme) {
    const weight = Math.max(barWeight, roundToIncrement(workingWeight * step.pct, increment));
    if (weight >= workingWeight || weight <= last) continue;
    result.push({ weight, reps: step.reps, pct: step.pct });
    last = weight;
  }
  return result;
}
