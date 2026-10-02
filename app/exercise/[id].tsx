import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking } from 'react-native';
import { EnrichmentStatus, Equipment, ErrorCode, LogSource, MuscleGroup } from '@/constants/enums';
import { NEW_ID } from '@/constants/routes';
import { AppError } from '@/errors/AppError';
import type { Exercise } from '@/domain/models';
import { trimNumber } from '@/domain/units';
import { useUnits } from '@/hooks/useConfigRefresh';
import { useLoad } from '@/hooks/useLoad';
import { errorReporter } from '@/services/ErrorReporter';
import { useServices } from '@/services/ServicesProvider';
import type { ExerciseSummary } from '@/services/WorkoutService';
import { AppButton } from '@/ui/components/AppButton';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { ChipSelect } from '@/ui/components/ChipSelect';
import { Field } from '@/ui/components/Field';
import { Screen } from '@/ui/components/Screen';
import { describePersonalBest, labelOf } from '@/ui/format';
import { usePalette } from '@/ui/theme';

interface Loaded {
  exercise: Exercise | null;
  summary: ExerciseSummary | null;
}

/** Detail page for one exercise (or "new"): view and edit everything, see your stats, delete. */
export default function ExerciseDetailScreen() {
  const p = usePalette();
  const router = useRouter();
  const { library, workouts } = useServices();
  const units = useUnits();
  const { id } = useLocalSearchParams<{ id: string }>();

  const isNew = id === NEW_ID;
  const exerciseId = isNew ? null : Number(id);
  const idIsValid = isNew || (exerciseId !== null && Number.isInteger(exerciseId));

  const loader = useCallback(async (): Promise<Loaded> => {
    if (exerciseId === null || !idIsValid) return { exercise: null, summary: null };
    const [exercise, summary] = await Promise.all([library.getById(exerciseId), workouts.summaryFor(exerciseId)]);
    return { exercise, summary };
  }, [library, workouts, exerciseId, idIsValid]);
  const { data, loading } = useLoad(loader, LogSource.Library, 'the exercise');

  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(MuscleGroup.Other);
  const [equipment, setEquipment] = useState<Equipment>(Equipment.Other);
  const [instructions, setInstructions] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Fill the form when the record arrives (not on every re-render, so edits are kept).
  const loadedId = data?.exercise?.id ?? null;
  useEffect(() => {
    const e = data?.exercise;
    if (!e) return;
    setName(e.name);
    setMuscleGroup(e.muscleGroup);
    setEquipment(e.equipment);
    setInstructions(e.instructions ?? '');
    setVideoUrl(e.videoUrl ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedId]);

  const exercise = data?.exercise ?? null;

  const onSave = async () => {
    setSaving(true);
    const savedId = await errorReporter.guard(
      () =>
        library.save(exerciseId, {
          name,
          muscleGroup,
          equipment,
          instructions,
          videoUrl,
          imageUri: exercise?.imageUri ?? null,
        }),
      { source: LogSource.Library, what: 'Failed to save exercise', userMessage: 'The exercise could not be saved.' },
    );
    setSaving(false);
    if (savedId !== undefined) router.back();
  };

  const confirmDelete = () => {
    if (exerciseId === null) return;
    Alert.alert('Delete exercise?', `"${name}" will be removed from your library.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const done = await errorReporter.guard(() => library.delete(exerciseId), {
            source: LogSource.Library,
            what: 'Failed to delete exercise',
            userMessage: 'The exercise could not be deleted.',
          });
          if (done !== undefined) router.back();
        },
      },
    ]);
  };

  const openVideo = async () => {
    const url = videoUrl.trim() || library.videoUrlFor(name);
    await errorReporter.guard(
      async () => {
        if (!(await Linking.canOpenURL(url))) {
          throw new AppError(ErrorCode.Validation, 'That link cannot be opened on this device.');
        }
        await Linking.openURL(url);
      },
      { source: LogSource.Library, what: 'Failed to open video link', userMessage: 'The video link could not be opened.' },
    );
  };

  if (!idIsValid || (!isNew && !loading && !exercise)) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Exercise' }} />
        <AppText variant="muted">That exercise could not be found. It may have been deleted.</AppText>
        <AppButton variant="secondary" label="Go back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const summary = data?.summary;
  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? 'New exercise' : (exercise?.name ?? 'Exercise') }} />

      {exercise?.enrichmentStatus === EnrichmentStatus.NeedsReview ? (
        <Card title="Needs review">
          <AppText color={p.warning}>
            This exercise was added automatically and could not be matched to a known exercise
            {exercise.enrichmentConfidence !== null
              ? ` (closest match ${Math.round(exercise.enrichmentConfidence * 100)}%)`
              : ''}
            . Add the details below and save to mark it reviewed.
          </AppText>
        </Card>
      ) : null}

      {exercise?.imageUri ? (
        <Image source={{ uri: exercise.imageUri }} style={{ width: '100%', height: 200, borderRadius: 12 }} accessibilityLabel={`${exercise.name} picture`} />
      ) : null}

      <Card title="Details">
        <Field label="Name" value={name} onChangeText={setName} autoCorrect={false} />
        <ChipSelect label="Muscle group" options={Object.values(MuscleGroup)} value={muscleGroup} onChange={setMuscleGroup} render={labelOf} />
        <ChipSelect label="Equipment" options={Object.values(Equipment)} value={equipment} onChange={setEquipment} render={labelOf} />
        <Field label="How to do it" value={instructions} onChangeText={setInstructions} multiline />
        <Field label="Video link" value={videoUrl} onChangeText={setVideoUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="Leave empty for a YouTube search link" />
        <AppButton variant="secondary" label="Watch how-to video" onPress={openVideo} disabled={name.trim() === ''} />
      </Card>

      {summary && summary.setCount > 0 ? (
        <Card title="Your numbers">
          <AppText>{summary.setCount} sets logged</AppText>
          {summary.averages.avgReps !== null ? <AppText>Average reps: {trimNumber(summary.averages.avgReps, 1)}</AppText> : null}
          {summary.best ? <AppText>Best: {describePersonalBest(summary.best, units)}</AppText> : null}
        </Card>
      ) : null}

      <AppButton label={isNew ? 'Add to library' : 'Save changes'} onPress={onSave} disabled={saving || name.trim() === ''} />
      {!isNew ? <AppButton variant="danger" label="Delete exercise" onPress={confirmDelete} /> : null}
    </Screen>
  );
}
