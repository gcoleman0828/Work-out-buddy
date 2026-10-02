import { ErrorCode, LogSource } from '@/constants/enums';
import type { ConfigRepository } from '@/db/repositories/ConfigRepository';
import { AppError } from '@/errors/AppError';
import { logger } from '@/services/Logger';
import { CONFIG_DEFINITIONS, type ConfigKey, validateConfigValue } from './configDefinitions';

/**
 * Typed, cached access to configuration.
 *
 * Reads are synchronous (from an in-memory map filled by load()), so domain
 * code and render functions can call config.getNumber(...) without awaiting.
 * Writes go to SQLite first and update the cache only on success, then notify
 * subscribers so open screens can refresh.
 *
 * A bad stored value (hand-edited DB, old version) never crashes the app: it is
 * logged and the built-in default is used instead.
 */
export class ConfigService {
  private overrides = new Map<string, string>();
  private listeners = new Set<() => void>();

  constructor(private readonly repo: ConfigRepository) {}

  async load(): Promise<void> {
    this.overrides = new Map(Object.entries(await this.repo.getAll()));
  }

  getRaw(key: ConfigKey): string {
    return this.overrides.get(key) ?? CONFIG_DEFINITIONS[key].defaultValue;
  }

  isOverridden(key: ConfigKey): boolean {
    return this.overrides.has(key);
  }

  getString<T extends string = string>(key: ConfigKey): T {
    return this.getRaw(key) as T;
  }

  getNumber(key: ConfigKey): number {
    const n = Number(this.getRaw(key));
    if (Number.isFinite(n)) return n;
    logger.warn(LogSource.Config, `Stored value for ${key} is not a number; using default`);
    return Number(CONFIG_DEFINITIONS[key].defaultValue);
  }

  getBoolean(key: ConfigKey): boolean {
    const raw = this.getRaw(key);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    logger.warn(LogSource.Config, `Stored value for ${key} is not true/false; using default`);
    return CONFIG_DEFINITIONS[key].defaultValue === 'true';
  }

  getJson<T>(key: ConfigKey): T {
    try {
      return JSON.parse(this.getRaw(key)) as T;
    } catch (error) {
      logger.warn(LogSource.Config, `Stored value for ${key} is not valid JSON; using default`, error);
      return JSON.parse(CONFIG_DEFINITIONS[key].defaultValue) as T;
    }
  }

  /** Validate, persist, then publish. Throws AppError(Validation) with a friendly message. */
  async set(key: ConfigKey, raw: string): Promise<void> {
    const problem = validateConfigValue(key, raw);
    if (problem) throw new AppError(ErrorCode.Validation, `${CONFIG_DEFINITIONS[key].label}: ${problem}`);
    await this.repo.set(key, raw, Date.now());
    this.overrides.set(key, raw);
    this.emit();
  }

  /** Drop the override so the built-in default applies again. */
  async reset(key: ConfigKey): Promise<void> {
    await this.repo.remove(key);
    this.overrides.delete(key);
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
