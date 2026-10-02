import { useCallback } from 'react';
import { Switch, View } from 'react-native';
import { LogSource } from '@/constants/enums';
import { catalogEntry } from '@/domain/cardCatalog';
import type { DashboardCardConfig } from '@/domain/models';
import { useLoad } from '@/hooks/useLoad';
import { errorReporter } from '@/services/ErrorReporter';
import { useServices } from '@/services/ServicesProvider';
import { AppButton } from '@/ui/components/AppButton';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { space } from '@/ui/theme';

/** Detail page for the dashboard layout: show/hide each card and change the order. */
export default function DashboardCardsScreen() {
  const { dashboard } = useServices();
  const loader = useCallback(() => dashboard.listCards(), [dashboard]);
  const { data: cards, reload } = useLoad(loader, LogSource.Dashboard, 'dashboard cards');

  const run = async (action: () => Promise<void>, what: string) => {
    const done = await errorReporter.guard(action, {
      source: LogSource.Dashboard,
      what,
      userMessage: 'That change could not be saved.',
    });
    if (done !== undefined || done === undefined) reload();
  };

  return (
    <Screen>
      <AppText variant="muted">Choose which cards appear on the dashboard and in what order.</AppText>
      {(cards ?? []).map((card: DashboardCardConfig, index, all) => {
        const entry = catalogEntry(card.cardType);
        return (
          <Card key={card.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontWeight: '600' }}>{entry?.title ?? card.cardType}</AppText>
                <AppText variant="small">{entry?.description}</AppText>
              </View>
              <Switch
                value={card.enabled}
                onValueChange={(v) => run(() => dashboard.setCardEnabled(card.id, v), 'Failed to toggle dashboard card')}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <AppButton compact variant="secondary" label="Move up" disabled={index === 0} onPress={() => run(() => dashboard.moveCard(card, -1), 'Failed to move dashboard card')} />
              <AppButton compact variant="secondary" label="Move down" disabled={index === all.length - 1} onPress={() => run(() => dashboard.moveCard(card, 1), 'Failed to move dashboard card')} />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
