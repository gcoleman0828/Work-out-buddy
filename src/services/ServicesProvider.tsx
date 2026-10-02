import { useSQLiteContext } from 'expo-sqlite';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { LogSource } from '@/constants/enums';
import { AppButton } from '@/ui/components/AppButton';
import { AppText } from '@/ui/components/AppText';
import { Centered } from '@/ui/components/Screen';
import { usePalette } from '@/ui/theme';
import { bootstrapServices, createServices, type Services } from './createServices';
import { logger } from './Logger';
import { GENERIC_ERROR_MESSAGE } from '@/constants/bootstrap';

const ServicesContext = createContext<Services | null>(null);

type BootState = 'loading' | 'ready' | 'failed';

/**
 * Builds the services from the open database, runs the startup sequence, and
 * only renders the app once it has finished. If startup fails the user sees a
 * clear message with a Retry button (and the cause is already in the log).
 */
export function ServicesProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const p = usePalette();
  const services = useMemo(() => createServices(db), [db]);
  const [state, setState] = useState<BootState>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    bootstrapServices(services)
      .then(() => {
        if (!cancelled) setState('ready');
      })
      .catch((error: unknown) => {
        logger.error(LogSource.App, 'Startup failed', error);
        if (!cancelled) setState('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [services, attempt]);

  if (state === 'loading') {
    return (
      <Centered>
        <ActivityIndicator color={p.primary} />
      </Centered>
    );
  }
  if (state === 'failed') {
    return (
      <Centered>
        <AppText variant="title">Could not start</AppText>
        <AppText variant="muted" style={{ textAlign: 'center' }}>
          {GENERIC_ERROR_MESSAGE}
        </AppText>
        <AppButton label="Retry" onPress={() => setAttempt((n) => n + 1)} />
      </Centered>
    );
  }
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) {
    // A programming error (hook used outside the provider), not a runtime
    // condition; the ErrorBoundary logs it and shows the friendly screen.
    throw new Error('useServices() called outside <ServicesProvider>');
  }
  return services;
}
