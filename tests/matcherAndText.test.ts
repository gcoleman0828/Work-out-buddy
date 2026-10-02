import { describe, expect, it } from 'vitest';
import { findBestMatch, nameSimilarity, rankMatches } from '@/domain/exerciseMatcher';
import { normalizeNameKey, replaceNumberWords } from '@/domain/text';
import { formatDuration, fromKg, parseDurationInput, toKg } from '@/domain/units';
import { WeightUnit } from '@/constants/enums';

describe('replaceNumberWords', () => {
  it.each([
    ['sixty jumping jacks', '60 jumping jacks'],
    ['twenty five reps', '25 reps'],
    ['one hundred twenty pounds', '120 pounds'],
    ['a hundred and five', '105'],
    ['one arm row', 'one arm row'],
    ['5 reps', '5 reps'],
  ])('%s -> %s', (input, expected) => {
    expect(replaceNumberWords(input)).toBe(expected);
  });
});

describe('normalizeNameKey', () => {
  it('lowercases, strips punctuation and plurals', () => {
    expect(normalizeNameKey('Push-Ups')).toBe('push up');
    expect(normalizeNameKey('Jumping Jacks')).toBe('jumping jack');
    expect(normalizeNameKey('Bench Press')).toBe('bench press');
  });
});

describe('nameSimilarity', () => {
  it('is 1 for plural, hyphen and spacing variants', () => {
    expect(nameSimilarity('jumping jack', 'Jumping Jacks')).toBe(1);
    expect(nameSimilarity('push-up', 'push up')).toBe(1);
    expect(nameSimilarity('pushup', 'push up')).toBe(1);
  });
  it('scores a contained multi-word name at the containment level', () => {
    expect(nameSimilarity('bench press', 'barbell bench press')).toBeGreaterThanOrEqual(0.85);
  });
  it('scores unrelated names low', () => {
    expect(nameSimilarity('squat', 'bench press')).toBeLessThan(0.5);
    expect(nameSimilarity('press', 'bench press')).toBeLessThan(0.8);
  });
  it('is 0 for empty input', () => {
    expect(nameSimilarity('', 'squat')).toBe(0);
  });
});

describe('findBestMatch / rankMatches', () => {
  const lib = [
    { name: 'Push-Up', aliases: ['press up'] },
    { name: 'Squat' },
    { name: 'Bench Press' },
  ];
  it('finds the best candidate, including via alias', () => {
    expect(findBestMatch('press-ups', lib)?.candidate.name).toBe('Push-Up');
    expect(findBestMatch('squats', lib)?.score).toBe(1);
    expect(findBestMatch('x', [])).toBeNull();
  });
  it('ranks above a threshold, best first, limited', () => {
    const r = rankMatches('bench', lib, 2, 0.1);
    expect(r.length).toBeLessThanOrEqual(2);
    expect(r[0].candidate.name).toBe('Bench Press');
  });
});

describe('units', () => {
  it('round-trips kg and lb', () => {
    expect(fromKg(toKg(135, WeightUnit.Lb), WeightUnit.Lb)).toBeCloseTo(135, 6);
    expect(toKg(100, WeightUnit.Kg)).toBe(100);
  });
  it('formats and parses durations', () => {
    expect(formatDuration(320)).toBe('5:20');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(parseDurationInput('5:20')).toBe(320);
    expect(parseDurationInput('90')).toBe(90);
    expect(parseDurationInput('abc')).toBeNull();
    expect(parseDurationInput('')).toBeNull();
  });
});
