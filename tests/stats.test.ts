import { describe, expect, it } from 'vitest';
import { SetKind } from '@/constants/enums';
import type { SlimSet } from '@/domain/models';
import {
  computeAverages,
  estimateOneRepMax,
  isNewPersonalBest,
  personalBests,
  scoreSet,
  volumeByDay,
} from '@/domain/stats';
import { toDayKey } from '@/domain/dates';

const MAX_REPS = 12;
const set = (o: Partial<SlimSet> & { exerciseId: number }): SlimSet => ({
  reps: null,
  weightKg: null,
  durationSec: null,
  distanceM: null,
  createdAt: 1,
  ...o,
});

describe('estimateOneRepMax', () => {
  it('uses the Epley formula', () => {
    expect(estimateOneRepMax(100, 10, MAX_REPS)).toBeCloseTo(133.33, 1);
  });
  it('returns the weight itself for a single', () => {
    expect(estimateOneRepMax(140, 1, MAX_REPS)).toBe(140);
  });
  it('returns null outside the reliable rep range or for bad input', () => {
    expect(estimateOneRepMax(100, 13, MAX_REPS)).toBeNull();
    expect(estimateOneRepMax(0, 5, MAX_REPS)).toBeNull();
    expect(estimateOneRepMax(100, 0, MAX_REPS)).toBeNull();
  });
});

describe('scoreSet', () => {
  it('classifies by the richest metric present', () => {
    expect(scoreSet(set({ exerciseId: 1, weightKg: 100, reps: 5 }), MAX_REPS)?.kind).toBe(SetKind.Strength);
    expect(scoreSet(set({ exerciseId: 1, reps: 60, durationSec: 320 }), MAX_REPS)?.kind).toBe(SetKind.Reps);
    expect(scoreSet(set({ exerciseId: 1, distanceM: 5000 }), MAX_REPS)?.kind).toBe(SetKind.Distance);
    expect(scoreSet(set({ exerciseId: 1, durationSec: 90 }), MAX_REPS)?.kind).toBe(SetKind.Duration);
    expect(scoreSet(set({ exerciseId: 1 }), MAX_REPS)).toBeNull();
  });
});

describe('isNewPersonalBest', () => {
  const history = [set({ exerciseId: 1, weightKg: 100, reps: 5 })];

  it('is true when the estimate beats history', () => {
    expect(isNewPersonalBest(history, set({ exerciseId: 1, weightKg: 105, reps: 5 }), MAX_REPS)).toBe(true);
  });
  it('is false when equal or lower', () => {
    expect(isNewPersonalBest(history, set({ exerciseId: 1, weightKg: 100, reps: 5 }), MAX_REPS)).toBe(false);
    expect(isNewPersonalBest(history, set({ exerciseId: 1, weightKg: 90, reps: 5 }), MAX_REPS)).toBe(false);
  });
  it('treats the first set of a kind as a baseline, not a PR', () => {
    expect(isNewPersonalBest([], set({ exerciseId: 1, weightKg: 100, reps: 5 }), MAX_REPS)).toBe(false);
  });
  it('ignores other exercises and other kinds', () => {
    expect(isNewPersonalBest(history, set({ exerciseId: 2, weightKg: 200, reps: 5 }), MAX_REPS)).toBe(false);
    expect(isNewPersonalBest(history, set({ exerciseId: 1, reps: 50 }), MAX_REPS)).toBe(false);
  });
});

describe('personalBests', () => {
  it('keeps the best per exercise, preferring strength, newest first', () => {
    const sets = [
      set({ exerciseId: 1, weightKg: 100, reps: 5, createdAt: 10 }),
      set({ exerciseId: 1, weightKg: 110, reps: 3, createdAt: 20 }),
      set({ exerciseId: 1, reps: 40, createdAt: 30 }),
      set({ exerciseId: 2, reps: 60, createdAt: 40 }),
    ];
    const pbs = personalBests(sets, MAX_REPS);
    expect(pbs.map((p) => p.exerciseId)).toEqual([2, 1]);
    const lift = pbs.find((p) => p.exerciseId === 1)!;
    expect(lift.kind).toBe(SetKind.Strength);
    expect(lift.weightKg).toBe(110);
  });
});

describe('computeAverages', () => {
  it('averages only sets that have the field', () => {
    const a = computeAverages([
      set({ exerciseId: 1, weightKg: 100, reps: 10 }),
      set({ exerciseId: 1, weightKg: 50, reps: 20 }),
      set({ exerciseId: 2, reps: 30 }),
    ]);
    expect(a.setCount).toBe(3);
    expect(a.avgReps).toBeCloseTo(20);
    expect(a.avgWeightKg).toBeCloseTo(75);
    expect(a.totalVolumeKg).toBe(2000);
    expect(a.avgDurationSec).toBeNull();
  });
  it('is safe on an empty list', () => {
    expect(computeAverages([])).toEqual({
      setCount: 0, avgReps: null, avgWeightKg: null, avgDurationSec: null, totalVolumeKg: 0,
    });
  });
});

describe('volumeByDay', () => {
  it('sums kg x reps into the right local day bucket', () => {
    const noon = new Date(2026, 9, 1, 12).getTime();
    const key = toDayKey(noon);
    const out = volumeByDay(
      [set({ exerciseId: 1, weightKg: 50, reps: 10, createdAt: noon }), set({ exerciseId: 1, reps: 10, createdAt: noon })],
      ['2000-01-01', key],
    );
    expect(out).toEqual([0, 500]);
  });
});
