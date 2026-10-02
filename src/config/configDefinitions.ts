import { DistanceUnit, LogLevel, WeightUnit } from '@/constants/enums';

/**
 * Every tunable value in the app. Rule: no hardcoded thresholds, timeouts, URLs
 * or limits anywhere else in the code.
 *
 * Storage model: the `config` table holds only the user's OVERRIDES. If a key
 * has no row, the default below applies. That keeps the table tiny and lets a
 * new app version add keys without a data migration. Users change values in
 * Settings; no rebuild or redeploy is needed.
 *
 * Secrets (API keys) must NOT live here: this table is plain SQLite. They go in
 * expo-secure-store behind a dedicated service when the AI phase starts.
 */
export enum ConfigKey {
  // Units
  UnitsWeight = 'units.weight',
  UnitsDistance = 'units.distance',
  // Rest timer
  TimerRestSeconds = 'timer.restSeconds',
  TimerAutoStart = 'timer.autoStartAfterSet',
  TimerTickMs = 'timer.tickMs',
  TimerPresetsSeconds = 'timer.presetsSeconds',
  TimerExtendSeconds = 'timer.extendSeconds',
  // Calculators
  PlatesBarKg = 'plates.barKg',
  PlatesBarLb = 'plates.barLb',
  PlatesAvailableKg = 'plates.availableKg',
  PlatesAvailableLb = 'plates.availableLb',
  WarmupScheme = 'warmup.scheme',
  // Logging / NLP
  LogAutoSaveMinConfidence = 'log.autoSaveMinConfidence',
  LogMaxSetsPerCommand = 'log.maxSetsPerCommand',
  StatsMaxRepsFor1rm = 'stats.maxRepsFor1rm',
  // Exercise library
  ExerciseMatchMinScore = 'exercise.match.minScore',
  ExerciseEnrichMinConfidence = 'exercise.enrich.minConfidence',
  LibraryYoutubeUrlTemplate = 'library.youtubeSearchUrlTemplate',
  LibraryYoutubeQuerySuffix = 'library.youtubeQuerySuffix',
  LibrarySuggestionLimit = 'library.suggestionLimit',
  // Dashboard
  GoalWeeklyWorkoutDays = 'goal.weeklyWorkoutDays',
  DashboardLookbackDays = 'dashboard.lookbackDays',
  DashboardPbCount = 'dashboard.pbCardCount',
  // Daily affirmation
  AffirmationUrl = 'affirmation.url',
  AffirmationTimeoutMs = 'affirmation.timeoutMs',
  AffirmationMaxChars = 'affirmation.maxChars',
  // Logging
  LoggingRetentionDays = 'logging.retentionDays',
  LoggingMinLevel = 'logging.minLevel',
  LoggingViewerRows = 'logging.viewerRows',
  // UI
  UiNoticeDurationMs = 'ui.noticeDurationMs',
}

export enum ConfigType {
  Number = 'number',
  Boolean = 'boolean',
  String = 'string',
  Json = 'json',
}

export enum ConfigGroup {
  Units = 'Units',
  RestTimer = 'Rest timer',
  Calculators = 'Calculators',
  Logging = 'Workout logging',
  Library = 'Exercise library',
  Dashboard = 'Dashboard',
  Affirmation = 'Daily affirmation',
  Diagnostics = 'Diagnostics',
  Interface = 'Interface',
}

export interface ConfigDefinition {
  key: ConfigKey;
  type: ConfigType;
  /** Raw string form, exactly as it would be stored in the table. */
  defaultValue: string;
  group: ConfigGroup;
  label: string;
  description: string;
  /** If set, the value must be one of these (rendered as chips). */
  options?: readonly string[];
  /** Return an error message, or null when the raw value is acceptable. */
  validate?: (raw: string) => string | null;
}

// ---- validators (small, reusable) -----------------------------------------
const num = (raw: string): number | null => {
  const n = Number(raw);
  return raw.trim() !== '' && Number.isFinite(n) ? n : null;
};

const positiveNumber = (raw: string) => {
  const n = num(raw);
  return n !== null && n > 0 ? null : 'Enter a number greater than 0.';
};

