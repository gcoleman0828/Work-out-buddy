import type { SQLiteDatabase } from 'expo-sqlite';
import type { SlimSet, WorkoutSetWithExercise } from '@/domain/models';

export interface NewSet {
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

export interface SetPatch {
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  distanceM: number | null;
  notes: string | null;
}

type SetRow = Omit<WorkoutSetWithExercise, 'isPr'> & { isPr: number };

const SET_SELECT = `
  SELECT s.id, s.session_id AS sessionId, s.exercise_id AS exerciseId, s.reps,
         s.weight_kg AS weightKg, s.duration_sec AS durationSec, s.distance_m AS distanceM,
         s.notes, s.is_pr AS isPr, s.created_at AS createdAt, e.name AS exerciseName
  FROM sets s JOIN exercises e ON e.id = s.exercise_id`;

const SLIM_SELECT = `
  SELECT exercise_id AS exerciseId, reps, weight_kg AS weightKg,
         duration_sec AS durationSec, distance_m AS distanceM, created_at AS createdAt
  FROM sets`;

const toModel = (row: SetRow): WorkoutSetWithExercise => ({ ...row, isPr: row.isPr === 1 });

/** Sessions (one per local day) and the sets inside them. */
export class WorkoutRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getOrCreateSessionId(dayKey: string, now: number): Promise<number> {
    await this.db.runAsync(
      'INSERT OR IGNORE INTO sessions (day_key, started_at) VALUES (?, ?)',
      dayKey,
      now,
    );
    const row = await this.db.getFirstAsync<{ id: number }>(
      'SELECT id FROM sessions WHERE day_key = ?',
      dayKey,
    );
    if (!row) throw new Error(`Session for ${dayKey} could not be read back after insert`);
    return row.id;
  }

  /** Insert several sets atomically: all are saved or none are. */
  async insertSets(sets: readonly NewSet[]): Promise<number[]> {
    const ids: number[] = [];
    await this.db.withTransactionAsync(async () => {
      for (const s of sets) {
        const result = await this.db.runAsync(
          `INSERT INTO sets (session_id, exercise_id, reps, weight_kg, duration_sec, distance_m,
             notes, is_pr, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          s.sessionId,
          s.exerciseId,
          s.reps,
          s.weightKg,
          s.durationSec,
          s.distanceM,
          s.notes,
          s.isPr ? 1 : 0,
          s.createdAt,
        );
        ids.push(result.lastInsertRowId);
      }
    });
    return ids;
  }

  async getSet(id: number): Promise<WorkoutSetWithExercise | null> {
    const row = await this.db.getFirstAsync<SetRow>(`${SET_SELECT} WHERE s.id = ?`, id);
    return row ? toModel(row) : null;
  }

  async updateSet(id: number, patch: SetPatch): Promise<void> {
    await this.db.runAsync(
      'UPDATE sets SET reps = ?, weight_kg = ?, duration_sec = ?, distance_m = ?, notes = ? WHERE id = ?',
      patch.reps,
      patch.weightKg,
      patch.durationSec,
      patch.distanceM,
      patch.notes,
      id,
    );
  }

  async deleteSet(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM sets WHERE id = ?', id);
  }

  /** Sets logged on one local day, newest first. */
  async setsForDay(dayKey: string): Promise<WorkoutSetWithExercise[]> {
    const rows = await this.db.getAllAsync<SetRow>(
      `${SET_SELECT} JOIN sessions se ON se.id = s.session_id
       WHERE se.day_key = ? ORDER BY s.created_at DESC, s.id DESC`,
      dayKey,
    );
    return rows.map(toModel);
  }

  async slimSetsForExercise(exerciseId: number): Promise<SlimSet[]> {
    return this.db.getAllAsync<SlimSet>(`${SLIM_SELECT} WHERE exercise_id = ?`, exerciseId);
  }

  async slimSetsSince(sinceMs: number): Promise<SlimSet[]> {
    return this.db.getAllAsync<SlimSet>(`${SLIM_SELECT} WHERE created_at >= ?`, sinceMs);
  }

  /** All-time scan used for personal bests; fine at personal-log scale (see ARCHITECTURE.md). */
  async allSlimSets(): Promise<SlimSet[]> {
    return this.db.getAllAsync<SlimSet>(SLIM_SELECT);
  }

  /** Days (on or after `fromDayKey`) that actually have at least one set. */
  async countWorkoutDaysSince(fromDayKey: string): Promise<number> {
    const row = await this.db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM sessions se
       WHERE se.day_key >= ? AND EXISTS (SELECT 1 FROM sets s WHERE s.session_id = se.id)`,
      fromDayKey,
    );
    return row?.n ?? 0;
  }
}
