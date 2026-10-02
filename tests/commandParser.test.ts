import { describe, expect, it } from 'vitest';
import { DistanceUnit, ParsedField, WeightUnit } from '@/constants/enums';
import { parseWorkoutCommand } from '@/domain/commandParser';

const opts = { defaultWeightUnit: WeightUnit.Lb };
const parse = (s: string) => parseWorkoutCommand(s, opts);

describe('parseWorkoutCommand', () => {
  it('parses the headline example: reps + minutes + seconds', () => {
    const r = parse('Add a record for 60 jumping jacks in 5min 20 seconds');
    expect(r.exerciseName).toBe('jumping jacks');
    expect(r.reps).toBe(60);
    expect(r.durationSec).toBe(320);
    expect(r.weight).toBeNull();
    expect(r.confidence).toBe(1);
    expect(r.missing).toEqual([]);
  });

  it('parses "N sets of M" with an explicit unit', () => {
    const r = parse('3 sets of 10 bench press at 135 lbs');
    expect(r).toMatchObject({ exerciseName: 'bench press', sets: 3, reps: 10 });
    expect(r.weight).toEqual({ value: 135, unit: WeightUnit.Lb, assumedUnit: false });
    expect(r.confidence).toBe(1);
  });

  it('parses NxM notation with kg', () => {
    const r = parse('squat 5x5 at 100 kg');
    expect(r).toMatchObject({ exerciseName: 'squat', sets: 5, reps: 5 });
    expect(r.weight).toEqual({ value: 100, unit: WeightUnit.Kg, assumedUnit: false });
  });

  it('assumes the default unit when none is spoken, and lowers confidence', () => {
    const r = parse('10 reps deadlift at 225');
    expect(r.weight).toEqual({ value: 225, unit: WeightUnit.Lb, assumedUnit: true });
    expect(r.confidence).toBe(0.9);
  });

  it('understands a clock-style duration', () => {
    const r = parse('plank for 2:30');
    expect(r.exerciseName).toBe('plank');
    expect(r.durationSec).toBe(150);
  });

  it('parses distance and duration together', () => {
    const r = parse('running 5 km in 25 minutes');
    expect(r.exerciseName).toBe('running');
    expect(r.distance).toEqual({ value: 5, unit: DistanceUnit.Km });
    expect(r.durationSec).toBe(1500);
  });

  it('converts spoken number words', () => {
    const r = parse('log sixty jumping jacks in five minutes twenty seconds');
    expect(r.reps).toBe(60);
    expect(r.durationSec).toBe(320);
    expect(r.exerciseName).toBe('jumping jacks');
  });

  it('handles filler phrases like "I did"', () => {
    const r = parse('I did 20 push ups');
    expect(r.exerciseName).toBe('push ups');
    expect(r.reps).toBe(20);
  });

  it('does not treat "one" as a count in "one arm row"', () => {
    const r = parse('10 reps one arm dumbbell row at 40 lb');
    expect(r.exerciseName).toBe('one arm dumbbell row');
    expect(r.reps).toBe(10);
  });

  it('reports a weight without reps as incomplete', () => {
    const r = parse('bench press at 135 lb');
    expect(r.missing).toEqual([ParsedField.Reps]);
    expect(r.confidence).toBeLessThan(0.85);
  });

  it('reports a missing exercise', () => {
    const r = parse('20 reps');
    expect(r.exerciseName).toBeNull();
    expect(r.missing).toContain(ParsedField.Exercise);
  });

  it('reports a missing metric', () => {
    const r = parse('bench press');
    expect(r.missing).toEqual([ParsedField.Metric]);
    expect(r.confidence).toBe(0.6);
  });

  it('returns a safe empty result for gibberish', () => {
    const r = parse('   ');
    expect(r.exerciseName).toBeNull();
    expect(r.confidence).toBeLessThan(0.5);
  });
});
