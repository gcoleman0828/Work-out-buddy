import { describe, expect, it } from 'vitest';
import { calculatePlates, smallestIncrement } from '@/domain/plates';
import { buildWarmup } from '@/domain/warmup';

const LB_PLATES = [45, 35, 25, 10, 5, 2.5];
const KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

describe('calculatePlates', () => {
  it('loads 225 lb as two 45s per side', () => {
    const r = calculatePlates({ targetWeight: 225, barWeight: 45, plates: LB_PLATES });
    expect(r.perSide).toEqual([{ plate: 45, count: 2 }]);
    expect(r.achievedWeight).toBe(225);
    expect(r.shortfall).toBe(0);
  });

  it('mixes plates greedily for 100 kg', () => {
    const r = calculatePlates({ targetWeight: 100, barWeight: 20, plates: KG_PLATES });
    expect(r.perSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ]);
    expect(r.achievedWeight).toBe(100);
  });

  it('reports the shortfall when the target cannot be hit exactly', () => {
    const r = calculatePlates({ targetWeight: 136, barWeight: 45, plates: LB_PLATES });
    expect(r.achievedWeight).toBe(135);
    expect(r.shortfall).toBe(1);
  });

  it('flags targets lighter than the bar', () => {
    const r = calculatePlates({ targetWeight: 30, barWeight: 45, plates: LB_PLATES });
    expect(r.belowBar).toBe(true);
    expect(r.perSide).toEqual([]);
    expect(r.achievedWeight).toBe(45);
  });

  it('has no floating-point drift with fractional plates', () => {
    // 72.5 = 20 bar + 2 x (25 + 1.25)
    const r = calculatePlates({ targetWeight: 72.5, barWeight: 20, plates: KG_PLATES });
    expect(r.perSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 1.25, count: 1 },
    ]);
    expect(r.achievedWeight).toBe(72.5);
    expect(r.shortfall).toBe(0);
  });

  it('reports an unreachable fractional target honestly', () => {
    // 71.25 needs 0.625 kg per side; the lightest plate is 1.25.
    const r = calculatePlates({ targetWeight: 71.25, barWeight: 20, plates: KG_PLATES });
    expect(r.achievedWeight).toBe(70);
    expect(r.shortfall).toBe(1.25);
  });

  it('smallestIncrement is a pair of the lightest plate', () => {
    expect(smallestIncrement(LB_PLATES)).toBe(5);
    expect(smallestIncrement([])).toBe(0);
  });
});

describe('buildWarmup', () => {
  const scheme = [
    { pct: 0.4, reps: 10 },
    { pct: 0.6, reps: 5 },
    { pct: 0.8, reps: 3 },
    { pct: 0.9, reps: 1 },
  ];

  it('builds an increasing ladder rounded to the increment', () => {
    const w = buildWarmup({ workingWeight: 225, barWeight: 45, scheme, increment: 5 });
    expect(w.map((s) => s.weight)).toEqual([90, 135, 180, 205]);
    expect(w.map((s) => s.reps)).toEqual([10, 5, 3, 1]);
  });

  it('never goes below the bar and drops duplicate steps', () => {
    const w = buildWarmup({ workingWeight: 60, barWeight: 45, scheme, increment: 5 });
    expect(w[0].weight).toBe(45);
    const weights = w.map((s) => s.weight);
    expect(new Set(weights).size).toBe(weights.length);
    expect(weights.every((x) => x < 60)).toBe(true);
  });

  it('returns nothing when the working weight is the bar', () => {
    expect(buildWarmup({ workingWeight: 45, barWeight: 45, scheme, increment: 5 })).toEqual([]);
  });
});
