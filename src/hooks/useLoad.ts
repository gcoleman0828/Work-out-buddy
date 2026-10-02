import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import type { LogSource } from '@/constants/enums';
import { errorReporter } from '@/services/ErrorReporter';

interface LoadState<T> {
  data: T | null;
  loading: boolean;
  failed: boolean;
}

/**
 * Load screen data every time the screen gains focus (so returning from a
 * detail page shows fresh numbers) and report failures instead of swallowing
 * them. `loader` MUST be wrapped in useCallback by the caller, otherwise the
 * effect would re-run on every render.
 */
export function useLoad<T>(loader: () => Promise<T>, source: LogSource, what: string) {
  const [state, setState] = useState<LoadState<T>>({ data: null, loading: true, failed: false });
  const [reloadToken, setReloadToken] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loader()
        .then((data) => {
          if (!cancelled) setState({ data, loading: false, failed: false });
        })
        .catch((error: unknown) => {
          errorReporter.report(error, { source, what: `Failed to load ${what}` });
          if (!cancelled) setState((s) => ({ ...s, loading: false, failed: true }));
        });
      return () => {
        cancelled = true;
      };
      // reloadToken is intentionally a dependency: bumping it re-runs the load.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loader, source, what, reloadToken]),
  );

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);
  return { ...state, reload };
}
