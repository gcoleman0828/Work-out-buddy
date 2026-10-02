import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfigKey } from '@/config/configDefinitions';
import { errorReporter, type UserNotice } from '@/services/ErrorReporter';
import { useServices } from '@/services/ServicesProvider';
import { radius, space, usePalette } from '../theme';
import { AppText } from './AppText';

/**
 * The friendly error banner. Subscribes to ErrorReporter, so ANY caught failure
 * anywhere in the app shows up here, with no per-screen wiring. Tapping dismisses.
 */
export function NoticeHost() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { config } = useServices();
  const [notice, setNotice] = useState<UserNotice | null>(null);

  useEffect(() => errorReporter.subscribe(setNotice), []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(
      () => setNotice(null),
      config.getNumber(ConfigKey.UiNoticeDurationMs),
    );
    return () => clearTimeout(timer);
  }, [notice, config]);

  if (!notice) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, top: insets.top + space.sm, paddingHorizontal: space.lg }}
    >
      <Pressable
        onPress={() => setNotice(null)}
        accessibilityRole="alert"
        accessibilityLabel={`${notice.message}. Tap to dismiss.`}
        style={{
          backgroundColor: p.danger,
          borderRadius: radius.md,
          padding: space.md,
          elevation: 6,
        }}
      >
        <AppText color="#FFFFFF">{notice.message}</AppText>
      </Pressable>
    </View>
  );
}
