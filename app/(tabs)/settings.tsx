import { useRouter } from 'expo-router';
import { View } from 'react-native';
import {
  CONFIG_DEFINITIONS,
  CONFIG_KEYS_IN_ORDER,
  type ConfigDefinition,
  type ConfigGroup,
} from '@/config/configDefinitions';
import { Routes } from '@/constants/routes';
import { ConfigRow } from '@/features/settings/ConfigRow';
import { AppButton } from '@/ui/components/AppButton';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { space } from '@/ui/theme';

/** Group definitions by their ConfigGroup, keeping the declared order. */
function groupDefinitions(): [ConfigGroup, ConfigDefinition[]][] {
  const groups = new Map<ConfigGroup, ConfigDefinition[]>();
  for (const key of CONFIG_KEYS_IN_ORDER) {
    const def = CONFIG_DEFINITIONS[key];
    groups.set(def.group, [...(groups.get(def.group) ?? []), def]);
  }
  return [...groups.entries()];
}

const GROUPS = groupDefinitions();

/**
 * Settings tab. Everything configurable is generated from configDefinitions.ts,
 * so a new config key shows up here automatically with the right control.
 */
export default function SettingsScreen() {
  const router = useRouter();
  return (
    <Screen>
      <Card title="Customize">
        <AppButton variant="secondary" label="Dashboard cards" onPress={() => router.push(Routes.dashboardCards)} />
        <AppButton variant="secondary" label="Diagnostics log" onPress={() => router.push(Routes.logs)} />
      </Card>
      {GROUPS.map(([group, definitions]) => (
        <Card key={group} title={group}>
          <View style={{ gap: space.lg }}>
            {definitions.map((definition) => (
              <ConfigRow key={definition.key} definition={definition} />
            ))}
          </View>
        </Card>
      ))}
    </Screen>
  );
}
