import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { ConfigKey } from '@/config/configDefinitions';
import { WeightUnit } from '@/constants/enums';
import { calculatePlates, smallestIncrement } from '@/domain/plates';
import { formatDuration, trimNumber } from '@/domain/units';
import { buildWarmup, type WarmupStep } from '@/domain/warmup';
import { RestTimerBar } from '@/features/timer/RestTimerBar';
import { useRestTimer } from '@/features/timer/RestTimerProvider';
import { useUnits } from '@/hooks/useConfigRefresh';
import { useServices } from '@/services/ServicesProvider';
import { AppButton } from '@/ui/components/AppButton';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { Field } from '@/ui/components/Field';
import { Screen } from '@/ui/components/Screen';
import { parseNumberInput } from '@/ui/format';
import { space } from '@/ui/theme';

/**
 * Tools tab: rest-timer presets, plate calculator and warm-up calculator.
 * Plate list, bar weight and warm-up scheme are read from config (per unit), so
 * they match the gym's actual equipment and can be changed in Settings.
 */
export default function ToolsScreen() {
  const { config } = useServices();
  const timer = useRestTimer();
  const { weight: unit } = useUnits();
  const [targetText, setTargetText] = useState('');
  const [workingText, setWorkingText] = useState('');

  const isKg = unit === WeightUnit.Kg;
  const barWeight = config.getNumber(isKg ? ConfigKey.PlatesBarKg : ConfigKey.PlatesBarLb);
  const plates = config.getJson<number[]>(isKg ? ConfigKey.PlatesAvailableKg : ConfigKey.PlatesAvailableLb);
  const presets = config.getJson<number[]>(ConfigKey.TimerPresetsSeconds);
  const scheme = config.getJson<WarmupStep[]>(ConfigKey.WarmupScheme);

  const target = parseNumberInput(targetText);
  const working = parseNumberInput(workingText);

  const plateResult = useMemo(
    () =>
      target !== null && !Number.isNaN(target)
        ? calculatePlates({ targetWeight: target, barWeight, plates })
        : null,
    [target, barWeight, plates],
  );

  const warmup = useMemo(
    () =>
      working !== null && !Number.isNaN(working)
        ? buildWarmup({ workingWeight: working, barWeight, scheme, increment: smallestIncrement(plates) })
        : null,
    [working, barWeight, scheme, plates],
  );

  return (
    <Screen>
      <RestTimerBar />

      <Card title="Rest timer">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {presets.map((seconds) => (
            <AppButton key={seconds} compact variant="secondary" label={formatDuration(seconds)} onPress={() => timer.start(seconds)} />
          ))}
        </View>
        <AppText variant="small">Timers also start automatically after each logged set (Settings &gt; Rest timer).</AppText>
      </Card>

      <Card title="Plate calculator">
        <Field
          label={`Target weight (${unit})`}
          value={targetText}
          onChangeText={setTargetText}
          keyboardType="decimal-pad"
          error={target !== null && Number.isNaN(target) ? 'Enter a number.' : null}
        />
        <AppText variant="small">Bar: {trimNumber(barWeight, 2)} {unit}</AppText>
        {plateResult ? (
          plateResult.belowBar ? (
            <AppText>That is lighter than the empty bar ({trimNumber(barWeight, 2)} {unit}).</AppText>
          ) : (
            <>
              <AppText variant="label">EACH SIDE</AppText>
              {plateResult.perSide.length === 0 ? (
                <AppText>Just the bar.</AppText>
              ) : (
                plateResult.perSide.map((pc) => (
                  <AppText key={pc.plate} variant="title">
                    {pc.count} × {trimNumber(pc.plate, 2)} {unit}
                  </AppText>
                ))
              )}
              <AppText variant="small">Total on the bar: {trimNumber(plateResult.achievedWeight, 2)} {unit}</AppText>
              {plateResult.shortfall > 0 ? (
                <AppText variant="small">
                  Your plates cannot make {trimNumber(target ?? 0, 2)} {unit} exactly; closest below is shown.
                </AppText>
              ) : null}
            </>
          )
        ) : null}
      </Card>

      <Card title="Warm-up sets">
        <Field
          label={`Working weight (${unit})`}
          value={workingText}
          onChangeText={setWorkingText}
          keyboardType="decimal-pad"
          error={working !== null && Number.isNaN(working) ? 'Enter a number.' : null}
        />
        {warmup ? (
          warmup.length === 0 ? (
            <AppText variant="muted">No warm-up needed at this weight.</AppText>
          ) : (
            warmup.map((set, i) => (
              <AppText key={`${set.weight}-${i}`}>
                Set {i + 1}: {trimNumber(set.weight, 2)} {unit} × {set.reps}{' '}
                <AppText variant="small">({Math.round(set.pct * 100)}%)</AppText>
              </AppText>
            ))
          )
        ) : null}
        <AppText variant="small">Rounded to your smallest plate jump. Edit the scheme in Settings.</AppText>
      </Card>
    </Screen>
  );
}
