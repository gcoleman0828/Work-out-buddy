import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ConfigKey } from '@/config/configDefinitions';
import { LogSource, TimerStatus } from '@/constants/enums';
import {
  extendTimer,
  IDLE_TIMER,
  progress,
  remainingSeconds,
  startTimer,
  stopTimer,
  tickTimer,
  type TimerState,
} from '@/domain/restTimer';
import { logger } from '@/services/Logger';
import { useServices } from '@/services/ServicesProvider';

/** Tag that pairs activate/deactivate calls for the screen wake-lock. */
const KEEP_AWAKE_TAG = 'rest-timer';

interface RestTimerApi {
  status: TimerStatus;
  remainingSec: number;
  /** 0..1 elapsed fraction. */
  progress: number;
  /** Start (or restart) with this many seconds; defaults to the configured rest length. */
  start: (seconds?: number) => void;
  /** Add the configured "extend" seconds. */
  extend: () => void;
  stop: () => void;
}

const RestTimerContext = createContext<RestTimerApi | null>(null);

/**
 * One app-wide rest timer, so it keeps running while you switch tabs.
 * All timing logic is in domain/restTimer.ts (pure, tested); this provider only
 * (1) re-renders on an interval, (2) vibrates when time is up, and (3) keeps the
 * screen awake while counting so you can see it mid-set.
 */
export function RestTimerProvider({ children }: { children: ReactNode }) {
  const { config } = useServices();
  const [timer, setTimer] = useState<TimerState>(IDLE_TIMER);
  const [now, setNow] = useState(() => Date.now());

  const running = timer.status === TimerStatus.Running;

  useEffect(() => {
    if (!running) return undefined;
    const interval = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setTimer((current) => tickTimer(current, t));
    }, config.getNumber(ConfigKey.TimerTickMs));
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch((error: unknown) =>
      logger.warn(LogSource.Timer, 'Could not keep the screen awake', error),
    );
    return () => {
      clearInterval(interval);
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch((error: unknown) =>
        logger.warn(LogSource.Timer, 'Could not release the screen wake-lock', error),
      );
    };
  }, [running, config]);

  useEffect(() => {
    if (timer.status !== TimerStatus.Finished) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch((error: unknown) =>
      logger.warn(LogSource.Timer, 'Haptic feedback failed', error),
    );
  }, [timer.status]);

  const start = useCallback(
    (seconds?: number) => {
      const t = Date.now();
      setNow(t);
      setTimer(startTimer(seconds ?? config.getNumber(ConfigKey.TimerRestSeconds), t));
    },
    [config],
  );

  const extend = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setTimer((current) => extendTimer(current, config.getNumber(ConfigKey.TimerExtendSeconds), t));
  }, [config]);

  const stop = useCallback(() => setTimer(stopTimer()), []);

  const value = useMemo<RestTimerApi>(
    () => ({
      status: timer.status,
      remainingSec: remainingSeconds(timer, now),
      progress: progress(timer, now),
      start,
      extend,
      stop,
    }),
    [timer, now, start, extend, stop],
  );

  return <RestTimerContext.Provider value={value}>{children}</RestTimerContext.Provider>;
}

export function useRestTimer(): RestTimerApi {
  const api = useContext(RestTimerContext);
  if (!api) throw new Error('useRestTimer() called outside <RestTimerProvider>');
  return api;
}
