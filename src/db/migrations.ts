/**
 * Schema history. Each migration runs once, in order, inside a transaction;
 * SQLite's `PRAGMA user_version` records the last one applied.
 *
 * Rules: never edit a shipped migration (add a new one), and keep it cheap:
 *  - timestamps are INTEGER epoch milliseconds (8 bytes, no string parsing)
 *  - enums are stored as short TEXT (readable in a DB dump, tiny at this scale)
 *  - images are NOT stored as blobs; only a file URI is kept (see exercises.image_uri)
 *  - only the indexes the real queries need
 */
export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE config (
        key        TEXT PRIMARY KEY NOT NULL,
        value      TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE exercises (
        id                    INTEGER PRIMARY KEY AUTOINCREMENT,
        name                  TEXT NOT NULL,
        name_key              TEXT NOT NULL UNIQUE,
        muscle_group          TEXT NOT NULL,
        equipment             TEXT NOT NULL,
        instructions          TEXT,
        image_uri             TEXT,
        video_url             TEXT,
        source                TEXT NOT NULL,
        enrichment_status     TEXT NOT NULL,
        enrichment_confidence REAL,
        created_at            INTEGER NOT NULL,
        updated_at            INTEGER NOT NULL
      );

      CREATE TABLE sessions (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        day_key    TEXT NOT NULL UNIQUE,
        started_at INTEGER NOT NULL,
        ended_at   INTEGER,
        notes      TEXT
      );

      CREATE TABLE sets (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id   INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        exercise_id  INTEGER NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
        reps         INTEGER,
        weight_kg    REAL,
        duration_sec INTEGER,
        distance_m   REAL,
        notes        TEXT,
        is_pr        INTEGER NOT NULL DEFAULT 0,
        created_at   INTEGER NOT NULL
      );
      CREATE INDEX idx_sets_exercise_created ON sets(exercise_id, created_at);
      CREATE INDEX idx_sets_session ON sets(session_id);
      CREATE INDEX idx_sets_created ON sets(created_at);

      CREATE TABLE dashboard_cards (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        card_type TEXT NOT NULL UNIQUE,
        position  INTEGER NOT NULL,
        enabled   INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE app_logs (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        level      TEXT NOT NULL,
        source     TEXT NOT NULL,
        message    TEXT NOT NULL,
        detail     TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX idx_app_logs_created ON app_logs(created_at);
    `,
  },
];
