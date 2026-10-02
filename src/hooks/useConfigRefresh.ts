import { useEffect, useState } from 'react';
import { ConfigKey } from '@/config/configDefinitions';
import type { DistanceUnit, WeightUnit } from '@/constants/enums';
import { useServices } from '@/services/ServicesProvider';

/**
 * Subscribes the calling component to config changes. Tab screens stay mounted
 * while you are on another tab, so without this a unit change in Settings
 * would not show up until the screen was rebuilt.
 */
export function useConfigRefresh(): void {
  const { config } = useServices();
  const [, setVersion] = useState(0);
  useEffect(() => config.subscribe(() => setVersion((v) => v + 1)), [config]);
}

/** The user's display units, kept current as settings change. */
export function useUnits(): { weight: WeightUnit; distance: DistanceUnit } {
  useConfigRefresh();
  const { config } = useServices();
  return {
    weight: config.getString<WeightUnit>(ConfigKey.UnitsWeight),
    distance: config.getString<DistanceUnit>(ConfigKey.UnitsDistance),
  };
}
