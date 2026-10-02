import { ConfigKey } from '@/config/configDefinitions';
import type { ConfigService } from '@/config/ConfigService';
import { ErrorCode, LogSource } from '@/constants/enums';
import type { SetPatch, WorkoutRepository } from '@/db/repositories/WorkoutRepository';
import { AppError } from '@/errors/AppError';
import { toDayKey } from '@/domain/dates';
import type { Exercise, ParsedCommand, SlimSet, WorkoutSetWithExercise } from '@/domain/models';
import {
  type Averages,
  computeAverages,
  isNewPersonalBest,
  type PersonalBest,
  personalBests,
} from '@/domain/stats';
import { toKg, toMeters } from '@/domain/units';
import type { ExerciseLibraryService } from './ExerciseLibraryService';
import { logger } from './Logger';

/** One request to record `sets` identical sets of an exercise (storage units: kg, meters). */
export interface LogRequest {
  exerciseName: string;
  sets: number;
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  distanceM: number | null;
  notes: string | null;
}

export interface ExerciseSummary {
  setCount: number;
  averages: Averages;
  best: PersonalBest | null;
}

export interface LogResult {
  exercise: Exercise;
  /** True when this log created a new library entry. */
  createdExercise: boolean;
  setsLogged: number;
  newPersonalBest: boolean;
  /** Up-to-date numbers for this exercise, including what was just logged. */
  summary: ExerciseSummary;
}

/** Convert the parser's output (user units) into a storage-unit LogRequest. */
export function requestFromParsed(parsed: ParsedCommand): LogRequest {
  if (!parsed.exerciseName) {
    throw new AppError(ErrorCode.Validation, 'I could not tell which exercise that was. Add the exercise name.');
  }
  return {
    exerciseName: parsed.exerciseName,
    sets: parsed.sets ?? 1,
    reps: parsed.reps,
    weightKg: parsed.weight ? toKg(parsed.weight.value, parsed.weight.unit) : null,
    durationSec: parsed.durationSec,
    distanceM: parsed.distance ? toMeters(parsed.distance.value, parsed.distance.unit) : null,
    notes: null,
  };
}

const hasMetric = (r: Pick<LogRequest, 'reps' | 'weightKg' | 'durationSec' | 'distanceM'>) =>
  (r.reps ?? 0) > 0 || (r.durationSec ?? 0) > 0 || (r.distanceM ?? 0) > 0;

const NEED_METRIC_MESSAGE = 'Add the reps, a time, or a distance so there is something to record.';

/** Recording sets, personal-best detection, and per-exercise summaries. */
export class WorkoutService {
  constructor(
    private readonly repo: WorkoutRepository,
    private readonly library: ExerciseLibraryService,
    private readonly config: ConfigService,
  ) {}

  /** Save `request.sets` sets atomically; returns what the UI needs for instant feedback. */
  async log(request: LogRequest): Promise<LogResult> {
    if (!hasMetric(request)) throw new AppError(ErrorCode.Validation, NEED_METRIC_MESSAGE);

    const maxSets = this.config.getNumber(ConfigKey.LogMaxSetsPerCommand);
    if (!Number.isInteger(request.sets) || request.sets < 1 || request.sets > maxSets) {
      throw new AppError(ErrorCode.Validation, `Sets must be between 1 and ${maxSets}.`);
    }

    const { exercise, created } = await this.library.resolveOrCreate(request.exerciseName);
    const now = Date.now();
    const sessionId = await this.repo.getOrCreateSessionId(toDayKey(now), now);
    const maxRepsFor1rm = this.config.getNumber(ConfigKey.StatsMaxRepsFor1rm);

    const history = await this.repo.slimSetsForExercise(exercise.id);
    const running: SlimSet[] = [...history];
    let newPersonalBest = false;
    const rows = [];
    for (let i = 0; i < request.sets; i += 1) {
      // +i ms keeps identical sets in the order they were entered.
      const candidate: SlimSet = {
        exerciseId: exercise.id,
        reps: request.reps,
        weightKg: request.weightKg,
        durationSec: request.durationSec,
        distanceM: request.distanceM,
        createdAt: now + i,
      };
      const isPr = isNewPersonalBest(running, candidate, maxRepsFor1rm);
      newPersonalBest = newPersonalBest || isPr;
      running.push(candidate);
      rows.push({ ...candidate, sessionId, notes: request.notes, isPr });
    }
    await this.repo.insertSets(rows);

    logger.info(LogSource.Workout, `Logged ${request.sets} set(s) of ${exercise.name}`);
    return {
      exercise,
      createdExercise: created,
      setsLogged: request.sets,
      newPersonalBest,
      summary: this.summarize(running, maxRepsFor1rm),
    };
  }

  /** Newest first. */
  today(): Promise<WorkoutSetWithExercise[]> {
    return this.repo.setsForDay(toDayKey(Date.now()));
  }

  getSet(id: number): Promise<WorkoutSetWithExercise | null> {
    return this.repo.getSet(id);
  }

  /** Note: editing a set does not re-evaluate its personal-best flag (see ARCHITECTURE.md). */
  async updateSet(id: number, patch: SetPatch): Promise<void> {
    if (!hasMetric(patch)) throw new AppError(ErrorCode.Validation, NEED_METRIC_MESSAGE);
    await this.repo.updateSet(id, patch);
  }

  deleteSet(id: number): Promise<void> {
    return this.repo.deleteSet(id);
  }

  async summaryFor(exerciseId: number): Promise<ExerciseSummary> {
    const history = await this.repo.slimSetsForExercise(exerciseId);
    return this.summarize(history, this.config.getNumber(ConfigKey.StatsMaxRepsFor1rm));
  }

  private summarize(sets: readonly SlimSet[], maxRepsFor1rm: number): ExerciseSummary {
    return {
      setCount: sets.length,
      averages: computeAverages(sets),
      best: personalBests(sets, maxRepsFor1rm)[0] ?? null,
    };
  }
}
