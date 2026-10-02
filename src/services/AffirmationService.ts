import { ConfigKey } from '@/config/configDefinitions';
import type { ConfigService } from '@/config/ConfigService';
import { AffirmationSource, LogSource } from '@/constants/enums';
import { BUILTIN_AFFIRMATIONS } from '@/data/affirmations';
import { toDayKey } from '@/domain/dates';
import { logger } from './Logger';

export interface Affirmation {
  text: string;
  source: AffirmationSource;
}

/** JSON field names tried, in order, when the source returns an object. */
const TEXT_FIELDS = ['text', 'affirmation', 'quote', 'message', 'content'] as const;

function dayOfYear(ms: number): number {
  const d = new Date(ms);
  const start = new Date(d.getFullYear(), 0, 0).getTime();
  return Math.floor((ms - start) / (24 * 60 * 60 * 1000));
}

function extractText(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  try {
    const json: unknown = JSON.parse(trimmed);
    const candidate = Array.isArray(json) ? json[0] : json;
    if (typeof candidate === 'string') return candidate.trim() || null;
    if (candidate && typeof candidate === 'object') {
      for (const field of TEXT_FIELDS) {
        const value = (candidate as Record<string, unknown>)[field];
        if (typeof value === 'string' && value.trim()) return value.trim();
      }
    }
    return null;
  } catch {
    return trimmed; // not JSON: treat as plain text
  }
}

/**
 * Supplies the dashboard's daily affirmation (Virtual Coach v1).
 * With no URL configured, or if the source fails or times out, it falls back
 * to a built-in message chosen by day of year, so the card never errors out and
 * works offline. The result is cached for the day.
 */
export class AffirmationService {
  private cache: { dayKey: string; value: Affirmation } | null = null;

  constructor(private readonly config: ConfigService) {}

  async today(now: number = Date.now()): Promise<Affirmation> {
    const dayKey = toDayKey(now);
    if (this.cache && this.cache.dayKey === dayKey) return this.cache.value;

    const url = this.config.getString(ConfigKey.AffirmationUrl);
    let value: Affirmation | null = null;
    if (url) {
      value = await this.fetchRemote(url);
    }
    const resolved = value ?? this.builtin(now);
    this.cache = { dayKey, value: resolved };
    return resolved;
  }

  private builtin(now: number): Affirmation {
    const index = dayOfYear(now) % BUILTIN_AFFIRMATIONS.length;
    return { text: BUILTIN_AFFIRMATIONS[index], source: AffirmationSource.Builtin };
  }

  private async fetchRemote(url: string): Promise<Affirmation | null> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.config.getNumber(ConfigKey.AffirmationTimeoutMs),
    );
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json, text/plain;q=0.9' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = extractText(await response.text());
      if (!text) throw new Error('Response contained no usable text');
      const max = this.config.getNumber(ConfigKey.AffirmationMaxChars);
      return {
        text: text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text,
        source: AffirmationSource.Remote,
      };
    } catch (error) {
      logger.warn(LogSource.Network, 'Affirmation source failed; using built-in message', error);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
