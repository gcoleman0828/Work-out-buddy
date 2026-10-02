import { DistanceUnit, WeightUnit } from '@/constants/enums';

/**
 * Unit conversion constants. These are physical constants, not tunables, so
 * they live in code. Storage is always kg / meters (see models.ts).
 */
export const KG_PER_LB = 0.45359237;
export const M_PER_KM = 1000;
export const M_PER_MILE = 1609.344;

export function toKg(value: number, unit: WeightUnit): number {
  return unit === WeightUnit.Kg ? value : value * KG_PER_LB;
}

export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === WeightUnit.Kg ? kg : kg / KG_PER_LB;
}

export function toMeters(value: number, unit: DistanceUnit): number {
  switch (unit) {
    case DistanceUnit.Km:
      return value * M_PER_KM;
    case DistanceUnit.Mi:
      return value * M_PER_MILE;
    default:
      return value;
  }
}

export function fromMeters(meters: number, unit: DistanceUnit): number {
  switch (unit) {
    case DistanceUnit.Km:
      return meters / M_PER_KM;
    case DistanceUnit.Mi:
      return meters / M_PER_MILE;
    default:
      return meters;
  }
}

/** Round to at most `decimals` places and drop trailing zeros ("135", "2.5"). */
export function trimNumber(value: number, decimals = 1): string {
  const factor = 10 ** decimals;
  return String(Math.round(value * factor) / factor);
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${trimNumber(fromKg(kg, unit))} ${unit}`;
}

export function formatDistance(meters: number, unit: DistanceUnit): string {
  return `${trimNumber(fromMeters(meters, unit), 2)} ${unit}`;
}

/** 320 -> "5:20", 3725 -> "1:02:05". */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Inverse of formatDuration; also accepts plain seconds ("90"). Null if invalid. */
export function parseDurationInput(text: string): number | null {
  const t = text.trim();
  if (t === '') return null;
  const parts = t.split(':');
  if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}
