import { ConfigKey } from '@/config/configDefinitions';
import type { ConfigService } from '@/config/ConfigService';
import {
  EnrichmentStatus,
  Equipment,
  ErrorCode,
  ExerciseSource,
  LogSource,
  MuscleGroup,
} from '@/constants/enums';
import type { ExerciseRepository, NewExercise } from '@/db/repositories/ExerciseRepository';
import { EXERCISE_SEED } from '@/data/exerciseSeed';
import { AppError } from '@/errors/AppError';
import { nameSimilarity } from '@/domain/exerciseMatcher';
import type { Exercise } from '@/domain/models';
import { normalizeNameKey, titleCase } from '@/domain/text';
import type { ExerciseVerifier } from './ExerciseVerifier';
import { logger } from './Logger';

/** Fields a person can edit on the exercise detail page. */
export interface ExerciseInput {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  instructions: string | null;
  videoUrl: string | null;
  imageUri: string | null;
}

export interface ResolvedExercise {
  exercise: Exercise;
  /** True when a new library entry was created for this name. */
  created: boolean;
}

/**
 * Owns the exercise library: seeding, lookup, suggestions, the "new name"
 * pipeline (match -> verify -> auto-fill or flag) and manual add/edit/delete.
 */
export class ExerciseLibraryService {
  constructor(
    private readonly repo: ExerciseRepository,
    private readonly config: ConfigService,
    private readonly verifier: ExerciseVerifier,
  ) {}

  /** Idempotent: inserts any built-in exercise that is not already present. */
  async ensureSeeded(): Promise<void> {
    const now = Date.now();
    let added = 0;
    for (const seed of EXERCISE_SEED) {
      const inserted = await this.repo.insertIfAbsent(
        {
          name: seed.name,
          nameKey: normalizeNameKey(seed.name),
          muscleGroup: seed.muscleGroup,
          equipment: seed.equipment,
          instructions: seed.instructions,
          imageUri: null,
          videoUrl: this.videoUrlFor(seed.name),
          source: ExerciseSource.Seed,
          enrichmentStatus: EnrichmentStatus.Complete,
          enrichmentConfidence: 1,
        },
        now,
      );
      if (inserted) added += 1;
    }
    if (added > 0) logger.info(LogSource.Library, `Seeded ${added} built-in exercises`);
  }

  listAll(): Promise<Exercise[]> {
    return this.repo.listAll();
  }

  getById(id: number): Promise<Exercise | null> {
    return this.repo.getById(id);
  }

  /** How-to video link: a YouTube search for the exercise (template is config). */
  videoUrlFor(name: string): string {
    const template = this.config.getString(ConfigKey.LibraryYoutubeUrlTemplate);
    const suffix = this.config.getString(ConfigKey.LibraryYoutubeQuerySuffix);
    return template.replace('{query}', encodeURIComponent(`${name} ${suffix}`.trim()));
  }

