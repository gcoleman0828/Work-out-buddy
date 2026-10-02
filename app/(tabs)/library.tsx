import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { EnrichmentStatus, LogSource } from '@/constants/enums';
import { NEW_ID, Routes } from '@/constants/routes';
import { normalizeNameKey } from '@/domain/text';
import { useLoad } from '@/hooks/useLoad';
import { useServices } from '@/services/ServicesProvider';
import { AppButton } from '@/ui/components/AppButton';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { Field } from '@/ui/components/Field';
import { Screen } from '@/ui/components/Screen';
import { labelOf } from '@/ui/format';
import { space, usePalette } from '@/ui/theme';

/** Library tab: searchable list of exercises; tap one to open its detail page. */
export default function LibraryScreen() {
  const p = usePalette();
  const router = useRouter();
  const { library } = useServices();
  const [query, setQuery] = useState('');

  const loader = useCallback(() => library.listAll(), [library]);
  const { data: exercises, reload, loading } = useLoad(loader, LogSource.Library, 'the exercise library');

  const key = normalizeNameKey(query);
  const visible = (exercises ?? []).filter((e) => !key || e.nameKey.includes(key));

  return (
    <Screen onRefresh={reload} refreshing={loading && exercises !== null}>
      <AppButton label="Add exercise" onPress={() => router.push(Routes.exercise(NEW_ID))} />
      <Field label="Search" value={query} onChangeText={setQuery} placeholder="Search exercises" autoCorrect={false} />
      {exercises !== null && visible.length === 0 ? (
        <AppText variant="muted">No exercises match. Add it with the button above, or log it and it is added automatically.</AppText>
      ) : null}
      {visible.map((exercise) => (
        <Card key={exercise.id} onPress={() => router.push(Routes.exercise(exercise.id))}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
            <AppText style={{ fontWeight: '600', flex: 1 }}>{exercise.name}</AppText>
            {exercise.enrichmentStatus === EnrichmentStatus.NeedsReview ? (
              <AppText variant="small" color={p.warning}>Needs review</AppText>
            ) : null}
          </View>
          <AppText variant="small">
            {labelOf(exercise.muscleGroup)} · {labelOf(exercise.equipment)}
          </AppText>
        </Card>
      ))}
    </Screen>
  );
}
