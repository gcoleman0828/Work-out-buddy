import { beforeEach, describe, expect, it } from 'vitest';
import { ConfigKey } from '@/config/configDefinitions';
import { EnrichmentStatus, ErrorCode, LogLevel, ParsedField, WeightUnit } from '@/constants/enums';
import { migrateDatabase } from '@/db/migrate';
import { MIGRATIONS } from '@/db/migrations';
import { parseWorkoutCommand } from '@/domain/commandParser';
import { AppError } from '@/errors/AppError';
import { bootstrapServices, createServices, type Services } from '@/services/createServices';
import { logger } from '@/services/Logger';
import { requestFromParsed } from '@/services/WorkoutService';
import { NodeSqliteAdapter } from './helpers/nodeSqliteAdapter';

/**
 * End-to-end against a REAL SQLite engine: migrations, seeding, the headline
 * "60 jumping jacks in 5min 20 seconds" flow, personal bests, constraints,
 * config and the log collector. Only the React Native layer is not covered.
 */
let adapter: NodeSqliteAdapter;
let services: Services;

const parse = (text: string) => parseWorkoutCommand(text, { defaultWeightUnit: WeightUnit.Lb });

beforeEach(async () => {
  adapter = new NodeSqliteAdapter();
  const db = adapter.asExpoDb();
  await migrateDatabase(db);
  services = createServices(db);
  await bootstrapServices(services);
});

describe('startup', () => {
  it('applies every migration and records the version', async () => {
    const row = await adapter.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(MIGRATIONS[MIGRATIONS.length - 1].version);
  });

  it('is idempotent: a second bootstrap adds no duplicates', async () => {
    const before = (await services.library.listAll()).length;
    await services.library.ensureSeeded();
    await services.dashboard.ensureCards();
    expect((await services.library.listAll()).length).toBe(before);
    expect((await services.dashboard.listCards()).length).toBe(6);
  });

  it('seeds the library with instructions and a video link', async () => {
    const all = await services.library.listAll();
    expect(all.length).toBeGreaterThanOrEqual(20);
    const jj = all.find((e) => e.name === 'Jumping Jacks');
    expect(jj?.instructions).toBeTruthy();
    expect(jj?.videoUrl).toContain('youtube.com/results?search_query=');
    expect(jj?.videoUrl).toContain('Jumping%20Jacks');
  });
});

