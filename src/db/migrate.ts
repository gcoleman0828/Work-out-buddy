import type { SQLiteDatabase } from 'expo-sqlite';
import { LogSource } from '@/constants/enums';
import { logger } from '@/services/Logger';
import { MIGRATIONS } from './migrations';

/**
 * Passed to <SQLiteProvider onInit>. Runs before any screen renders, so the
 * rest of the app can assume the schema is current.
 *
 *  - foreign_keys is a per-connection setting in SQLite, so it must be turned
 *    on every time (otherwise ON DELETE RESTRICT silently does nothing).
 *  - WAL journaling makes writes faster and keeps reads from blocking them.
 *  - Each migration plus its version bump is one transaction: a crash midway
 *    leaves the database at the previous version, never half-migrated.
 */
export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    logger.info(LogSource.Database, `Applying migration ${migration.version}: ${migration.name}`);
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      // `version` is a number from our own constant list, never user input.
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}
