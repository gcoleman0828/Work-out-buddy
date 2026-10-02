import type { SQLiteDatabase } from 'expo-sqlite';
import { ConfigService } from '@/config/ConfigService';
import { ConfigKey } from '@/config/configDefinitions';
import type { LogLevel } from '@/constants/enums';
import { LogSource } from '@/constants/enums';
import { ConfigRepository } from '@/db/repositories/ConfigRepository';
import { DashboardCardRepository } from '@/db/repositories/DashboardCardRepository';
import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { LogRepository } from '@/db/repositories/LogRepository';
import { WorkoutRepository } from '@/db/repositories/WorkoutRepository';
import { AffirmationService } from './AffirmationService';
import { DashboardService } from './DashboardService';
import { ExerciseLibraryService } from './ExerciseLibraryService';
import { SeedExerciseVerifier } from './ExerciseVerifier';
import { logger } from './Logger';
import { WorkoutService } from './WorkoutService';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Everything the UI can reach. Built once per database connection. */
export interface Services {
  config: ConfigService;
  logs: LogRepository;
  library: ExerciseLibraryService;
  workouts: WorkoutService;
  dashboard: DashboardService;
  affirmations: AffirmationService;
}

/**
 * Composition root: the only place classes are wired together. Repositories get
 * the database; services get repositories and config. Swapping an
 * implementation (e.g. the AI exercise verifier) is a change to this file only.
 */
export function createServices(db: SQLiteDatabase): Services {
  const logs = new LogRepository(db);
  const config = new ConfigService(new ConfigRepository(db));
  const exerciseRepo = new ExerciseRepository(db);
  const workoutRepo = new WorkoutRepository(db);
  const cardRepo = new DashboardCardRepository(db);

  const library = new ExerciseLibraryService(exerciseRepo, config, new SeedExerciseVerifier());
  const affirmations = new AffirmationService(config);
  return {
    config,
    logs,
    library,
    workouts: new WorkoutService(workoutRepo, library, config),
    dashboard: new DashboardService(workoutRepo, cardRepo, library, affirmations, config),
    affirmations,
  };
}

/**
 * Startup sequence, in dependency order. Failures throw to ServicesProvider,
 * which shows a friendly full-screen error and has already logged the cause.
 */
export async function bootstrapServices(services: Services): Promise<void> {
  // 1. Persist logs first so any later failure in this function is captured.
  logger.attachSink((entry) => services.logs.insert(entry));
  // 2. Config, then settings that depend on it.
  await services.config.load();
  logger.setMinLevel(services.config.getString<LogLevel>(ConfigKey.LoggingMinLevel));
  const retentionDays = services.config.getNumber(ConfigKey.LoggingRetentionDays);
  await services.logs.purgeOlderThan(Date.now() - retentionDays * MS_PER_DAY);
  // 3. Reference data.
  await services.library.ensureSeeded();
  await services.dashboard.ensureCards();
  logger.info(LogSource.App, 'Startup complete');
}
