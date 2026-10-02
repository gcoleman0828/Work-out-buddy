import type { SQLiteDatabase } from 'expo-sqlite';

/** Raw access to the `config` table (overrides only; defaults live in code). */
export class ConfigRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM config',
    );
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async set(key: string, value: string, now: number): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      key,
      value,
      now,
    );
  }

  async remove(key: string): Promise<void> {
    await this.db.runAsync('DELETE FROM config WHERE key = ?', key);
  }
}
