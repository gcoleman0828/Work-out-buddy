import { createRequire } from 'node:module';
import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Test-only adapter: exposes the handful of expo-sqlite methods our
 * repositories use, backed by Node's built-in SQLite engine. expo-sqlite itself
 * needs a phone, so this is how the real SQL (migrations, joins, constraints)
 * gets exercised in unit-test runs. Loaded through createRequire because Vite
 * does not yet know the `node:sqlite` builtin.
 */
const nodeRequire = createRequire(import.meta.url);
const { DatabaseSync } = nodeRequire('node:sqlite') as {
  DatabaseSync: new (path: string) => NodeDb;
};

interface NodeStatement {
  run(...params: unknown[]): { lastInsertRowid: number | bigint; changes: number | bigint };
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown;
}
interface NodeDb {
  exec(sql: string): void;
  prepare(sql: string): NodeStatement;
}

/** expo-sqlite accepts (sql, ...params) or (sql, [params]); normalise to a flat list. */
const flatten = (params: unknown[]): unknown[] =>
  params.length === 1 && Array.isArray(params[0]) ? (params[0] as unknown[]) : params;

export class NodeSqliteAdapter {
  private readonly db: NodeDb = new DatabaseSync(':memory:');

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async runAsync(sql: string, ...params: unknown[]) {
    const r = this.db.prepare(sql).run(...flatten(params));
    return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
  }

  async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    return this.db.prepare(sql).all(...flatten(params)) as T[];
  }

  async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    return (this.db.prepare(sql).get(...flatten(params)) as T | undefined) ?? null;
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    this.db.exec('BEGIN');
    try {
      await task();
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  asExpoDb(): SQLiteDatabase {
    return this as unknown as SQLiteDatabase;
  }
}
