import { SetKind } from '@/constants/enums';
import { toDayKey } from './dates';
import type { SlimSet } from './models';

/**
 * Pure statistics over logged sets: one-rep-max estimates, personal bests,
 * averages, volume. No database or UI imports, so everything here is unit
 * tested. Weights are kg and distances meters (storage units).
 */

/** Epley formula constant: e1RM = weight * (1 + reps / 30). */
const EPLEY_DIVISOR = 30;
/** Tolerance so floating-point noise never counts as a "new" personal best. */
const PB_EPSILON = 1e-9;

/**
 * Estimated one-rep max (Epley). Returns null when reps are outside the range
 * where the estimate is meaningful (maxReps comes from config).
 */
export function estimateOneRepMax(weightKg: number, reps: number, maxReps: number): number | null {
  if (weightKg <= 0 || reps <= 0 || reps > maxReps) return null;
  return reps === 1 ? weightKg : weightKg * (1 + reps / EPLEY_DIVISOR);
}

export interface SetScore {
  kind: SetKind;
  value: number;
}

/** What a set "counts as" for personal-best comparison. Null when it has no metric. */
export function scoreSet(s: SlimSet, maxRepsFor1rm: number): SetScore | null {
  const weight = s.weightKg ?? 0;
  const reps = s.reps ?? 0;
  if (weight > 0 && reps > 0) {
    const e1rm = estimateOneRepMax(weight, reps, maxRepsFor1rm);
    if (e1rm !== null) return { kind: SetKind.Strength, value: e1rm };
  }
  if (reps > 0) return { kind: SetKind.Reps, value: reps };
  if ((s.distanceM ?? 0) > 0) return { kind: SetKind.Distance, value: s.distanceM as number };
  if ((s.durationSec ?? 0) > 0) return { kind: SetKind.Duration, value: s.durationSec as number };
  return null;
}

export interface PersonalBest {
  exerciseId: number;
  kind: SetKind;
  value: number;
  weightKg: number | null;
  reps: number | null;
  achievedAt: number;
}

const KIND_PRIORITY: readonly SetKind[] = [
  SetKind.Strength,
  SetKind.Reps,
  SetKind.Distance,
  SetKind.Duration,
];

/**
 * The best set per exercise, one PB per kind, reduced to each exercise's most
 * meaningful kind (strength beats reps beats distance beats time). Ordered by
 * most recently achieved.
 */
export function personalBests(sets: readonly SlimSet[], maxRepsFor1rm: number): PersonalBest[] {
  const best = new Map<string, PersonalBest>();
  for (const s of sets) {
    const score = scoreSet(s, maxRepsFor1rm);
    if (!score) continue;
    const key = `${s.exerciseId}:${score.kind}`;
    const current = best.get(key);
    if (!current || score.value > current.value) {
      best.set(key, {
        exerciseId: s.exerciseId,
        kind: score.kind,
        value: score.value,
        weightKg: s.weightKg,
        reps: s.reps,
        achievedAt: s.createdAt,
      });
    }
  }
  const primary = new Map<number, PersonalBest>();
  for (const pb of best.values()) {
    const current = primary.get(pb.exerciseId);
    if (!current || KIND_PRIORITY.indexOf(pb.kind) < KIND_PRIORITY.indexOf(current.kind)) {
      primary.set(pb.exerciseId, pb);
    }
  }
  return [...primary.values()].sort((a, b) => b.achievedAt - a.achievedAt);
}

/**
 * True when `candidate` beats every earlier set of the same exercise and kind.
 * The first-ever set of a kind is a baseline, not a personal best.
 */
export function isNewPersonalBest(
  previous: readonly SlimSet[],
  candidate: SlimSet,
  maxRepsFor1rm: number,
): boolean {
  const score = scoreSet(candidate, maxRepsFor1rm);
  if (!score) return false;
  let bestPrevious: number | null = null;
  for (const p of previous) {
    if (p.exerciseId !== candidate.exerciseId) continue;
    const ps = scoreSet(p, maxRepsFor1rm);
    if (ps && ps.kind === score.kind && (bestPrevious === null || ps.value > bestPrevious)) {
      bestPrevious = ps.value;
    }
  }
  return bestPrevious !== null && score.value > bestPrevious + PB_EPSILON;
}

export interface Averages {
  setCount: number;
  avgReps: number | null;
  avgWeightKg: number | null;
  avgDurationSec: number | null;
  totalVolumeKg: number;
}

function mean(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
}

/** Averages only include sets where the field exists (a bodyweight set has no weight). */
export function computeAverages(sets: readonly SlimSet[]): Averages {
  const reps = sets.flatMap((s) => (s.reps && s.reps > 0 ? [s.reps] : []));
  const weights = sets.flatMap((s) => (s.weightKg && s.weightKg > 0 ? [s.weightKg] : []));
  const durations = sets.flatMap((s) => (s.durationSec && s.durationSec > 0 ? [s.durationSec] : []));
  const totalVolumeKg = sets.reduce(
    (sum, s) => sum + (s.weightKg && s.reps ? s.weightKg * s.reps : 0),
    0,
  );
  return {
    setCount: sets.length,
    avgReps: mean(reps),
    avgWeightKg: mean(weights),
    avgDurationSec: mean(durations),
    totalVolumeKg,
  };
}

/** Total lifted volume (kg x reps) for each of the given local day keys. */
export function volumeByDay(sets: readonly SlimSet[], dayKeys: readonly string[]): number[] {
  const totals = new Map<string, number>(dayKeys.map((k) => [k, 0]));
  for (const s of sets) {
    const key = toDayKey(s.createdAt);
    if (totals.has(key) && s.weightKg && s.reps) {
      totals.set(key, (totals.get(key) ?? 0) + s.weightKg * s.reps);
    }
  }
  return dayKeys.map((k) => totals.get(k) ?? 0);
}
