import { describe, expect, it } from 'vitest';
import {
  CONFIG_DEFINITIONS,
  CONFIG_KEYS_IN_ORDER,
  ConfigKey,
  validateConfigValue,
} from '@/config/configDefinitions';

describe('config definitions', () => {
  it('defines every ConfigKey exactly once', () => {
    const enumKeys = Object.values(ConfigKey).sort();
    expect([...CONFIG_KEYS_IN_ORDER].sort()).toEqual(enumKeys);
    expect(new Set(CONFIG_KEYS_IN_ORDER).size).toBe(CONFIG_KEYS_IN_ORDER.length);
  });

  it('ships a default that passes its own validation', () => {
    for (const key of CONFIG_KEYS_IN_ORDER) {
      const def = CONFIG_DEFINITIONS[key];
      expect(validateConfigValue(key, def.defaultValue), key).toBeNull();
    }
  });

  it('rejects bad values with a message', () => {
    expect(validateConfigValue(ConfigKey.TimerRestSeconds, '0')).not.toBeNull();
    expect(validateConfigValue(ConfigKey.TimerRestSeconds, 'abc')).not.toBeNull();
    expect(validateConfigValue(ConfigKey.UnitsWeight, 'stone')).not.toBeNull();
    expect(validateConfigValue(ConfigKey.TimerAutoStart, 'yes')).not.toBeNull();
    expect(validateConfigValue(ConfigKey.PlatesAvailableLb, '[45, -5]')).not.toBeNull();
    expect(validateConfigValue(ConfigKey.WarmupScheme, '[{"pct":2,"reps":5}]')).not.toBeNull();
    expect(validateConfigValue(ConfigKey.LibraryYoutubeUrlTemplate, 'https://x.com')).not.toBeNull();
    expect(validateConfigValue(ConfigKey.AffirmationUrl, 'http://insecure.example')).not.toBeNull();
  });

  it('accepts an empty affirmation URL (use built-in messages)', () => {
    expect(validateConfigValue(ConfigKey.AffirmationUrl, '')).toBeNull();
  });
});
