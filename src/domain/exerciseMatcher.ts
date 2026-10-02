import { normalizeNameKey } from './text';

/**
 * Fuzzy exercise-name matching. Used twice:
 *  1. When logging: does "jumping jack" mean the existing "Jumping Jacks"?
 *  2. When verifying a brand-new name against the known-exercise list.
 *
 * Score is 0..1. Algorithm constants below are properties of the algorithm
 * (how much to trust word overlap vs. letter overlap); the decision thresholds
 * ("snap to existing at >= 0.8", "verified at >= 0.9") are user config.
 */
const TOKEN_WEIGHT = 0.5;
const BIGRAM_WEIGHT = 0.5;
/** A multi-word name fully contained in a longer one ("bench press" in "barbell bench press"). */
const CONTAINMENT_SCORE = 0.85;
const MIN_WORDS_FOR_CONTAINMENT = 2;

export interface Matchable {
  name: string;
  aliases?: readonly string[];
}

export interface MatchResult<T extends Matchable> {
  candidate: T;
  score: number;
}

function bigrams(s: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i += 1) {
    const g = s.slice(i, i + 2);
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  return counts;
}

function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const ga = bigrams(a);
  const gb = bigrams(b);
  let overlap = 0;
  for (const [g, n] of ga) overlap += Math.min(n, gb.get(g) ?? 0);
  return (2 * overlap) / (a.length - 1 + (b.length - 1));
}

function tokenJaccard(a: string[], b: string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter += 1;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function isSubset(small: string[], big: string[]): boolean {
  const set = new Set(big);
  return small.every((t) => set.has(t));
}

/** Similarity of two exercise names, 0..1. */
export function nameSimilarity(a: string, b: string): number {
  const ka = normalizeNameKey(a);
  const kb = normalizeNameKey(b);
  if (!ka || !kb) return 0;
  if (ka === kb) return 1;
  // "pushup" vs "push up"
  if (ka.replace(/ /g, '') === kb.replace(/ /g, '')) return 1;

  const ta = ka.split(' ');
  const tb = kb.split(' ');
  let score = TOKEN_WEIGHT * tokenJaccard(ta, tb) + BIGRAM_WEIGHT * diceCoefficient(ka, kb);

  const [small, big] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (small.length >= MIN_WORDS_FOR_CONTAINMENT && small.length < big.length && isSubset(small, big)) {
    score = Math.max(score, CONTAINMENT_SCORE);
  }
  return Math.min(1, score);
}

function bestScoreFor(query: string, c: Matchable): number {
  let best = nameSimilarity(query, c.name);
  for (const alias of c.aliases ?? []) best = Math.max(best, nameSimilarity(query, alias));
  return best;
}

/** Best candidate for `query`, or null when there are no candidates. */
export function findBestMatch<T extends Matchable>(
  query: string,
  candidates: readonly T[],
): MatchResult<T> | null {
  let best: MatchResult<T> | null = null;
  for (const candidate of candidates) {
    const score = bestScoreFor(query, candidate);
    if (!best || score > best.score) best = { candidate, score };
  }
  return best;
}

/** Top `limit` candidates above `minScore`, best first (for suggestion lists). */
export function rankMatches<T extends Matchable>(
  query: string,
  candidates: readonly T[],
  limit: number,
  minScore: number,
): MatchResult<T>[] {
  return candidates
    .map((candidate) => ({ candidate, score: bestScoreFor(query, candidate) }))
    .filter((r) => r.score >= minScore)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}
