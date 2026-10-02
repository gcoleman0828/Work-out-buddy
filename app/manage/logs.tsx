import { useCallback, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { ConfigKey } from '@/config/configDefinitions';
import { LogLevel, LogSource } from '@/constants/enums';
import type { StoredLog } from '@/db/repositories/LogRepository';
import { useLoad } from '@/hooks/useLoad';
import { errorReporter } from '@/services/ErrorReporter';
import { useServices } from '@/services/ServicesProvider';
import { AppButton } from '@/ui/components/AppButton';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { space, usePalette } from '@/ui/theme';

/**
 * Diagnostics screen: the log collector's contents, newest first. This is where
 * a problem that showed a friendly banner can be inspected afterwards (tap an
 * entry to expand the technical detail and stack).
 */
export default function LogsScreen() {
  const p = usePalette();
  const { logs, config } = useServices();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loader = useCallback(() => logs.recent(config.getNumber(ConfigKey.LoggingViewerRows)), [logs, config]);
  const { data: entries, reload } = useLoad(loader, LogSource.App, 'the diagnostics log');

  const colorFor = (level: LogLevel) =>
    level === LogLevel.Error ? p.danger : level === LogLevel.Warn ? p.warning : p.textMuted;

  const confirmClear = () =>
    Alert.alert('Clear the log?', 'All recorded diagnostics are deleted. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await errorReporter.guard(() => logs.clear(), {
            source: LogSource.App,
            what: 'Failed to clear logs',
            userMessage: 'The log could not be cleared.',
          });
          reload();
        },
      },
    ]);

  return (
    <Screen onRefresh={reload}>
      <AppButton variant="secondary" label="Clear log" onPress={confirmClear} disabled={!entries?.length} />
      {entries && entries.length === 0 ? <AppText variant="muted">The log is empty.</AppText> : null}
      {(entries ?? []).map((entry: StoredLog) => {
        const open = expandedId === entry.id;
        return (
          <Pressable key={entry.id} onPress={() => setExpandedId(open ? null : entry.id)} accessibilityRole="button">
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
                <AppText variant="label" color={colorFor(entry.level)}>
                  {entry.level.toUpperCase()} · {entry.source}
                </AppText>
                <AppText variant="small">{new Date(entry.createdAt).toLocaleString()}</AppText>
              </View>
              <AppText>{entry.message}</AppText>
              {open && entry.detail ? (
                <AppText variant="small" selectable>
                  {entry.detail}
                </AppText>
              ) : null}
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