describe('logging', () => {
  it('records the headline example end to end', async () => {
    const parsed = parse('Add a record for 60 jumping jacks in 5min 20 seconds');
    const result = await services.workouts.log(requestFromParsed(parsed));
    expect(result.exercise.name).toBe('Jumping Jacks');
    expect(result.createdExercise).toBe(false);
    expect(result.setsLogged).toBe(1);

    const today = await services.workouts.today();
    expect(today).toHaveLength(1);
    expect(today[0]).toMatchObject({ reps: 60, durationSec: 320, weightKg: null, exerciseName: 'Jumping Jacks' });
  });

  it('stores weight in kg regardless of the unit spoken', async () => {
    await services.workouts.log(requestFromParsed(parse('10 reps bench press at 135 lbs')));
    const [set] = await services.workouts.today();
    expect(set.weightKg).toBeCloseTo(61.235, 2);
  });

  it('creates N sets from "3 sets of 10"', async () => {
    const r = await services.workouts.log(requestFromParsed(parse('3 sets of 10 squat at 100 kg')));
    expect(r.setsLogged).toBe(3);
    expect(await services.workouts.today()).toHaveLength(3);
  });

  it('flags a personal best only when history is beaten', async () => {
    const first = await services.workouts.log(requestFromParsed(parse('5 reps deadlift at 100 kg')));
    expect(first.newPersonalBest).toBe(false); // baseline
    const heavier = await services.workouts.log(requestFromParsed(parse('5 reps deadlift at 110 kg')));
    expect(heavier.newPersonalBest).toBe(true);
    const lighter = await services.workouts.log(requestFromParsed(parse('5 reps deadlift at 90 kg')));
    expect(lighter.newPersonalBest).toBe(false);
    expect(lighter.summary.setCount).toBe(3);
    expect(lighter.summary.best?.weightKg).toBe(110);
  });

  it('creates and flags an unrecognised exercise for review, without blocking the log', async () => {
    const r = await services.workouts.log(requestFromParsed(parse('12 reps zottman curl at 20 lb')));
    expect(r.createdExercise).toBe(true);
    expect(r.exercise.enrichmentStatus).toBe(EnrichmentStatus.NeedsReview);
    expect(r.exercise.videoUrl).toContain('Zottman%20Curl');
    expect(r.exercise.instructions).toBeNull();
  });

  it('reuses an existing exercise for a plural/hyphen variant, and verifies a close known name', async () => {
    const a = await services.workouts.log(requestFromParsed(parse('20 reps push ups')));
    expect(a.createdExercise).toBe(false);
    expect(a.exercise.name).toBe('Push-Up');
    const b = await services.workouts.log(requestFromParsed(parse('10 reps tricep dips')));
    expect(b.exercise.name).toBe('Tricep Dip');
  });

  it('rejects empty and oversize requests with friendly errors', async () => {
    await expect(
      services.workouts.log({ exerciseName: 'plank', sets: 1, reps: null, weightKg: null, durationSec: null, distanceM: null, notes: null }),
    ).rejects.toMatchObject({ code: ErrorCode.Validation });
    await expect(
      services.workouts.log({ exerciseName: 'plank', sets: 500, reps: 1, weightKg: null, durationSec: null, distanceM: null, notes: null }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('requires an exercise name when converting a parsed command', () => {
    const parsed = parse('20 reps');
    expect(parsed.missing).toContain(ParsedField.Exercise);
    expect(() => requestFromParsed(parsed)).toThrow(AppError);
  });

  it('edits and deletes a set', async () => {
    await services.workouts.log(requestFromParsed(parse('10 reps squat at 100 kg')));
    const [set] = await services.workouts.today();
    await services.workouts.updateSet(set.id, { reps: 12, weightKg: 100, durationSec: null, distanceM: null, notes: 'felt good' });
    expect((await services.workouts.getSet(set.id))?.reps).toBe(12);
    await services.workouts.deleteSet(set.id);
    expect(await services.workouts.today()).toHaveLength(0);
  });
});

describe('library', () => {
  it('refuses to delete an exercise that has logged sets, and deletes an unused one', async () => {
    const r = await services.workouts.log(requestFromParsed(parse('10 reps squat at 100 kg')));
    await expect(services.library.delete(r.exercise.id)).rejects.toMatchObject({ code: ErrorCode.InUse });

    const id = await services.library.save(null, {
      name: 'Sled Push', muscleGroup: r.exercise.muscleGroup, equipment: r.exercise.equipment,
      instructions: null, videoUrl: null, imageUri: null,
    });
    await services.library.delete(id);
    expect(await services.library.getById(id)).toBeNull();
  });

  it('rejects a duplicate name on save and marks a saved exercise reviewed', async () => {
    const all = await services.library.listAll();
    const squat = all.find((e) => e.name === 'Bodyweight Squat')!;
    await expect(
      services.library.save(null, { name: 'bodyweight squats', muscleGroup: squat.muscleGroup, equipment: squat.equipment, instructions: null, videoUrl: null, imageUri: null }),
    ).rejects.toMatchObject({ code: ErrorCode.Validation });

    const r = await services.workouts.log(requestFromParsed(parse('8 reps zottman curl')));
    await services.library.save(r.exercise.id, {
      name: 'Zottman Curl', muscleGroup: r.exercise.muscleGroup, equipment: r.exercise.equipment,
      instructions: 'Curl up palms up, rotate, lower palms down.', videoUrl: null, imageUri: null,
    });
    expect((await services.library.getById(r.exercise.id))?.enrichmentStatus).toBe(EnrichmentStatus.Complete);
  });

  it('suggests matches while typing', async () => {
    const names = (await services.library.suggest('ben')).map((e) => e.name);
    expect(names).toContain('Barbell Bench Press');
    expect(await services.library.suggest('')).toEqual([]);
  });
});

describe('dashboard', () => {
  it('summarises a day of logging', async () => {
    await services.workouts.log(requestFromParsed(parse('3 sets of 10 squat at 100 kg')));
    await services.workouts.log(requestFromParsed(parse('60 jumping jacks in 5:20')));
    const data = await services.dashboard.load();
    expect(data.workoutDaysThisWeek).toBe(1);
    expect(data.goalDays).toBe(3);
    expect(data.volume.valuesKg).toHaveLength(7);
    expect(data.volume.valuesKg[6]).toBe(3000); // today = last bucket: 3 x 10 x 100 kg
    expect(data.personalBests.length).toBeGreaterThanOrEqual(2);
    expect(data.averages.setCount).toBe(4);
    expect(data.affirmation.text.length).toBeGreaterThan(0);
  });

  it('reorders and hides cards', async () => {
    const cards = await services.dashboard.listCards();
    await services.dashboard.moveCard(cards[0], 1);
    await services.dashboard.setCardEnabled(cards[2].id, false);
    const after = await services.dashboard.listCards();
    expect(after[0].id).toBe(cards[1].id);
    expect(after[1].id).toBe(cards[0].id);
    expect(after.find((c) => c.id === cards[2].id)?.enabled).toBe(false);
  });
});

describe('config', () => {
  it('stores overrides only, validates, notifies and resets', async () => {
    let notified = 0;
    services.config.subscribe(() => { notified += 1; });
    expect(services.config.getNumber(ConfigKey.TimerRestSeconds)).toBe(90);

    await services.config.set(ConfigKey.TimerRestSeconds, '120');
    expect(services.config.getNumber(ConfigKey.TimerRestSeconds)).toBe(120);
    expect(services.config.isOverridden(ConfigKey.TimerRestSeconds)).toBe(true);
    expect(notified).toBe(1);

    await expect(services.config.set(ConfigKey.TimerRestSeconds, '-5')).rejects.toMatchObject({ code: ErrorCode.Validation });
    expect(services.config.getNumber(ConfigKey.TimerRestSeconds)).toBe(120);

    // survives a "restart": a fresh service reads the same row back
    const second = createServices(adapter.asExpoDb());
    await second.config.load();
    expect(second.config.getNumber(ConfigKey.TimerRestSeconds)).toBe(120);

    await services.config.reset(ConfigKey.TimerRestSeconds);
    expect(services.config.getNumber(ConfigKey.TimerRestSeconds)).toBe(90);
    const rows = await adapter.getAllAsync('SELECT * FROM config');
    expect(rows).toHaveLength(0);
  });

  it('falls back to the default when a stored value is corrupt', async () => {
    await adapter.runAsync('INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?)', ConfigKey.WarmupScheme, 'not json', 1);
    await adapter.runAsync('INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?)', ConfigKey.TimerTickMs, 'abc', 1);
    await services.config.load();
    expect(services.config.getJson<unknown[]>(ConfigKey.WarmupScheme).length).toBe(4);
    expect(services.config.getNumber(ConfigKey.TimerTickMs)).toBe(250);
  });

  it('applies the user weight unit setting', async () => {
    await services.config.set(ConfigKey.UnitsWeight, WeightUnit.Kg);
    expect((await services.dashboard.load()).weightUnit).toBe(WeightUnit.Kg);
  });
});

describe('log collector', () => {
  it('persists log entries, including errors with stack detail', async () => {
    logger.error('app' as never, 'test failure', new Error('boom'));
    await new Promise((r) => setTimeout(r, 20)); // sink writes are fire-and-forget
    const rows = await services.logs.recent(50);
    expect(rows.some((r) => r.message === 'Startup complete')).toBe(true);
    const failure = rows.find((r) => r.message === 'test failure');
    expect(failure?.level).toBe(LogLevel.Error);
    expect(failure?.detail).toContain('boom');
  });

  it('purges entries older than the cutoff', async () => {
    await services.logs.insert({ level: LogLevel.Info, source: 'app' as never, message: 'ancient', detail: null, createdAt: 1 });
    await services.logs.purgeOlderThan(1000);
    expect((await services.logs.recent(50)).some((r) => r.message === 'ancient')).toBe(false);
  });
});
