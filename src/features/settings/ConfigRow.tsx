import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import {
  type ConfigDefinition,
  ConfigType,
  validateConfigValue,
} from '@/config/configDefinitions';
import { LogSource } from '@/constants/enums';
import { errorReporter } from '@/services/ErrorReporter';
import { useServices } from '@/services/ServicesProvider';
import { AppButton } from '@/ui/components/AppButton';
import { AppText } from '@/ui/components/AppText';
import { ChipSelect } from '@/ui/components/ChipSelect';
import { Field } from '@/ui/components/Field';
import { space } from '@/ui/theme';

/**
 * One editable setting, rendered from its ConfigDefinition. The Settings screen
 * is just a list of these, so adding a config key needs no new UI code: define
 * the key in configDefinitions.ts and it appears here with the right control.
 *
 * Booleans and option lists save immediately; text and numbers show a Save
 * button once the value has changed and is valid.
 */
export function ConfigRow({ definition }: { definition: ConfigDefinition }) {
  const { config } = useServices();
  const [saved, setSaved] = useState(() => config.getRaw(definition.key));
  const [draft, setDraft] = useState(saved);
  const [overridden, setOverridden] = useState(() => config.isOverridden(definition.key));

  // Stay in sync if something else changes this key (e.g. "Reset to default").
  useEffect(
    () =>
      config.subscribe(() => {
        const raw = config.getRaw(definition.key);
        setSaved(raw);
        setDraft(raw);
        setOverridden(config.isOverridden(definition.key));
      }),
    [config, definition.key],
  );

  const persist = async (raw: string) => {
    await errorReporter.guard(() => config.set(definition.key, raw), {
      source: LogSource.Settings,
      what: `Failed to save setting ${definition.key}`,
    });
  };

  const reset = async () => {
    await errorReporter.guard(() => config.reset(definition.key), {
      source: LogSource.Settings,
      what: `Failed to reset setting ${definition.key}`,
    });
  };

  const error = draft === saved ? null : validateConfigValue(definition.key, draft);
  const dirty = draft !== saved;

  let control;
  if (definition.type === ConfigType.Boolean) {
    control = (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText style={{ flex: 1 }}>{definition.label}</AppText>
        <Switch value={saved === 'true'} onValueChange={(v) => persist(String(v))} />
      </View>
    );
  } else if (definition.options) {
    control = (
      <ChipSelect
        label={definition.label}
        options={definition.options}
        value={saved}
        onChange={(v) => persist(v)}
      />
    );
  } else {
    control = (
      <Field
        label={definition.label}
        value={draft}
        onChangeText={setDraft}
        error={error}
        multiline={definition.type === ConfigType.Json}
        keyboardType={definition.type === ConfigType.Number ? 'decimal-pad' : 'default'}
        autoCapitalize="none"
        autoCorrect={false}
      />
    );
  }

  return (
    <View style={{ gap: space.xs }}>
      {control}
      <AppText variant="small">{definition.description}</AppText>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {dirty ? (
          <AppButton compact label="Save" onPress={() => persist(draft)} disabled={error !== null} />
        ) : null}
        {dirty ? (
          <AppButton compact variant="secondary" label="Undo" onPress={() => setDraft(saved)} />
        ) : null}
        {overridden && !dirty ? (
          <AppButton compact variant="secondary" label="Reset to default" onPress={reset} />
        ) : null}
      </View>
    </View>
  );
}
