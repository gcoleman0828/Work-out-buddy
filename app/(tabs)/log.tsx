import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ConfigKey } from '@/config/configDefinitions';
import { EnrichmentStatus, LogSource, ParsedField } from '@/constants/enums';
import { Routes } from '@/constants/routes';
import { parseWorkoutCommand } from '@/domain/commandParser';
import type { Exercise, ParsedCommand } from '@/domain/models';
import { normalizeNameKey } from '@/domain/text';
import { formatDuration, fromKg, fromMeters, parseDurationInput, toKg, toMeters, trimNumber } from '@/domain/units';
import { RestTimerBar } from '@/features/timer/RestTimerBar';
import { useRestTimer } from '@/features/timer/RestTimerProvider';
import { useUnits } from '@/hooks/useConfigRefresh';
import { useLoad } from '@/hooks/useLoad';
import { errorReporter } from '@/services/ErrorReporter';
import { useServices } from '@/services/ServicesProvider';
import { type LogRequest, type LogResult, requestFromParsed } from '@/services/WorkoutService';
import { AppButton } from '@/ui/components/AppButton';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { Field } from '@/ui/components/Field';
import { Screen } from '@/ui/components/Screen';
import { describePersonalBest, describeSet, parseNumberInput } from '@/ui/format';
import { radius, space, usePalette } from '@/ui/theme';

interface FormState {
  exercise: string;
  sets: string;
  reps: string;
  weight: string;
  duration: string;
  distance: string;
}

const EMPTY_FORM: FormState = { exercise: '', sets: '', reps: '', weight: '', duration: '', distance: '' };

const SAVE_FAILED_MESSAGE = 'That could not be saved. Please try again.';

/**
 * Log tab. Two ways in, one save path:
 *   - say/type a sentence -> parseWorkoutCommand fills the form (and saves
 *     straight away when confidence is high enough)
 *   - fill the form by hand
 * Both end in saveRequest(), which calls WorkoutService.log().
 */
