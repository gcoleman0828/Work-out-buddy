import { LOG_BUFFER_MAX } from '@/constants/bootstrap';
import { LogLevel, type LogSource } from '@/constants/enums';
import { describeError } from '@/errors/AppError';

/**
 * The log collector. Every error in the app ends up here (via ErrorReporter,
 * the React ErrorBoundary and the global handler), and from here into the
 * `app_logs` SQLite table, where the Diagnostics screen can show it later.
 *
 * Design points:
 *  - Works before the database exists: lines are buffered in memory and
 *    flushed when attachSink() is called, so a startup crash is still captured.
 *  - Logging must never throw or recurse: a failing sink falls back to console.
 */

export interface LogEntryInput {
  level: LogLevel;
  source: LogSource;
  message: string;
  detail: string | null;
  createdAt: number;
}

export type LogSink = (entry: LogEntryInput) => Promise<void>;

const LEVEL_RANK: Readonly<Record<LogLevel, number>> = {
  [LogLevel.Debug]: 0,
  [LogLevel.Info]: 1,
  [LogLevel.Warn]: 2,
  [LogLevel.Error]: 3,
};

export class Logger {
  private sink: LogSink | null = null;
  private buffer: LogEntryInput[] = [];
  private minLevel: LogLevel = LogLevel.Info;

  /** Start persisting. Anything logged earlier is flushed first, in order. */
  attachSink(sink: LogSink): void {
    this.sink = sink;
    const pending = this.buffer;
    this.buffer = [];
    for (const entry of pending) this.write(entry);
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  debug(source: LogSource, message: string, detail?: unknown): void {
    this.log(LogLevel.Debug, source, message, detail);
  }

  info(source: LogSource, message: string, detail?: unknown): void {
    this.log(LogLevel.Info, source, message, detail);
  }

  warn(source: LogSource, message: string, detail?: unknown): void {
    this.log(LogLevel.Warn, source, message, detail);
  }

  error(source: LogSource, message: string, detail?: unknown): void {
    this.log(LogLevel.Error, source, message, detail);
  }

  log(level: LogLevel, source: LogSource, message: string, detail?: unknown): void {
    if (LEVEL_RANK[level] < LEVEL_RANK[this.minLevel]) return;
    const entry: LogEntryInput = {
      level,
      source,
      message,
      detail: detail === undefined ? null : describeError(detail),
      createdAt: Date.now(),
    };
    this.toConsole(entry);
    if (this.sink) {
      this.write(entry);
    } else {
      this.buffer.push(entry);
      if (this.buffer.length > LOG_BUFFER_MAX) this.buffer.shift();
    }
  }

  private write(entry: LogEntryInput): void {
    const sink = this.sink;
    if (!sink) return;
    sink(entry).catch((sinkError: unknown) => {
      // Last resort: the log store itself is failing. Do not recurse.
      console.error('[logger] failed to persist log entry', describeError(sinkError));
    });
  }

  private toConsole(entry: LogEntryInput): void {
    const line = `[${entry.level}] [${entry.source}] ${entry.message}${entry.detail ? `\n${entry.detail}` : ''}`;
    if (entry.level === LogLevel.Error) console.error(line);
    else if (entry.level === LogLevel.Warn) console.warn(line);
    else console.log(line);
  }
}

/** App-wide instance: logging has to work before any React tree or DB exists. */
export const logger = new Logger();
