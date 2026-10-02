import type { SQLiteDatabase } from 'expo-sqlite';
import type { Exercise } from '@/domain/models';

/** `SELECT` list that maps snake_case columns onto the camelCase Exercise model. */
const COLUMNS = `
  id, name, name_key AS nameKey, muscle_group AS muscleGroup, equipment,
  instructions, image_uri AS imageUri, video_url AS videoUrl, source,
  enrichment_status AS enrichmentStatus, enrichment_confidence AS enrichmentConfidence,
  created_at AS createdAt, updated_at AS updatedAt`;

export type NewExercise = Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>;
export type ExercisePatch = Partial<NewExercise>;

/** Maps patch property names to their columns (a whitelist, so SQL is never built from input). */
const PATCH_COLUMNS: Readonly<Record<keyof NewExercise, string>> = {
  name: 'name',
  nameKey: 'name_key',
  muscleGroup: 'muscle_group',
  equipment: 'equipment',
  instructions: 'instructions',
  imageUri: 'image_uri',
  videoUrl: 'video_url',
  source: 'source',
  enrichmentStatus: 'enrichment_status',
  enrichmentConfidence: 'enrichment_confidence',
};

export class ExerciseRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async listAll(): Promise<Exercise[]> {
    return this.db.getAllAsync<Exercise>(
      `SELECT ${COLUMNS} FROM exercises ORDER BY name COLLATE NOCASE`,
    );
  }

  async getById(id: number): Promise<Exercise | null> {
    return this.db.getFirstAsync<Exercise>(`SELECT ${COLUMNS} FROM exercises WHERE id = ?`, id);
  }

  async getByKey(nameKey: string): Promise<Exercise | null> {
    return this.db.getFirstAsync<Exercise>(
      `SELECT ${COLUMNS} FROM exercises WHERE name_key = ?`,
      nameKey,
    );
  }

  async insert(input: NewExercise, now: number): Promise<number> {
    const result = await this.db.runAsync(
      `INSERT INTO exercises (name, name_key, muscle_group, equipment, instructions, image_uri,
         video_url, source, enrichment_status, enrichment_confidence, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.name,
      input.nameKey,
      input.muscleGroup,
      input.equipment,
      input.instructions,
      input.imageUri,
      input.videoUrl,
      input.source,
      input.enrichmentStatus,
      input.enrichmentConfidence,
      now,
      now,
    );
    return result.lastInsertRowId;
  }

  /** Insert unless an exercise with this name_key already exists (used for seeding). */
  async insertIfAbsent(input: NewExercise, now: number): Promise<boolean> {
    const existing = await this.getByKey(input.nameKey);
    if (existing) return false;
    await this.insert(input, now);
    return true;
  }

  async update(id: number, patch: ExercisePatch, now: number): Promise<void> {
    const entries = (Object.entries(patch) as [keyof NewExercise, unknown][]).filter(
      ([key]) => key in PATCH_COLUMNS,
    );
    if (entries.length === 0) return;
    const assignments = entries.map(([key]) => `${PATCH_COLUMNS[key]} = ?`).join(', ');
    const values = entries.map(([, value]) => (value === undefined ? null : value)) as (
      | string
      | number
      | null
    )[];
    await this.db.runAsync(
      `UPDATE exercises SET ${assignments}, updated_at = ? WHERE id = ?`,
      ...values,
      now,
      id,
    );
  }

  async countSets(id: number): Promise<number> {
    const row = await this.db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM sets WHERE exercise_id = ?',
      id,
    );
    return row?.n ?? 0;
  }

  async delete(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM exercises WHERE id = ?', id);
  }
}
