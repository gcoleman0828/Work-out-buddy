import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { usePalette } from '../theme';
import { AppText } from './AppText';

interface Props {
  value: number;
  target: number;
  /** Text under the number, e.g. "of 3 days". */
  caption: string;
  size?: number;
}

const STROKE = 14;
const START_DEG = 180;
const SWEEP_DEG = 180;

function pointOnCircle(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** SVG path for an arc along the top half of the circle from `fromFrac` to `toFrac` (0..1). */
function arcPath(cx: number, cy: number, r: number, fromFrac: number, toFrac: number): string {
  const a = pointOnCircle(cx, cy, r, START_DEG + SWEEP_DEG * fromFrac);
  const b = pointOnCircle(cx, cy, r, START_DEG + SWEEP_DEG * toFrac);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`;
}

/** Half-circle progress gauge: value out of target (clamped to 100% for the arc). */
export function Gauge({ value, target, caption, size = 200 }: Props) {
  const p = usePalette();
  const r = (size - STROKE) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const fraction = target > 0 ? Math.min(1, Math.max(0, value / target)) : 0;
  const reached = target > 0 && value >= target;
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size / 2 + STROKE }}>
        <Svg width={size} height={size / 2 + STROKE}>
          <Path
            d={arcPath(cx, cy, r, 0, 1)}
            stroke={p.border}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
          />
          {fraction > 0 ? (
            <Path
              d={arcPath(cx, cy, r, 0, fraction)}
              stroke={reached ? p.success : p.primary}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
            />
          ) : null}
        </Svg>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' }}>
          <AppText variant="display">{value}</AppText>
          <AppText variant="small">{caption}</AppText>
        </View>
      </View>
    </View>
  );
}
