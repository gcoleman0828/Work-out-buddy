import type { SQLiteDatabase } from 'expo-sqlite';
import type { LogLevel, LogSource } from '@/constants/enums';
import type { LogEntryInput } from '@/services/Logger';

export interface StoredLog {
  id: number;
  level: LogLevel;
  source: LogSource;
  message: string;
  detail: string | null;
  createdAt: number;
}

/** Persistence for the log collector (`app_logs` table). */
export class LogRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async insert(entry: LogEntryInput): Promise<void> {
    await this.db.runAsync(
      'INSERT INTO app_logs (level, source, message, detail, created_at) VALUES (?, ?, ?, ?, ?)',
      entry.level,
      entry.source,
      entry.message,
      entry.detail,
      entry.createdAt,
    );
  }

  /** Newest first. */
  async recent(limit: number): Promise<StoredLog[]> {
    return this.db.getAllAsync<StoredLog>(
      `SELECT id, level, source, message, detail, created_at AS createdAt
       FROM app_logs ORDER BY id DESC LIMIT ?`,
      limit,
    );
  }

  async purgeOlderThan(cutoffMs: number): Promise<void> {
    await this.db.runAsync('DELETE FROM app_logs WHERE created_at < ?', cutoffMs);
  }

  async clear(): Promise<void> {
    await this.db.runAsync('DELETE FROM app_logs');
  }
}
