/**
 * Plate calculator. Works in whatever unit the caller uses (kg or lb); the
 * plate list and bar weight come from config in that same unit, which avoids
 * lossy kg<->lb rounding (a 45 lb plate is not 20.4 kg in a real gym).
 *
 * Arithmetic is done in integer thousandths so 2.5 + 1.25 style sums never
 * produce 3.7500000000000004.
 */
const SCALE = 1000;
const toMilli = (v: number) => Math.round(v * SCALE);
const fromMilli = (v: number) => v / SCALE;

export interface PlateInput {
  targetWeight: number;
  barWeight: number;
  /** Plates you own, per side (any order, duplicates ignored). */
  plates: readonly number[];
}

export interface PlateCount {
  plate: number;
  count: number;
}

export interface PlateResult {
  /** Plates to load on EACH side of the bar, heaviest first. */
  perSide: PlateCount[];
  /** Weight actually achieved with those plates, bar included. */
  achievedWeight: number;
  /** Target minus achieved (0 when exact). */
  shortfall: number;
  /** True when the target is lighter than the empty bar. */
  belowBar: boolean;
}

export function calculatePlates({ targetWeight, barWeight, plates }: PlateInput): PlateResult {
  const bar = toMilli(barWeight);
  const target = toMilli(targetWeight);
  if (target < bar) {
    return { perSide: [], achievedWeight: barWeight, shortfall: 0, belowBar: true };
  }

  const available = [...new Set(plates.filter((p) => p > 0).map(toMilli))].sort((a, b) => b - a);
  let remaining = Math.floor((target - bar) / 2);
  const perSide: PlateCount[] = [];
  let placed = 0;
  for (const plate of available) {
    const count = Math.floor(remaining / plate);
    if (count > 0) {
      perSide.push({ plate: fromMilli(plate), count });
      remaining -= count * plate;
      placed += count * plate;
    }
  }
  const achieved = bar + 2 * placed;
  return {
    perSide,
    achievedWeight: fromMilli(achieved),
    shortfall: fromMilli(target - achieved),
    belowBar: false,
  };
}

/** Smallest weight change possible with the given plates (a pair of the lightest plate). */
export function smallestIncrement(plates: readonly number[]): number {
  const positive = plates.filter((p) => p > 0);
  return positive.length === 0 ? 0 : Math.min(...positive) * 2;
}
