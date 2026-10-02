import { describe, expect, it } from 'vitest';
import { TimerStatus } from '@/constants/enums';
import {
  IDLE_TIMER,
  extendTimer,
  progress,
  remainingMs,
  remainingSeconds,
  startTimer,
  stopTimer,
  tickTimer,
} from '@/domain/restTimer';

const T0 = 1_000_000;

describe('rest timer', () => {
  it('starts running with the right end time', () => {
    const s = startTimer(90, T0);
    expect(s.status).toBe(TimerStatus.Running);
    expect(remainingMs(s, T0)).toBe(90_000);
    expect(remainingSeconds(s, T0 + 89_500)).toBe(1);
  });

  it('derives remaining time from the clock, so backgrounding does not matter', () => {
    const s = startTimer(60, T0);
    // App was suspended; first tick happens 45s later.
    expect(remainingSeconds(tickTimer(s, T0 + 45_000), T0 + 45_000)).toBe(15);
  });

  it('finishes once the clock passes the end and never goes negative', () => {
    const s = startTimer(10, T0);
    const done = tickTimer(s, T0 + 10_000);
    expect(done.status).toBe(TimerStatus.Finished);
    expect(remainingMs(done, T0 + 99_000)).toBe(0);
  });

  it('extends a running timer and tracks progress', () => {
    const s = extendTimer(startTimer(60, T0), 30, T0);
    expect(remainingMs(s, T0)).toBe(90_000);
    expect(progress(s, T0 + 45_000)).toBeCloseTo(0.5);
  });

  it('extending an idle or finished timer starts a fresh one', () => {
    const s = extendTimer(IDLE_TIMER, 30, T0);
    expect(s.status).toBe(TimerStatus.Running);
    expect(remainingMs(s, T0)).toBe(30_000);
  });

  it('stop returns to idle', () => {
    expect(stopTimer().status).toBe(TimerStatus.Idle);
    expect(progress(IDLE_TIMER, T0)).toBe(0);
  });
});
