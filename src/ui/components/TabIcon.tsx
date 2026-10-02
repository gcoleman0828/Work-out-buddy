import type { ColorValue } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

export enum TabIconName {
  Dashboard = 'dashboard',
  Log = 'log',
  Library = 'library',
  Tools = 'tools',
  Settings = 'settings',
}

const SIZE = 24;
const STROKE = 2;

/** Tiny line icons drawn with SVG primitives, so no icon-font package is needed. */
export function TabIcon({ name, color }: { name: TabIconName; color: ColorValue }) {
  const common = { stroke: color, strokeWidth: STROKE, strokeLinecap: 'round' as const, fill: 'none' };
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 24 24">
      {name === TabIconName.Dashboard ? (
        <>
          <Rect x="3" y="3" width="7" height="7" rx="1.5" {...common} />
          <Rect x="14" y="3" width="7" height="7" rx="1.5" {...common} />
          <Rect x="3" y="14" width="7" height="7" rx="1.5" {...common} />
          <Rect x="14" y="14" width="7" height="7" rx="1.5" {...common} />
        </>
      ) : null}
      {name === TabIconName.Log ? (
        <>
          <Line x1="12" y1="5" x2="12" y2="19" {...common} />
          <Line x1="5" y1="12" x2="19" y2="12" {...common} />
        </>
      ) : null}
      {name === TabIconName.Library ? (
        <>
          <Line x1="4" y1="6" x2="20" y2="6" {...common} />
          <Line x1="4" y1="12" x2="20" y2="12" {...common} />
          <Line x1="4" y1="18" x2="20" y2="18" {...common} />
        </>
      ) : null}
      {name === TabIconName.Tools ? (
        <>
          <Line x1="4" y1="8" x2="20" y2="8" {...common} />
          <Circle cx="9" cy="8" r="2.5" fill={color} stroke={color} />
          <Line x1="4" y1="16" x2="20" y2="16" {...common} />
          <Circle cx="15" cy="16" r="2.5" fill={color} stroke={color} />
        </>
      ) : null}
      {name === TabIconName.Settings ? (
        <>
          <Circle cx="12" cy="12" r="3.5" {...common} />
          <Circle cx="12" cy="12" r="8" {...common} />
        </>
      ) : null}
    </Svg>
  );
}
