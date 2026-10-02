/**
 * Text helpers shared by the command parser and the exercise matcher.
 * Pure functions only.
 */

const ONES: Readonly<Record<string, number>> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};

const TENS: Readonly<Record<string, number>> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

const HUNDRED = 'hundred';

/** "one" is not a count in these phrases ("one arm row", "one rep max"). */
const ONE_IS_NOT_A_NUMBER_BEFORE: ReadonlySet<string> = new Set([
  'arm', 'armed', 'leg', 'legged', 'hand', 'handed', 'rep', 'sided',
]);

const isNumberWord = (w: string) => w in ONES || w in TENS || w === HUNDRED;

/**
 * Convert spoken numbers to digits: "sixty jumping jacks" -> "60 jumping jacks",
 * "one hundred twenty five" -> "125". Supports 0-999. Speech-to-text often
 * returns digits already, in which case this is a no-op.
 */
export function replaceNumberWords(text: string): string {
  const tokens = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const word = tokens[i].toLowerCase();
    const next = tokens[i + 1]?.toLowerCase() ?? '';
    const skipOne = word === 'one' && ONE_IS_NOT_A_NUMBER_BEFORE.has(next);
    // "a hundred" is the one place "a" is part of a number.
    const aHundred = word === 'a' && next === HUNDRED;
    if ((isNumberWord(word) && !skipOne) || aHundred) {
      let total = 0;
      let current = 0;
      while (i < tokens.length) {
        const w = tokens[i].toLowerCase();
        const n = tokens[i + 1]?.toLowerCase() ?? '';
        if (w === 'a' && n === HUNDRED) {
          current = 1;
        } else if (w in ONES && !(w === 'one' && ONE_IS_NOT_A_NUMBER_BEFORE.has(n))) {
          current += ONES[w];
        } else if (w in TENS) {
          current += TENS[w];
        } else if (w === HUNDRED) {
          current = (current || 1) * 100;
        } else if (w === 'and' && i + 1 < tokens.length && isNumberWord(n)) {
          // "one hundred and five"
        } else {
          break;
        }
        i += 1;
      }
      total += current;
      out.push(String(total));
    } else {
      out.push(tokens[i]);
      i += 1;
    }
  }
  return out.join(' ');
}

/**
 * Strip a trailing plural "s" ("jacks" -> "jack", "ups" -> "up") but keep
 * "press". Over-trimming ("abs" -> "ab") is harmless because BOTH sides of
 * every comparison go through the same normalizer.
 */
function singularize(word: string): string {
  if (word.length > 2 && word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }
  return word;
}

/** Lowercase, drop punctuation, singularize each word, collapse spaces. */
export function normalizeNameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singularize)
    .join(' ');
}

export function titleCase(text: string): string {
  return text.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}
