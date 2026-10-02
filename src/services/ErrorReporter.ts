import { GENERIC_ERROR_MESSAGE } from '@/constants/bootstrap';
import { LogSource } from '@/constants/enums';
import { AppError } from '@/errors/AppError';
import { logger } from './Logger';

/**
 * The single place that turns a failure into BOTH:
 *   1. a log entry (for debugging later), and
 *   2. a friendly on-screen notice (so the user is never left guessing).
 * This is how "the app never fails silently" is enforced: code that can fail
 * calls `report()` or wraps itself in `guard()` instead of an empty catch.
 */

export interface UserNotice {
  id: number;
  message: string;
}

export interface ReportContext {
  source: LogSource;
  /** Technical description for the log ("failed to save set"). */
  what: string;
  /** Friendly text shown to the user if the error is not an AppError. */
  userMessage?: string;
}

type Listener = (notice: UserNotice) => void;

export class ErrorReporter {
  private listeners = new Set<Listener>();
  private nextId = 1;

  report(error: unknown, ctx: ReportContext): void {
    logger.error(ctx.source, ctx.what, error);
    const message =
      error instanceof AppError ? error.userMessage : (ctx.userMessage ?? GENERIC_ERROR_MESSAGE);
    this.publish(message);
  }

  /** Show a message to the user without logging an error (e.g. validation hints). */
  notify(message: string): void {
    this.publish(message);
  }

  /** Run `fn`; on failure report it and return undefined instead of throwing. */
  async guard<T>(fn: () => Promise<T>, ctx: ReportContext): Promise<T | undefined> {
    try {
      return await fn();
    } catch (error) {
      this.report(error, ctx);
      return undefined;
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private publish(message: string): void {
    const notice: UserNotice = { id: this.nextId, message };
    this.nextId += 1;
    for (const listener of this.listeners) listener(notice);
  }
}

export const errorReporter = new ErrorReporter();

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;
interface ErrorUtilsLike {
  getGlobalHandler(): GlobalHandler;
  setGlobalHandler(handler: GlobalHandler): void;
}

/**
 * Catch uncaught JavaScript errors anywhere (timers, event handlers) and send
 * them to the log + friendly banner, then defer to React Native's own handler.
 *
 * Known gap: unhandled PROMISE rejections are not intercepted here. That is why
 * async UI handlers go through ErrorReporter.guard() instead of a bare await.
 */
export function installGlobalErrorHandlers(): void {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!errorUtils) return;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    errorReporter.report(error, {
      source: LogSource.App,
      what: isFatal ? 'Fatal uncaught error' : 'Uncaught error',
    });
    previous(error, isFatal);
  });
}
