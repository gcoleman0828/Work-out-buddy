import { EXERCISE_SEED, type SeedExercise } from '@/data/exerciseSeed';
import { findBestMatch } from '@/domain/exerciseMatcher';

/**
 * "Is this a real exercise, and which one?" - the verification step that runs
 * when a new exercise name is added to the library.
 *
 * This is an interface on purpose. Today's implementation (SeedExerciseVerifier)
 * compares the name against the built-in list, so `confidence` is NAME
 * SIMILARITY, not AI certainty. A later phase adds an AI-backed verifier that
 * implements the same interface; ExerciseLibraryService does not change.
 */
export interface VerificationResult {
  /** 0..1 */
  confidence: number;
  /** The known exercise it matched, if any. */
  canonical: SeedExercise | null;
}

export interface ExerciseVerifier {
  verify(name: string): Promise<VerificationResult>;
}

export class SeedExerciseVerifier implements ExerciseVerifier {
  async verify(name: string): Promise<VerificationResult> {
    const best = findBestMatch(name, EXERCISE_SEED);
    return { confidence: best?.score ?? 0, canonical: best?.candidate ?? null };
  }
}
