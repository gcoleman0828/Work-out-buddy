import { ErrorCode } from '@/constants/enums';

/**
 * An error whose `userMessage` is safe and friendly to show on screen, while
 * `message` / `cause` keep the technical detail for the log collector.
 * Throw this for failures we anticipate ("that exercise has logged sets").
 * Anything else that escapes is wrapped in a generic message by ErrorReporter.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly userMessage: string;
  readonly originalCause: unknown;

  constructor(code: ErrorCode, userMessage: string, originalCause?: unknown) {
    super(userMessage);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage;
    this.originalCause = originalCause;
  }
}

/** Turn any thrown value into readable text for the log (message + stack + cause). */
export function describeError(error: unknown): string {
  if (error instanceof AppError) {
    const cause = error.originalCause ? `\ncaused by: ${describeError(error.originalCause)}` : '';
    return `AppError[${error.code}]: ${error.userMessage}${cause}${error.stack ? `\n${error.stack}` : ''}`;
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
  }
  try {
    return typeof error === 'string' ? error : JSON.stringify(error);
  } catch {
    return String(error);
  }
}
