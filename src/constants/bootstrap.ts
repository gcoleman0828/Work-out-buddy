/**
 * Values needed BEFORE the config table can be read (opening the database,
 * logging a startup failure). Everything else that may need tuning lives in
 * src/config/configDefinitions.ts and the `config` table, never here.
 */
export const DB_NAME = 'workout-buddy.db';

/** Log lines held in memory until the database sink is attached. */
export const LOG_BUFFER_MAX = 200;

/** Prefix for the user-visible text shown when something we did not anticipate fails. */
export const GENERIC_ERROR_MESSAGE =
  'Something went wrong. The problem was recorded so it can be fixed.';
