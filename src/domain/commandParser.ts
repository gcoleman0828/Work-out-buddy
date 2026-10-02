import { DistanceUnit, ParsedField, WeightUnit } from '@/constants/enums';
import type { ParsedCommand, ParsedDistance, ParsedWeight } from './models';
import { replaceNumberWords } from './text';

/**
 * Rule-based natural-language parser for workout commands, e.g.
 *   "Add a record for 60 jumping jacks in 5min 20 seconds"
 *   "3 sets of 10 bench press at 135 lbs"
 *   "squat 5x5 at 100 kg"
 *
 * Why rules and not an AI call: it is instant, free, works offline in the gym,
 * and is deterministic (same words, same result), which makes it unit-testable.
 * Anything it is unsure about comes back with a low `confidence`, which the UI
 * uses to ask the user to review instead of saving. An AI fallback can be added
 * later behind the same ParsedCommand shape without touching callers.
 *
 * Known limits: exercise names are whatever words are left over, so synonyms
 * ("ran" vs "running") are not resolved here; a trailing bare number with no
 * "at/with" ("bench press 135") is left in the name.
 */

export interface ParseOptions {
  /** Unit assumed when the user says "at 135" without a unit. */
  defaultWeightUnit: WeightUnit;
}

/** Algorithm weights (not user-tunable): how much each part contributes to confidence. */
const CONFIDENCE_WEIGHTS = {
  exercise: 0.5,
  completeMetric: 0.4,
  weightOnlyMetric: 0.2,
  unitCertainty: 0.1,
} as const;

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;

const FILLER_PREFIX =
  /^\s*(?:please\s+)?(?:(?:i\s+)?(?:just\s+)?(?:did|do|completed|finished)\s+)?(?:(?:add|log|record|create|save|enter)\s+)?(?:(?:a|an|the)\s+)?(?:new\s+)?(?:(?:record|set|sets|entry|workout|exercise)\s+)?(?:(?:for|of)\s+)?/;

const CLOCK = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/;
const UNIT_DURATION = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/g;
const EXPLICIT_WEIGHT = /(\d+(?:\.\d+)?)\s*(kilograms?|kilos?|kgs?|pounds?|lbs?)\b/;
const UNITLESS_WEIGHT =
  /(?:\bat|\bwith|\busing|@)\s*(\d+(?:\.\d+)?)\b(?!\s*(?:reps?|sets?|x\b|×))/;
const DISTANCE = /(\d+(?:\.\d+)?)\s*(kilometers?|kilometres?|km|miles?|mi|meters?|metres?|m)\b/;
const SETS_OF_REPS = /(\d+)\s*sets?\s*(?:of|x|×|with)?\s*(\d+)\s*(?:reps?|repetitions?)?\b/;
const SETS_X_REPS = /(\d+)\s*(?:x|×|by)\s*(\d+)/;
const SETS_ONLY = /(\d+)\s*sets?\b/;
const REPS_ONLY = /(\d+)\s*(?:reps?|repetitions?)\b/;
const LEADING_COUNT = /^\s*(\d+)\s+(?=[a-z])/;

const LEADING_CONNECTOR = /^(?:of|for|at|in|with|using|and|to|a|an|the|my|did|do)\s+/;
const TRAILING_CONNECTOR =
  /\s+(?:of|for|at|in|with|using|and|to|over|within|took|about|around|a|an|the)$/;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function weightUnitOf(word: string): WeightUnit {
  return word.startsWith('k') ? WeightUnit.Kg : WeightUnit.Lb;
}

function distanceUnitOf(word: string): DistanceUnit {
  if (word.startsWith('k')) return DistanceUnit.Km;
  if (word.startsWith('mi')) return DistanceUnit.Mi;
  return DistanceUnit.M;
}

function secondsPerUnit(word: string): number {
  if (word.startsWith('h')) return SECONDS_PER_HOUR;
  if (word.startsWith('m')) return SECONDS_PER_MINUTE;
  return 1;
}

/** Replace the first match of `re` in `text` with a space; returns [match, newText]. */
function take(text: string, re: RegExp): [RegExpMatchArray | null, string] {
  const m = text.match(re);
  return m ? [m, text.replace(re, ' ')] : [null, text];
}

