// Answer checking. Pure functions (unit-tested with node:test).

export type Check = 'correct' | 'close' | 'wrong';

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[.,!?¿¡;:"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

// "to speak" also accepts "speak"; "the house" also accepts "house".
const variants = (s: string) => {
  const n = normalize(s);
  const bare = n.replace(/^(to|the|a|an) /, '');
  return bare === n ? [n] : [n, bare];
};

/** Strict version for grammar: no dropping of "a", "the"… (in Italian "a" is a real word). */
export function checkExact(input: string, accepted: string[]): Check {
  const typed = normalize(input);
  const answers = accepted.map(normalize);
  if (answers.includes(typed)) return 'correct';
  if (answers.map(stripAccents).includes(stripAccents(typed))) return 'close';
  return 'wrong';
}

/** correct = exact match (case/spacing/punctuation ignored); close = only accents differ. */
export function checkAnswer(input: string, accepted: string[]): Check {
  const typed = variants(input);
  const answers = accepted.flatMap(variants);
  if (typed.some((t) => answers.includes(t))) return 'correct';
  const plain = answers.map(stripAccents);
  if (typed.some((t) => plain.includes(stripAccents(t)))) return 'close';
  return 'wrong';
}
