import { TimerStatus } from '@/constants/enums';

/**
 * Rest timer as an immutable state machine over timestamps.
 *
 * Why timestamps instead of a decrementing counter: JavaScript timers pause or
 * drift when the app is backgrounded or the screen locks (common mid-workout).
 * Storing the absolute `endsAt` and deriving "remaining" from the clock means
 * the countdown is correct the moment the app comes back.
 */
export interface TimerState {
  status: TimerStatus;
  /** Original length, kept so the UI can draw progress. */
  durationMs: number;
  /** Epoch ms when the timer ends; null while idle. */
  endsAt: number | null;
}

const MS_PER_SECOND = 1000;

export const IDLE_TIMER: TimerState = Object.freeze({
  status: TimerStatus.Idle,
  durationMs: 0,
  endsAt: null,
});

export function startTimer(seconds: number, now: number): TimerState {
  const durationMs = Math.max(0, seconds) * MS_PER_SECOND;
  return { status: TimerStatus.Running, durationMs, endsAt: now + durationMs };
}

export function remainingMs(state: TimerState, now: number): number {
  if (state.status === TimerStatus.Idle || state.endsAt === null) return 0;
  return Math.max(0, state.endsAt - now);
}

/** Advance the status: Running becomes Finished once the clock passes endsAt. */
export function tickTimer(state: TimerState, now: number): TimerState {
  if (state.status === TimerStatus.Running && remainingMs(state, now) === 0) {
    return { ...state, status: TimerStatus.Finished };
  }
  return state;
}

/** Add time to a running timer (the "+30s" button). Restarts a finished one. */
export function extendTimer(state: TimerState, seconds: number, now: number): TimerState {
  const extra = seconds * MS_PER_SECOND;
  if (state.status === TimerStatus.Running && state.endsAt !== null) {
    return { ...state, durationMs: state.durationMs + extra, endsAt: state.endsAt + extra };
  }
  return { status: TimerStatus.Running, durationMs: extra, endsAt: now + extra };
}

export function stopTimer(): TimerState {
  return IDLE_TIMER;
}

/** Whole seconds left, rounded up so the display reads "0:01" until it hits zero. */
export function remainingSeconds(state: TimerState, now: number): number {
  return Math.ceil(remainingMs(state, now) / MS_PER_SECOND);
}

/** 0..1 elapsed fraction for a progress bar. */
export function progress(state: TimerState, now: number): number {
  if (state.durationMs === 0) return 0;
  return Math.min(1, Math.max(0, 1 - remainingMs(state, now) / state.durationMs));
}
