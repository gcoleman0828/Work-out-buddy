import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { LogSource } from '@/constants/enums';
import { Routes } from '@/constants/routes';
import { CARD_COMPONENTS } from '@/features/dashboard/cards';
import { useLoad } from '@/hooks/useLoad';
import type { DashboardData } from '@/services/DashboardService';
import type { DashboardCardConfig } from '@/domain/models';
import { useServices } from '@/services/ServicesProvider';
import { AppButton } from '@/ui/components/AppButton';
import { AppText } from '@/ui/components/AppText';
import { Screen } from '@/ui/components/Screen';

interface DashboardView {
  cards: DashboardCardConfig[];
  data: DashboardData;
}

/** Dashboard tab: renders the enabled cards, in the user's order. */
export default function DashboardScreen() {
  const { dashboard } = useServices();
  const router = useRouter();

  const loader = useCallback(async (): Promise<DashboardView> => {
    const [cards, data] = await Promise.all([dashboard.listCards(), dashboard.load()]);
    return { cards, data };
  }, [dashboard]);

  const { data: view, loading, failed, reload } = useLoad(loader, LogSource.Dashboard, 'the dashboard');

  return (
    <Screen onRefresh={reload} refreshing={loading && view !== null}>
      {failed && !view ? (
        <AppText variant="muted">The dashboard could not load. Pull down to try again.</AppText>
      ) : null}
      {view?.cards
        .filter((card) => card.enabled)
        .map((card) => {
          const CardComponent = CARD_COMPONENTS[card.cardType];
          return CardComponent ? <CardComponent key={card.id} data={view.data} /> : null;
        })}
      {view ? (
        <AppButton
          variant="secondary"
          label="Customize cards"
          onPress={() => router.push(Routes.dashboardCards)}
        />
      ) : null}
    </Screen>
  );
}
