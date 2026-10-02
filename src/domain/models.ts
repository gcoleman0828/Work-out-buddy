import type {
  DashboardCardType,
  DistanceUnit,
  EnrichmentStatus,
  Equipment,
  ExerciseSource,
  MuscleGroup,
  ParsedField,
  WeightUnit,
} from '@/constants/enums';

/** An entry in the exercise library. */
export interface Exercise {
  id: number;
  name: string;
  /** Normalized form used for uniqueness (see normalizeNameKey). */
  nameKey: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  instructions: string | null;
  /** Local file URI (later phases). Never a blob: images live on disk. */
  imageUri: string | null;
  videoUrl: string | null;
  source: ExerciseSource;
  enrichmentStatus: EnrichmentStatus;
  enrichmentConfidence: number | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * One logged set / record. Weight is kg and distance is meters, always; the UI
 * converts. Any of reps/weight/duration/distance may be null ("60 jumping jacks
 * in 5:20" has no weight).
 */
export interface WorkoutSet {
  id: number;
  sessionId: number;
  exerciseId: number;
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  distanceM: number | null;
  notes: string | null;
  isPr: boolean;
  createdAt: number;
}

export interface WorkoutSetWithExercise extends WorkoutSet {
  exerciseName: string;
}

/** The minimum a set needs for statistics (kept small: dashboards scan many rows). */
export type SlimSet = Pick<
  WorkoutSet,
  'exerciseId' | 'reps' | 'weightKg' | 'durationSec' | 'distanceM' | 'createdAt'
>;

export interface Session {
  id: number;
  /** Local calendar day, "YYYY-MM-DD". One session per day. */
  dayKey: string;
  startedAt: number;
  endedAt: number | null;
  notes: string | null;
}

export interface DashboardCardConfig {
  id: number;
  cardType: DashboardCardType;
  position: number;
  enabled: boolean;
}

export interface ParsedWeight {
  value: number;
  unit: WeightUnit;
  /** True when the user gave no unit and we assumed their default. */
  assumedUnit: boolean;
}

export interface ParsedDistance {
  value: number;
  unit: DistanceUnit;
}

/** Output of the natural-language command parser. */
export interface ParsedCommand {
  raw: string;
  exerciseName: string | null;
  /** Number of identical sets to create ("3 sets of 10"). Null means 1. */
  sets: number | null;
  reps: number | null;
  weight: ParsedWeight | null;
  durationSec: number | null;
  distance: ParsedDistance | null;
  /** 0..1, how sure the parser is that the command is complete and correct. */
  confidence: number;
  missing: ParsedField[];
}
