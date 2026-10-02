import { type DistanceUnit, SetKind, type WeightUnit } from '@/constants/enums';
import type { WorkoutSet } from '@/domain/models';
import type { PersonalBest } from '@/domain/stats';
import { formatDistance, formatDuration, formatWeight, fromKg, trimNumber } from '@/domain/units';

/** "full_body" -> "Full body". Used for enum values shown to people. */
export function labelOf(value: string): string {
  const spaced = value.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export interface DisplayUnits {
  weight: WeightUnit;
  distance: DistanceUnit;
}

/** One-line summary of a set: "10 × 135 lb · 5:20 · 2 mi". */
export function describeSet(
  set: Pick<WorkoutSet, 'reps' | 'weightKg' | 'durationSec' | 'distanceM'>,
  units: DisplayUnits,
): string {
  const parts: string[] = [];
  if (set.reps && set.weightKg) parts.push(`${set.reps} × ${formatWeight(set.weightKg, units.weight)}`);
  else if (set.reps) parts.push(`${set.reps} reps`);
  else if (set.weightKg) parts.push(formatWeight(set.weightKg, units.weight));
  if (set.distanceM) parts.push(formatDistance(set.distanceM, units.distance));
  if (set.durationSec) parts.push(formatDuration(set.durationSec));
  return parts.join(' · ');
}

export function describePersonalBest(pb: PersonalBest, units: DisplayUnits): string {
  switch (pb.kind) {
    case SetKind.Strength:
      return `${pb.reps} × ${formatWeight(pb.weightKg ?? 0, units.weight)} (est. 1RM ${trimNumber(fromKg(pb.value, units.weight), 0)} ${units.weight})`;
    case SetKind.Reps:
      return `${trimNumber(pb.value, 0)} reps`;
    case SetKind.Distance:
      return formatDistance(pb.value, units.distance);
    default:
      return formatDuration(pb.value);
  }
}

/** Parse a user-typed decimal ("135", "2.5"); null for blank, NaN for garbage. */
export function parseNumberInput(text: string): number | null {
  const t = text.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : Number.NaN;
}