const nonNegativeInt = (raw: string) => {
  const n = num(raw);
  return n !== null && Number.isInteger(n) && n >= 0 ? null : 'Enter a whole number, 0 or more.';
};

const positiveInt = (raw: string) => {
  const n = num(raw);
  return n !== null && Number.isInteger(n) && n > 0 ? null : 'Enter a whole number greater than 0.';
};

const fraction = (raw: string) => {
  const n = num(raw);
  return n !== null && n >= 0 && n <= 1 ? null : 'Enter a number between 0 and 1.';
};

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const numberArray = (raw: string) => {
  const v = parseJson(raw);
  return Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'number' && x > 0)
    ? null
    : 'Enter a JSON list of positive numbers, e.g. [45, 25, 10].';
};

const warmupScheme = (raw: string) => {
  const v = parseJson(raw);
  const ok =
    Array.isArray(v) &&
    v.every(
      (s) =>
        s !== null &&
        typeof s === 'object' &&
        typeof (s as { pct?: unknown }).pct === 'number' &&
        (s as { pct: number }).pct > 0 &&
        (s as { pct: number }).pct < 1 &&
        Number.isInteger((s as { reps?: unknown }).reps) &&
        (s as { reps: number }).reps > 0,
    );
  return ok ? null : 'Enter JSON like [{"pct":0.5,"reps":8}] with pct between 0 and 1.';
};

const urlTemplate = (raw: string) =>
  raw.includes('{query}') ? null : 'The URL must contain the {query} placeholder.';

const optionalUrl = (raw: string) =>
  raw === '' || /^https:\/\//.test(raw) ? null : 'Leave empty, or enter an https:// URL.';

