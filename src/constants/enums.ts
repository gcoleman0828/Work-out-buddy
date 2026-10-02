/**
 * Single source of truth for every identifier that is used in more than one
 * place (rule: no magic strings). Values are persisted to SQLite, so renaming a
 * VALUE is a data migration; renaming a member name is not.
 */

export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

/** Where a log line / error came from. Used for filtering in the log viewer. */
export enum LogSource {
  App = 'app',
  Database = 'database',
  Config = 'config',
  Nlp = 'nlp',
  Library = 'library',
  Workout = 'workout',
  Dashboard = 'dashboard',
  Timer = 'timer',
  Ui = 'ui',
  Network = 'network',
  Settings = 'settings',
}

export enum WeightUnit {
  Kg = 'kg',
  Lb = 'lb',
}

export enum DistanceUnit {
  Km = 'km',
  Mi = 'mi',
  M = 'm',
}

export enum MuscleGroup {
  Chest = 'chest',
  Back = 'back',
  Shoulders = 'shoulders',
  Arms = 'arms',
  Legs = 'legs',
  Glutes = 'glutes',
  Core = 'core',
  FullBody = 'full_body',
  Cardio = 'cardio',
  Other = 'other',
}

export enum Equipment {
  Bodyweight = 'bodyweight',
  Barbell = 'barbell',
  Dumbbell = 'dumbbell',
  Kettlebell = 'kettlebell',
  Machine = 'machine',
  Cable = 'cable',
  Band = 'band',
  Cardio = 'cardio_machine',
  Other = 'other',
}

/** How an exercise got into the library. */
export enum ExerciseSource {
  Seed = 'seed',
  Manual = 'manual',
  Auto = 'auto',
}

/** Result of the "is this a real exercise?" verification pipeline. */
export enum EnrichmentStatus {
  Complete = 'complete',
  NeedsReview = 'needs_review',
}

export enum DashboardCardType {
  Affirmation = 'affirmation',
  WeeklyGoalGauge = 'weekly_goal_gauge',
  WeeklyVolumeChart = 'weekly_volume_chart',
  PersonalBests = 'personal_bests',
  Averages = 'averages',
  AiGuidance = 'ai_guidance',
}

/** Where today's affirmation text came from. */
export enum AffirmationSource {
  Remote = 'remote',
  Builtin = 'builtin',
}

/** What kind of metric a set is "about"; decides how personal bests compare. */
export enum SetKind {
  Strength = 'strength',
  Reps = 'reps',
  Distance = 'distance',
  Duration = 'duration',
}

export enum TimerStatus {
  Idle = 'idle',
  Running = 'running',
  Finished = 'finished',
}

/** Fields the command parser can report as missing. */
export enum ParsedField {
  Exercise = 'exercise',
  /** No reps, duration or distance was found. */
  Metric = 'metric',
  /** A weight was given without reps (or time/distance). */
  Reps = 'reps',
}

/** Stable machine-readable error codes carried by AppError. */
export enum ErrorCode {
  Unknown = 'unknown',
  Database = 'database',
  Validation = 'validation',
  NotFound = 'not_found',
  InUse = 'in_use',
  Network = 'network',
  Config = 'config',
}
