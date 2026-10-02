import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { LogSource } from '@/constants/enums';
import { formatDuration, fromKg, fromMeters, parseDurationInput, toKg, toMeters, trimNumber } from '@/domain/units';
import { useUnits } from '@/hooks/useConfigRefresh';
import { useLoad } from '@/hooks/useLoad';
import { errorReporter } from '@/services/ErrorReporter';
import { useServices } from '@/services/ServicesProvider';
import { AppButton } from '@/ui/components/AppButton';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { Field } from '@/ui/components/Field';
import { Screen } from '@/ui/components/Screen';
import { parseNumberInput } from '@/ui/format';

/** Detail page for one logged set: correct a mistake or delete it. */
export default function SetDetailScreen() {
  const router = useRouter();
  const { workouts } = useServices();
  const units = useUnits();
  const { id } = useLocalSearchParams<{ id: string }>();
  const setId = Number(id);
  const idIsValid = Number.isInteger(setId);

  const loader = useCallback(async () => (idIsValid ? workouts.getSet(setId) : null), [workouts, setId, idIsValid]);
  const { data: set, loading } = useLoad(loader, LogSource.Workout, 'the set');

  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');

  const loadedId = set?.id ?? null;
  useEffect(() => {
    if (!set) return;
    setReps(set.reps ? String(set.reps) : '');
    setWeight(set.weightKg ? trimNumber(fromKg(set.weightKg, units.weight), 2) : '');
    setDuration(set.durationSec ? formatDuration(set.durationSec) : '');
    setDistance(set.distanceM ? trimNumber(fromMeters(set.distanceM, units.distance), 2) : '');
    setNotes(set.notes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedId]);

  const onSave = async () => {
    const repsN = parseNumberInput(reps);
    const weightN = parseNumberInput(weight);
    const distanceN = parseNumberInput(distance);
    const durationSec = duration.trim() === '' ? null : parseDurationInput(duration);
    if ([repsN, weightN, distanceN].some((n) => Number.isNaN(n)) || (duration.trim() !== '' && durationSec === null)) {
      errorReporter.notify('Check the numbers: reps, weight and distance are plain numbers; time is m:ss.');
      return;
    }
    const done = await errorReporter.guard(
      () =>
        workouts.updateSet(setId, {
          reps: repsN,
          weightKg: weightN === null ? null : toKg(weightN, units.weight),
          durationSec,
          distanceM: distanceN === null ? null : toMeters(distanceN, units.distance),
          notes: notes.trim() || null,
        }),
      { source: LogSource.Workout, what: 'Failed to update set', userMessage: 'The set could not be saved.' },
    );
    if (done !== undefined) router.back();
  };

  const confirmDelete = () => {
    Alert.alert('Delete this set?', 'This removes the record permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const done = await errorReporter.guard(() => workouts.deleteSet(setId), {
            source: LogSource.Workout,
            what: 'Failed to delete set',
            userMessage: 'The set could not be deleted.',
          });
          if (done !== undefined) router.back();
        },
      },
    ]);
  };

  if (!idIsValid || (!loading && !set)) {
    return (
      <Screen>
        <AppText variant="muted">That set could not be found. It may have been deleted.</AppText>
        <AppButton variant="secondary" label="Go back" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: set?.exerciseName ?? 'Edit set' }} />
      <Card title={set ? `${set.exerciseName} · ${new Date(set.createdAt).toLocaleString()}` : 'Set'}>
        <Field label="Reps" value={reps} onChangeText={setReps} keyboardType="number-pad" />
        <Field label={`Weight (${units.weight})`} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
        <Field label={`Distance (${units.distance})`} value={distance} onChangeText={setDistance} keyboardType="decimal-pad" />
        <Field label="Time (m:ss)" value={duration} onChangeText={setDuration} keyboardType="numbers-and-punctuation" />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      </Card>
      <AppButton label="Save changes" onPress={onSave} />
      <AppButton variant="danger" label="Delete set" onPress={confirmDelete} />
    </Screen>
  );
}