  /** Dropdown-style suggestions while typing: substring hits and fuzzy matches, best first. */
  async suggest(query: string): Promise<Exercise[]> {
    const key = normalizeNameKey(query);
    if (!key) return [];
    const minScore = this.config.getNumber(ConfigKey.ExerciseMatchMinScore);
    const limit = this.config.getNumber(ConfigKey.LibrarySuggestionLimit);
    const all = await this.repo.listAll();
    return all
      .map((exercise) => {
        const similarity = nameSimilarity(query, exercise.name);
        const contains = exercise.nameKey.includes(key);
        return { exercise, score: contains ? Math.max(similarity, minScore) : similarity };
      })
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => r.exercise);
  }

  /**
   * Turn a typed/spoken exercise name into a library entry:
   *   1. exact normalized match            -> reuse
   *   2. close fuzzy match (>= match score) -> reuse
   *   3. otherwise verify the name; if it matches a known exercise at >= the
   *      verification confidence, create it pre-filled and mark it Complete;
   *      else create a bare entry flagged NeedsReview (with a video link) so
   *      the user's log is never blocked by the library.
   */
  async resolveOrCreate(rawName: string): Promise<ResolvedExercise> {
    const name = rawName.trim();
    const key = normalizeNameKey(name);
    if (!key) throw new AppError(ErrorCode.Validation, 'Enter an exercise name first.');

    const exact = await this.repo.getByKey(key);
    if (exact) return { exercise: exact, created: false };

    const matchMin = this.config.getNumber(ConfigKey.ExerciseMatchMinScore);
    const all = await this.repo.listAll();
    let best: { exercise: Exercise; score: number } | null = null;
    for (const exercise of all) {
      const score = nameSimilarity(name, exercise.name);
      if (!best || score > best.score) best = { exercise, score };
    }
    if (best && best.score >= matchMin) return { exercise: best.exercise, created: false };

    const verification = await this.verifier.verify(name);
    const verifyMin = this.config.getNumber(ConfigKey.ExerciseEnrichMinConfidence);
    const verified = verification.canonical !== null && verification.confidence >= verifyMin;

    const canonical = verification.canonical;
    const finalName = verified && canonical ? canonical.name : titleCase(name.toLowerCase());
    const finalKey = normalizeNameKey(finalName);
    const already = await this.repo.getByKey(finalKey);
    if (already) return { exercise: already, created: false };

    const input: NewExercise = {
      name: finalName,
      nameKey: finalKey,
      muscleGroup: verified && canonical ? canonical.muscleGroup : MuscleGroup.Other,
      equipment: verified && canonical ? canonical.equipment : Equipment.Other,
      instructions: verified && canonical ? canonical.instructions : null,
      imageUri: null,
      videoUrl: this.videoUrlFor(finalName),
      source: ExerciseSource.Auto,
      enrichmentStatus: verified ? EnrichmentStatus.Complete : EnrichmentStatus.NeedsReview,
      enrichmentConfidence: verification.confidence,
    };
    const id = await this.repo.insert(input, Date.now());
    logger.info(
      LogSource.Library,
      `Created exercise "${finalName}" (${verified ? 'verified' : 'needs review'}, confidence ${verification.confidence.toFixed(2)})`,
    );
    const exercise = await this.repo.getById(id);
    if (!exercise) throw new Error(`Exercise ${id} missing right after insert`);
    return { exercise, created: true };
  }

  /**
   * Create (id null) or update an exercise from the detail page. Saving counts
   * as the user reviewing it, so the entry becomes Complete.
   */
  async save(id: number | null, input: ExerciseInput): Promise<number> {
    const name = input.name.trim();
    const nameKey = normalizeNameKey(name);
    if (!nameKey) throw new AppError(ErrorCode.Validation, 'Give the exercise a name.');

    const clash = await this.repo.getByKey(nameKey);
    if (clash && clash.id !== id) {
      throw new AppError(ErrorCode.Validation, `"${clash.name}" is already in your library.`);
    }

    const fields = {
      name,
      nameKey,
      muscleGroup: input.muscleGroup,
      equipment: input.equipment,
      instructions: input.instructions?.trim() || null,
      imageUri: input.imageUri,
      videoUrl: input.videoUrl?.trim() || this.videoUrlFor(name),
      enrichmentStatus: EnrichmentStatus.Complete,
    };

    if (id === null) {
      return this.repo.insert(
        { ...fields, source: ExerciseSource.Manual, enrichmentConfidence: null },
        Date.now(),
      );
    }
    await this.repo.update(id, fields, Date.now());
    return id;
  }

  async delete(id: number): Promise<void> {
    const used = await this.repo.countSets(id);
    if (used > 0) {
      throw new AppError(
        ErrorCode.InUse,
        `This exercise has ${used} logged ${used === 1 ? 'set' : 'sets'}, so it cannot be deleted. Delete those sets first.`,
      );
    }
    await this.repo.delete(id);
  }
}
