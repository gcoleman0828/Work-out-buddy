import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { space, usePalette } from '../theme';

interface Props {
  children: ReactNode;
  /** Pull-to-refresh handler; omit to disable. */
  onRefresh?: () => void;
  refreshing?: boolean;
}

/**
 * Standard scrolling page: themed background, consistent padding, and
 * keyboardShouldPersistTaps so tapping a button while the keyboard is open
 * works on the first tap instead of just dismissing the keyboard.
 */
export function Screen({ children, onRefresh, refreshing }: Props) {
  const p = usePalette();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: p.background }}
      contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

/** Full-height centered container for splash / error states. */
export function Centered({ children }: { children: ReactNode }) {
  const p = usePalette();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: p.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: space.xl,
        gap: space.md,
      }}
    >
      {children}
    </View>
  );
}
