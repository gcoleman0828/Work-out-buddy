import { useRouter } from 'expo-router';
import type { ComponentType } from 'react';
import { Pressable, View } from 'react-native';
import { AffirmationSource, DashboardCardType, DistanceUnit } from '@/constants/enums';
import { Routes } from '@/constants/routes';
import { fromKg, formatDuration, trimNumber } from '@/domain/units';
import type { DashboardData } from '@/services/DashboardService';
import { AppButton } from '@/ui/components/AppButton';
import { AppText } from '@/ui/components/AppText';
import { BarChart } from '@/ui/components/BarChart';
import { Card } from '@/ui/components/Card';
import { Gauge } from '@/ui/components/Gauge';
import { describePersonalBest } from '@/ui/format';
import { space } from '@/ui/theme';
import { catalogEntry } from '@/domain/cardCatalog';
import { ConfigKey } from '@/config/configDefinitions';
import { useServices } from '@/services/ServicesProvider';

interface CardProps {
  data: DashboardData;
}

const titleOf = (type: DashboardCardType) => catalogEntry(type)?.title ?? type;

function AffirmationCard({ data }: CardProps) {
  const { affirmation } = data;
  return (
    <Card title={titleOf(DashboardCardType.Affirmation)}>
      <AppText variant="title" style={{ fontWeight: '600' }}>
        {affirmation.text}
      </AppText>
      <AppText variant="small">
        {affirmation.source === AffirmationSource.Remote ? 'From your daily source' : 'Built-in message'}
      </AppText>
    </Card>
  );
}

function WeeklyGoalGaugeCard({ data }: CardProps) {
  return (
    <Card title={titleOf(DashboardCardType.WeeklyGoalGauge)}>
      <Gauge
        value={data.workoutDaysThisWeek}
        target={data.goalDays}
        caption={`of ${data.goalDays} workout days (last 7 days)`}
      />
    </Card>
  );
}

function WeeklyVolumeChartCard({ data }: CardProps) {
  const values = data.volume.valuesKg.map((kg) => fromKg(kg, data.weightUnit));
  const hasData = values.some((v) => v > 0);
  return (
    <Card title={`${titleOf(DashboardCardType.WeeklyVolumeChart)} (${data.weightUnit})`}>
      {hasData ? (
        <BarChart
          labels={data.volume.labels}
          values={values}
          formatValue={(v) => trimNumber(v, 0)}
        />
      ) : (
        <AppText variant="muted">No weighted sets in the last 7 days yet. Log a set to see it here.</AppText>
      )}
    </Card>
  );
}

function PersonalBestsCard({ data }: CardProps) {
  const router = useRouter();
  const { config } = useServices();
  const units = {
    weight: data.weightUnit,
    distance: config.getString<DistanceUnit>(ConfigKey.UnitsDistance),
  };
  return (
    <Card title={titleOf(DashboardCardType.PersonalBests)}>
      {data.personalBests.length === 0 ? (
        <AppText variant="muted">Personal bests appear after you log a few sets.</AppText>
      ) : (
        data.personalBests.map((pb) => (
          <Pressable
            key={pb.exerciseId}
            onPress={() => router.push(Routes.exercise(pb.exerciseId))}
            accessibilityRole="button"
            style={{ paddingVertical: space.xs }}
          >
            <AppText style={{ fontWeight: '600' }}>{pb.exerciseName}</AppText>
            <AppText variant="small">{describePersonalBest(pb, units)}</AppText>
          </Pressable>
        ))
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: space.xs }}>
      <AppText variant="title">{value}</AppText>
      <AppText variant="small">{label}</AppText>
    </View>
  );
}

function AveragesCard({ data }: CardProps) {
  const a = data.averages;
  const none = '–';
  return (
    <Card title={`${titleOf(DashboardCardType.Averages)} (last ${data.averagesWindowDays} days)`}>
      {a.setCount === 0 ? (
        <AppText variant="muted">No sets in this window yet.</AppText>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Stat label="Sets" value={String(a.setCount)} />
            <Stat label="Avg reps" value={a.avgReps === null ? none : trimNumber(a.avgReps, 1)} />
          </View>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Stat
              label={`Avg weight (${data.weightUnit})`}
              value={a.avgWeightKg === null ? none : trimNumber(fromKg(a.avgWeightKg, data.weightUnit), 1)}
            />
            <Stat
              label="Avg time"
              value={a.avgDurationSec === null ? none : formatDuration(a.avgDurationSec)}
            />
          </View>
        </>
      )}
    </Card>
  );
}

function AiGuidanceCard(_props: CardProps) {
  return (
    <Card title={titleOf(DashboardCardType.AiGuidance)}>
      <AppText variant="muted">
        Personalised guidance will appear here once AI analysis is added. It will use your logged
        history to suggest what to focus on for better gains.
      </AppText>
      <AppButton compact variant="secondary" label="Coming soon" onPress={() => undefined} disabled />
    </Card>
  );
}

/**
 * Maps each card type to its component. Adding a card means: add the enum
 * value, a catalog entry (domain/cardCatalog.ts) and one line here. The
 * Record type makes the compiler fail if a type is missing.
 */
export const CARD_COMPONENTS: Record<DashboardCardType, ComponentType<CardProps>> = {
  [DashboardCardType.Affirmation]: AffirmationCard,
  [DashboardCardType.WeeklyGoalGauge]: WeeklyGoalGaugeCard,
  [DashboardCardType.WeeklyVolumeChart]: WeeklyVolumeChartCard,
  [DashboardCardType.PersonalBests]: PersonalBestsCard,
  [DashboardCardType.Averages]: AveragesCard,
  [DashboardCardType.AiGuidance]: AiGuidanceCard,
};
