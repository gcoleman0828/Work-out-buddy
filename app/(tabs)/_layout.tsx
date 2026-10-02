import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { TabIcon, TabIconName } from '@/ui/components/TabIcon';
import { usePalette } from '@/ui/theme';

/** Bottom tab bar: the five top-level areas of the app. */
export default function TabsLayout() {
  const p = usePalette();
  const icon = (name: TabIconName) =>
    function Icon({ color }: { color: ColorValue }) {
      return <TabIcon name={name} color={color} />;
    };
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: p.card },
        headerTintColor: p.text,
        tabBarStyle: { backgroundColor: p.card, borderTopColor: p.border },
        tabBarActiveTintColor: p.primary,
        tabBarInactiveTintColor: p.textMuted,
        sceneStyle: { backgroundColor: p.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: icon(TabIconName.Dashboard) }} />
      <Tabs.Screen name="log" options={{ title: 'Log', tabBarIcon: icon(TabIconName.Log) }} />
      <Tabs.Screen name="library" options={{ title: 'Library', tabBarIcon: icon(TabIconName.Library) }} />
      <Tabs.Screen name="tools" options={{ title: 'Tools', tabBarIcon: icon(TabIconName.Tools) }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon(TabIconName.Settings) }} />
    </Tabs>
  );
}
