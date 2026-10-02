import { View } from 'react-native';
import { TimerStatus } from '@/constants/enums';
import { formatDuration } from '@/domain/units';
import { AppButton } from '@/ui/components/AppButton';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { radius, space, usePalette } from '@/ui/theme';
import { useRestTimer } from './RestTimerProvider';

/** Countdown with progress bar and +time / stop controls. Renders nothing while idle. */
export function RestTimerBar() {
  const p = usePalette();
  const timer = useRestTimer();
  if (timer.status === TimerStatus.Idle) return null;

  const finished = timer.status === TimerStatus.Finished;
  return (
    <Card title={finished ? 'Rest over' : 'Rest timer'}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="display" color={finished ? p.success : p.text}>
          {finished ? 'Go!' : formatDuration(timer.remainingSec)}
        </AppText>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <AppButton compact variant="secondary" label="+ Time" onPress={timer.extend} />
          <AppButton compact variant="secondary" label={finished ? 'Dismiss' : 'Skip'} onPress={timer.stop} />
        </View>
      </View>
      <View style={{ height: 6, backgroundColor: p.border, borderRadius: radius.sm, overflow: 'hidden' }}>
        <View
          style={{
            height: 6,
            width: `${Math.round(timer.progress * 100)}%`,
            backgroundColor: finished ? p.success : p.primary,
          }}
        />
      </View>
    </Card>
  );
}