export default function LogScreen() {
  const p = usePalette();
  const router = useRouter();
  const { config, library, workouts } = useServices();
  const timer = useRestTimer();
  const units = useUnits();

  const [command, setCommand] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [hint, setHint] = useState<string | null>(null);
  const [result, setResult] = useState<LogResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Exercise[]>([]);

  const todayLoader = useCallback(() => workouts.today(), [workouts]);
  const { data: today, reload: reloadToday } = useLoad(todayLoader, LogSource.Workout, "today's sets");

  // Dropdown-style exercise suggestions as the name is typed.
  useEffect(() => {
    let cancelled = false;
    library
      .suggest(form.exercise)
      .then((list) => {
        if (!cancelled) setSuggestions(list);
      })
      .catch((error: unknown) =>
        errorReporter.report(error, { source: LogSource.Library, what: 'Failed to load exercise suggestions' }),
      );
    return () => {
      cancelled = true;
    };
  }, [form.exercise, library]);

  const setField = (key: keyof FormState) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const fillFormFrom = (parsed: ParsedCommand) => {
    setForm({
      exercise: parsed.exerciseName ?? '',
      sets: parsed.sets ? String(parsed.sets) : '',
      reps: parsed.reps ? String(parsed.reps) : '',
      weight: parsed.weight
        ? trimNumber(fromKg(toKg(parsed.weight.value, parsed.weight.unit), units.weight), 2)
        : '',
      duration: parsed.durationSec ? formatDuration(parsed.durationSec) : '',
      distance: parsed.distance
        ? trimNumber(fromMeters(toMeters(parsed.distance.value, parsed.distance.unit), units.distance), 2)
        : '',
    });
  };

  const saveRequest = async (request: LogRequest) => {
    setSaving(true);
    const logged = await errorReporter.guard(() => workouts.log(request), {
      source: LogSource.Workout,
      what: 'Failed to save set',
      userMessage: SAVE_FAILED_MESSAGE,
    });
    setSaving(false);
    if (!logged) return;
    setResult(logged);
    setCommand('');
    setForm(EMPTY_FORM);
    setHint(null);
    reloadToday();
    if (config.getBoolean(ConfigKey.TimerAutoStart)) timer.start();
  };

  const onUnderstand = async () => {
    if (!command.trim()) {
      errorReporter.notify('Type or dictate what you did first, e.g. "3 sets of 10 bench press at 135 lb".');
      return;
    }
    const parsed = parseWorkoutCommand(command, { defaultWeightUnit: units.weight });
    const autoSaveMin = config.getNumber(ConfigKey.LogAutoSaveMinConfidence);
    if (parsed.confidence >= autoSaveMin && parsed.missing.length === 0) {
      try {
        await saveRequest(requestFromParsed(parsed));
      } catch (error) {
        errorReporter.report(error, { source: LogSource.Nlp, what: 'Failed to build a record from the command' });
      }
      return;
    }
    fillFormFrom(parsed);
    const notes: string[] = [];
    if (parsed.missing.includes(ParsedField.Exercise)) notes.push('Which exercise was it?');
    if (parsed.missing.includes(ParsedField.Metric)) notes.push('Add reps, a time, or a distance.');
    if (parsed.missing.includes(ParsedField.Reps)) notes.push('How many reps?');
    if (parsed.weight?.assumedUnit) notes.push(`No unit given, so ${units.weight} was assumed.`);
    setHint(`${notes.join(' ')} Review the details, then tap Save.`.trim());
  };

  const onSaveForm = async () => {
    const reps = parseNumberInput(form.reps);
    const weight = parseNumberInput(form.weight);
    const distance = parseNumberInput(form.distance);
    const durationSec = form.duration.trim() === '' ? null : parseDurationInput(form.duration);
    const sets = form.sets.trim() === '' ? 1 : parseNumberInput(form.sets);

    if ([reps, weight, distance, sets].some((n) => Number.isNaN(n))) {
      errorReporter.notify('Sets, reps, weight and distance must be plain numbers.');
      return;
    }
    if (form.duration.trim() !== '' && durationSec === null) {
      errorReporter.notify('Enter time as minutes:seconds (like 5:20) or just seconds.');
      return;
    }
    await saveRequest({
      exerciseName: form.exercise,
      sets: sets ?? 1,
      reps,
      weightKg: weight === null ? null : toKg(weight, units.weight),
      durationSec,
      distanceM: distance === null ? null : toMeters(distance, units.distance),
      notes: null,
    });
  };

  const typedKey = normalizeNameKey(form.exercise);
  const isNewName = typedKey !== '' && !suggestions.some((s) => s.nameKey === typedKey);

  return (
    <Screen>
      <RestTimerBar />

      <Card title="Quick log">
        <Field
          label="What did you do?"
          value={command}
          onChangeText={setCommand}
          placeholder='e.g. "60 jumping jacks in 5 min 20 seconds"'
          returnKeyType="done"
          onSubmitEditing={onUnderstand}
          autoCorrect={false}
        />
        <AppText variant="small">
          Tip: tap the microphone on your keyboard to dictate. Say the exercise, reps, weight and time.
        </AppText>
        <AppButton label="Understand" onPress={onUnderstand} disabled={saving} />
      </Card>

      <Card title="Record details">
        {hint ? <AppText color={p.warning}>{hint}</AppText> : null}
        <Field label="Exercise" value={form.exercise} onChangeText={setField('exercise')} autoCorrect={false} />
        {suggestions.length > 0 && suggestions[0].nameKey !== typedKey ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {suggestions.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setField('exercise')(s.name)}
                accessibilityRole="button"
                style={{
                  borderWidth: 1,
                  borderColor: p.border,
                  borderRadius: radius.lg,
                  paddingVertical: space.xs + 2,
                  paddingHorizontal: space.md,
                }}
              >
                <AppText variant="small" color={p.text}>{s.name}</AppText>
              </Pressable>
            ))}
          </View>
        ) : null}
        {isNewName ? (
          <AppText variant="small">New exercise: it will be added to your library when you save.</AppText>
        ) : null}
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Field label="Sets" value={form.sets} onChangeText={setField('sets')} keyboardType="number-pad" placeholder="1" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Reps" value={form.reps} onChangeText={setField('reps')} keyboardType="number-pad" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Field label={`Weight (${units.weight})`} value={form.weight} onChangeText={setField('weight')} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label={`Distance (${units.distance})`} value={form.distance} onChangeText={setField('distance')} keyboardType="decimal-pad" />
          </View>
        </View>
        <Field label="Time (m:ss)" value={form.duration} onChangeText={setField('duration')} placeholder="5:20" keyboardType="numbers-and-punctuation" />
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <AppButton label="Save" onPress={onSaveForm} disabled={saving || form.exercise.trim() === ''} />
          </View>
          <AppButton
            variant="secondary"
            label="Clear"
            onPress={() => {
              setForm(EMPTY_FORM);
              setHint(null);
            }}
          />
        </View>
      </Card>

      {result ? (
        <Card title="Saved">
          <AppText style={{ fontWeight: '600' }}>
            {result.setsLogged} × {result.exercise.name}
          </AppText>
          {result.newPersonalBest ? <AppText color={p.success}>New personal best!</AppText> : null}
          {result.createdExercise ? (
            <AppText variant="small">
              {result.exercise.enrichmentStatus === EnrichmentStatus.NeedsReview
                ? 'Added to your library. It could not be verified automatically, so open it in Library to review.'
                : 'Added to your library with instructions and a how-to video link.'}
            </AppText>
          ) : null}
          <AppText variant="small">
            {result.summary.setCount} sets logged
            {result.summary.averages.avgReps !== null
              ? ` · avg ${trimNumber(result.summary.averages.avgReps, 1)} reps`
              : ''}
            {result.summary.best
              ? ` · best ${describePersonalBest(result.summary.best, units)}`
              : ''}
          </AppText>
          <AppButton
            compact
            variant="secondary"
            label="View exercise"
            onPress={() => router.push(Routes.exercise(result.exercise.id))}
          />
        </Card>
      ) : null}

      <Card title="Today">
        {!today || today.length === 0 ? (
          <AppText variant="muted">Nothing logged yet today.</AppText>
        ) : (
          today.map((set) => (
            <Pressable
              key={set.id}
              onPress={() => router.push(Routes.set(set.id))}
              accessibilityRole="button"
              style={{ paddingVertical: space.xs }}
            >
              <AppText style={{ fontWeight: '600' }}>
                {set.exerciseName}
                {set.isPr ? '  ★ PR' : ''}
              </AppText>
              <AppText variant="small">{describeSet(set, units)}</AppText>
            </Pressable>
          ))
        )}
      </Card>
    </Screen>
  );
}