export function parseWorkoutCommand(raw: string, options: ParseOptions): ParsedCommand {
  let t = replaceNumberWords(raw.toLowerCase())
    .replace(/×/g, ' x ')
    .replace(/[,;!?]/g, ' ')
    .replace(/\.(?!\d)/g, ' ')
    .replace(FILLER_PREFIX, ' ');

  // --- duration: "5:20", "5min 20 seconds", "1 hour" (summed) -------------
  let durationSec: number | null = null;
  const clock = t.match(CLOCK);
  if (clock) {
    const [, a, b, c] = clock;
    durationSec =
      c !== undefined
        ? Number(a) * SECONDS_PER_HOUR + Number(b) * SECONDS_PER_MINUTE + Number(c)
        : Number(a) * SECONDS_PER_MINUTE + Number(b);
    t = t.replace(CLOCK, ' ');
  }
  t = t.replace(UNIT_DURATION, (_m, n: string, unit: string) => {
    durationSec = (durationSec ?? 0) + Number(n) * secondsPerUnit(unit);
    return ' ';
  });

  // --- weight ----------------------------------------------------------------
  let weight: ParsedWeight | null = null;
  const [wExplicit, afterExplicit] = take(t, EXPLICIT_WEIGHT);
  if (wExplicit) {
    weight = { value: Number(wExplicit[1]), unit: weightUnitOf(wExplicit[2]), assumedUnit: false };
    t = afterExplicit;
  } else {
    const [wBare, afterBare] = take(t, UNITLESS_WEIGHT);
    if (wBare) {
      weight = { value: Number(wBare[1]), unit: options.defaultWeightUnit, assumedUnit: true };
      t = afterBare;
    }
  }

  // --- distance --------------------------------------------------------------
  let distance: ParsedDistance | null = null;
  const [dMatch, afterDistance] = take(t, DISTANCE);
  if (dMatch) {
    distance = { value: Number(dMatch[1]), unit: distanceUnitOf(dMatch[2]) };
    t = afterDistance;
  }

  // --- sets and reps -----------------------------------------------------------
  let sets: number | null = null;
  let reps: number | null = null;
  let m: RegExpMatchArray | null;

  [m, t] = take(t, SETS_OF_REPS);
  if (m) {
    sets = Number(m[1]);
    reps = Number(m[2]);
  }
  if (sets === null) {
    [m, t] = take(t, SETS_X_REPS);
    if (m) {
      sets = Number(m[1]);
      reps = Number(m[2]);
    }
  }
  if (sets === null) {
    [m, t] = take(t, SETS_ONLY);
    if (m) sets = Number(m[1]);
  }
  if (reps === null) {
    [m, t] = take(t, REPS_ONLY);
    if (m) reps = Number(m[1]);
  }
  if (reps === null) {
    m = t.match(LEADING_COUNT);
    if (m) {
      reps = Number(m[1]);
      t = t.replace(LEADING_COUNT, ' ');
    }
  }

  // --- exercise name = whatever words are left ---------------------------------
  let name = t
    .replace(/\b(?:sets?|reps?|repetitions?)\b/g, ' ')
    .replace(/[@]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  let previous: string;
  do {
    previous = name;
    name = name.replace(LEADING_CONNECTOR, '').replace(TRAILING_CONNECTOR, '').trim();
  } while (name !== previous);
  const exerciseName = /[a-z]/.test(name) && name.length >= 2 ? name : null;

  // --- confidence --------------------------------------------------------------
  const completeMetric = reps !== null || durationSec !== null || distance !== null;
  const missing: ParsedField[] = [];
  let confidence = 0;
  if (exerciseName) confidence += CONFIDENCE_WEIGHTS.exercise;
  else missing.push(ParsedField.Exercise);

  if (completeMetric) {
    confidence += CONFIDENCE_WEIGHTS.completeMetric;
  } else if (weight) {
    confidence += CONFIDENCE_WEIGHTS.weightOnlyMetric;
    missing.push(ParsedField.Reps);
  } else {
    missing.push(ParsedField.Metric);
  }
  if (!weight?.assumedUnit) confidence += CONFIDENCE_WEIGHTS.unitCertainty;

  return {
    raw,
    exerciseName,
    sets,
    reps,
    weight,
    durationSec,
    distance,
    confidence: round2(confidence),
    missing,
  };
}
