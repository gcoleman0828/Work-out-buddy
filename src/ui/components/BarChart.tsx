import { View } from 'react-native';
import { radius, space, usePalette } from '../theme';
import { AppText } from './AppText';

interface Props {
  labels: readonly string[];
  values: readonly number[];
  height?: number;
  /** Formats the value shown above each bar (hidden when the bar is empty). */
  formatValue?: (value: number) => string;
}

const MIN_BAR_HEIGHT = 2;

/** Minimal bar chart built from Views (no chart library needed for 7 bars). */
export function BarChart({ labels, values, height = 120, formatValue }: Props) {
  const p = usePalette();
  const max = Math.max(...values, 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
      {values.map((value, i) => {
        const barHeight = max > 0 ? Math.max(MIN_BAR_HEIGHT, (value / max) * height) : MIN_BAR_HEIGHT;
        return (
          <View key={`${labels[i]}-${i}`} style={{ flex: 1, alignItems: 'center', gap: space.xs }}>
            <AppText variant="small">{value > 0 && formatValue ? formatValue(value) : ' '}</AppText>
            <View
              style={{
                width: '100%',
                height: barHeight,
                backgroundColor: value > 0 ? p.primary : p.border,
                borderRadius: radius.sm,
              }}
            />
            <AppText variant="small">{labels[i]}</AppText>
          </View>
        );
      })}
    </View>
  );
}