// ---- the definitions -------------------------------------------------------
const DEFINITIONS: readonly ConfigDefinition[] = [
  {
    key: ConfigKey.UnitsWeight,
    type: ConfigType.String,
    defaultValue: WeightUnit.Lb,
    group: ConfigGroup.Units,
    label: 'Weight unit',
    description: 'Weights are always stored in kg and converted for display.',
    options: Object.values(WeightUnit),
  },
  {
    key: ConfigKey.UnitsDistance,
    type: ConfigType.String,
    defaultValue: DistanceUnit.Mi,
    group: ConfigGroup.Units,
    label: 'Distance unit',
    description: 'Distances are always stored in meters and converted for display.',
    options: Object.values(DistanceUnit),
  },
  {
    key: ConfigKey.TimerRestSeconds,
    type: ConfigType.Number,
    defaultValue: '90',
    group: ConfigGroup.RestTimer,
    label: 'Default rest (seconds)',
    description: 'Length of the automatic rest timer after each logged set.',
    validate: positiveInt,
  },
  {
    key: ConfigKey.TimerAutoStart,
    type: ConfigType.Boolean,
    defaultValue: 'true',
    group: ConfigGroup.RestTimer,
    label: 'Auto-start after each set',
    description: 'Start the rest timer automatically when a set is saved.',
  },
  {
    key: ConfigKey.TimerTickMs,
    type: ConfigType.Number,
    defaultValue: '250',
    group: ConfigGroup.RestTimer,
    label: 'Timer refresh (ms)',
    description: 'How often the countdown redraws. Lower is smoother but uses more battery.',
    validate: positiveInt,
  },
  {
    key: ConfigKey.TimerPresetsSeconds,
    type: ConfigType.Json,
    defaultValue: '[60, 90, 120, 180]',
    group: ConfigGroup.RestTimer,
    label: 'Timer presets (seconds)',
    description: 'Quick-start buttons on the Tools tab.',
    validate: numberArray,
  },
  {
    key: ConfigKey.TimerExtendSeconds,
    type: ConfigType.Number,
    defaultValue: '30',
    group: ConfigGroup.RestTimer,
    label: 'Extend by (seconds)',
    description: 'Seconds added by the "+" button while a timer is running.',
    validate: positiveInt,
  },
  {
    key: ConfigKey.PlatesBarKg,
    type: ConfigType.Number,
    defaultValue: '20',
    group: ConfigGroup.Calculators,
    label: 'Barbell weight (kg)',
    description: 'Used by the plate calculator when the unit is kg.',
    validate: positiveNumber,
  },
  {
    key: ConfigKey.PlatesBarLb,
    type: ConfigType.Number,
    defaultValue: '45',
    group: ConfigGroup.Calculators,
    label: 'Barbell weight (lb)',
    description: 'Used by the plate calculator when the unit is lb.',
    validate: positiveNumber,
  },
  {
    key: ConfigKey.PlatesAvailableKg,
    type: ConfigType.Json,
    defaultValue: '[25, 20, 15, 10, 5, 2.5, 1.25]',
    group: ConfigGroup.Calculators,
    label: 'Plates you own (kg, per side)',
    description: 'JSON list. Only these plates are used by the calculator.',
    validate: numberArray,
  },
  {
    key: ConfigKey.PlatesAvailableLb,
    type: ConfigType.Json,
    defaultValue: '[45, 35, 25, 10, 5, 2.5]',
    group: ConfigGroup.Calculators,
    label: 'Plates you own (lb, per side)',
    description: 'JSON list. Only these plates are used by the calculator.',
    validate: numberArray,
  },
  {
    key: ConfigKey.WarmupScheme,
    type: ConfigType.Json,
    defaultValue:
      '[{"pct":0.4,"reps":10},{"pct":0.6,"reps":5},{"pct":0.8,"reps":3},{"pct":0.9,"reps":1}]',
    group: ConfigGroup.Calculators,
    label: 'Warm-up scheme',
    description: 'Each step is a fraction of the working weight and a rep count.',
    validate: warmupScheme,
  },
  {
    key: ConfigKey.LogAutoSaveMinConfidence,
    type: ConfigType.Number,
    defaultValue: '0.85',
    group: ConfigGroup.Logging,
    label: 'Auto-save confidence',
    description:
      'Typed or spoken commands that the parser is at least this sure about are saved without a review step. Set above 1 to always review.',
    validate: (raw) => (num(raw) !== null ? null : 'Enter a number.'),
  },
  {
    key: ConfigKey.LogMaxSetsPerCommand,
    type: ConfigType.Number,
    defaultValue: '20',
    group: ConfigGroup.Logging,
    label: 'Max sets per command',
    description: 'Guards against a mis-heard "500 sets" creating hundreds of rows.',
    validate: positiveInt,
  },
  {
    key: ConfigKey.StatsMaxRepsFor1rm,
    type: ConfigType.Number,
    defaultValue: '12',
    group: ConfigGroup.Logging,
    label: 'Max reps for 1RM estimate',
    description: 'Sets with more reps than this are not used to estimate a one-rep max.',
    validate: positiveInt,
  },
  {
    key: ConfigKey.ExerciseMatchMinScore,
    type: ConfigType.Number,
    defaultValue: '0.8',
    group: ConfigGroup.Library,
    label: 'Name match threshold',
    description: 'How similar a typed name must be to an existing exercise to reuse it.',
    validate: fraction,
  },
  {
    key: ConfigKey.ExerciseEnrichMinConfidence,
    type: ConfigType.Number,
    defaultValue: '0.9',
    group: ConfigGroup.Library,
    label: 'Verification confidence',
    description:
      'A new exercise is auto-filled and marked verified only if it matches a known exercise at least this well.',
    validate: fraction,
  },
  {
    key: ConfigKey.LibraryYoutubeUrlTemplate,
    type: ConfigType.String,
    defaultValue: 'https://www.youtube.com/results?search_query={query}',
    group: ConfigGroup.Library,
    label: 'Video search URL',
    description: 'Template for the how-to video link. {query} is replaced with the exercise name.',
    validate: urlTemplate,
  },
  {
    key: ConfigKey.LibraryYoutubeQuerySuffix,
    type: ConfigType.String,
    defaultValue: 'proper form tutorial',
    group: ConfigGroup.Library,
    label: 'Video search suffix',
    description: 'Extra words appended to the exercise name in the video search.',
  },
  {
    key: ConfigKey.LibrarySuggestionLimit,
    type: ConfigType.Number,
    defaultValue: '5',
    group: ConfigGroup.Library,
    label: 'Exercise suggestions shown',
    description: 'Maximum matching exercises listed under the exercise box while logging.',
    validate: positiveInt,
  },
  {
    key: ConfigKey.GoalWeeklyWorkoutDays,
    type: ConfigType.Number,
    defaultValue: '3',
    group: ConfigGroup.Dashboard,
    label: 'Weekly workout-day goal',
    description: 'Target number of workout days in any rolling 7 days. Drives the gauge.',
    validate: positiveInt,
  },
  {
    key: ConfigKey.DashboardLookbackDays,
    type: ConfigType.Number,
    defaultValue: '30',
    group: ConfigGroup.Dashboard,
    label: 'Averages window (days)',
    description: 'How far back the averages card looks.',
    validate: positiveInt,
  },
  {
    key: ConfigKey.DashboardPbCount,
    type: ConfigType.Number,
    defaultValue: '5',
    group: ConfigGroup.Dashboard,
    label: 'Personal bests shown',
    description: 'Number of exercises listed on the personal bests card.',
    validate: positiveInt,
  },
  {
    key: ConfigKey.AffirmationUrl,
    type: ConfigType.String,
    defaultValue: '',
    group: ConfigGroup.Affirmation,
    label: 'Affirmation source URL',
    description:
      'https:// endpoint returning plain text or JSON with a "text" field. Empty uses the built-in messages.',
    validate: optionalUrl,
  },
  {
    key: ConfigKey.AffirmationTimeoutMs,
    type: ConfigType.Number,
    defaultValue: '5000',
    group: ConfigGroup.Affirmation,
    label: 'Affirmation timeout (ms)',
    description: 'How long to wait for the source before falling back to built-in messages.',
    validate: positiveInt,
  },
  {
    key: ConfigKey.AffirmationMaxChars,
    type: ConfigType.Number,
    defaultValue: '300',
    group: ConfigGroup.Affirmation,
    label: 'Affirmation max length',
    description: 'Longer text from the source is cut off so it fits the dashboard card.',
    validate: positiveInt,
  },
  {
    key: ConfigKey.LoggingRetentionDays,
    type: ConfigType.Number,
    defaultValue: '14',
    group: ConfigGroup.Diagnostics,
    label: 'Keep logs (days)',
    description: 'Older log entries are deleted at startup.',
    validate: positiveInt,
  },
  {
    key: ConfigKey.LoggingMinLevel,
    type: ConfigType.String,
    defaultValue: LogLevel.Info,
    group: ConfigGroup.Diagnostics,
    label: 'Minimum log level',
    description: 'Entries below this level are not recorded.',
    options: Object.values(LogLevel),
  },
  {
    key: ConfigKey.LoggingViewerRows,
    type: ConfigType.Number,
    defaultValue: '200',
    group: ConfigGroup.Diagnostics,
    label: 'Log viewer rows',
    description: 'Maximum entries loaded into the log viewer.',
    validate: positiveInt,
  },
  {
    key: ConfigKey.UiNoticeDurationMs,
    type: ConfigType.Number,
    defaultValue: '6000',
    group: ConfigGroup.Interface,
    label: 'Error banner duration (ms)',
    description: 'How long the friendly error banner stays on screen.',
    validate: positiveInt,
  },
];

export const CONFIG_DEFINITIONS: Readonly<Record<ConfigKey, ConfigDefinition>> = Object.freeze(
  Object.fromEntries(DEFINITIONS.map((d) => [d.key, d])) as Record<ConfigKey, ConfigDefinition>,
);

export const CONFIG_KEYS_IN_ORDER: readonly ConfigKey[] = DEFINITIONS.map((d) => d.key);

/** Validate a raw string for a key against its type, options and custom rule. */
export function validateConfigValue(key: ConfigKey, raw: string): string | null {
  const def = CONFIG_DEFINITIONS[key];
  if (def.options && !def.options.includes(raw)) {
    return `Choose one of: ${def.options.join(', ')}.`;
  }
  if (def.type === ConfigType.Boolean && raw !== 'true' && raw !== 'false') {
    return 'Must be true or false.';
  }
  if (def.type === ConfigType.Number && num(raw) === null) {
    return 'Enter a number.';
  }
  if (def.type === ConfigType.Json && parseJson(raw) === undefined) {
    return 'Enter valid JSON.';
  }
  return def.validate ? def.validate(raw) : null;
}
