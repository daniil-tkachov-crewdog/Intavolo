// Matching a typed English translation against Tatoeba's translations, without AI:
// every known translation is accepted (option 1) after normalising both sides (option 2).
// Anything that still doesn't match goes to the learner's own judgement (option 3, in the UI).
// Pure functions (unit-tested with node:test).

const CONTRACTIONS: Record<string, string[]> = {
  "i'm": ['i am'],
  "you're": ['you are'],
  "we're": ['we are'],
  "they're": ['they are'],
  "he's": ['he is', 'he has'],
  "she's": ['she is', 'she has'],
  "it's": ['it is', 'it has'],
  "that's": ['that is', 'that has'],
  "what's": ['what is', 'what has'],
  "who's": ['who is', 'who has'],
  "where's": ['where is'],
  "there's": ['there is', 'there has'],
  "here's": ['here is'],
  "how's": ['how is'],
  "everything's": ['everything is', 'everything has'],
  "let's": ['let us'],
  "i've": ['i have'],
  "you've": ['you have'],
  "we've": ['we have'],
  "they've": ['they have'],
  "i'd": ['i would', 'i had'],
  "you'd": ['you would', 'you had'],
  "he'd": ['he would', 'he had'],
  "she'd": ['she would', 'she had'],
  "we'd": ['we would', 'we had'],
  "they'd": ['they would', 'they had'],
  "it'd": ['it would', 'it had'],
  "i'll": ['i will'],
  "you'll": ['you will'],
  "he'll": ['he will'],
  "she'll": ['she will'],
  "we'll": ['we will'],
  "they'll": ['they will'],
  "it'll": ['it will'],
  "that'll": ['that will'],
  "everything'll": ['everything will'],
  "won't": ['will not'],
  "can't": ['can not'],
  cannot: ['can not'],
  "shan't": ['shall not'],
  gonna: ['going to'],
  wanna: ['want to'],
};

/** British → American spelling and a few same-meaning words, all mapped to one form. */
const SAME: Record<string, string> = {
  colour: 'color', colours: 'colors', favourite: 'favorite', favourites: 'favorites', flavour: 'flavor',
  honour: 'honor', neighbour: 'neighbor', neighbours: 'neighbors', behaviour: 'behavior', labour: 'labor',
  harbour: 'harbor', humour: 'humor', rumour: 'rumor', centre: 'center', theatre: 'theater', metre: 'meter',
  metres: 'meters', litre: 'liter', litres: 'liters', grey: 'gray', programme: 'program', jewellery: 'jewelry',
  pyjamas: 'pajamas', tyre: 'tire', tyres: 'tires', aeroplane: 'airplane', defence: 'defense', licence: 'license',
  catalogue: 'catalog', dialogue: 'dialog', maths: 'math', mum: 'mom', mummy: 'mommy', whilst: 'while',
  towards: 'toward', afterwards: 'afterward', okay: 'ok', alright: 'all right',
  realise: 'realize', realised: 'realized', realising: 'realizing', recognise: 'recognize', recognised: 'recognized',
  organise: 'organize', organised: 'organized', apologise: 'apologize', apologised: 'apologized',
  criticise: 'criticize', analyse: 'analyze', practise: 'practice', practised: 'practiced',
  travelled: 'traveled', travelling: 'traveling', traveller: 'traveler', cancelled: 'canceled', cancelling: 'canceling',
  movie: 'film', movies: 'films', apartment: 'flat', apartments: 'flats', vacation: 'holiday', vacations: 'holidays',
  truck: 'lorry', trucks: 'lorries', soccer: 'football', cookie: 'biscuit', cookies: 'biscuits',
};

const NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

const MAX_VARIANTS = 64;

/** Lower case, unify quotes, drop punctuation (keeping apostrophes inside words). */
export function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[^a-z0-9à-ÿ' -]/g, ' ')
    .replace(/(^|\s)'+|'+(\s|$)/g, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** All normalised readings of a sentence ("he's" → "he is" and "he has"). */
export function variants(s: string): Set<string> {
  let out: string[][] = [[]];
  for (const t0 of tokens(s)) {
    const t = /^\d+$/.test(t0) && Number(t0) <= 20 ? NUMBERS[Number(t0)] : t0;
    let opts = CONTRACTIONS[t] ?? (t.endsWith("n't") ? [t.slice(0, -3) + ' not'] : [t]);
    opts = opts.map((o) => o.split(' ').map((w) => SAME[w] ?? w).join(' '));
    const next: string[][] = [];
    for (const prefix of out) for (const o of opts) if (next.length < MAX_VARIANTS) next.push([...prefix, o]);
    out = next;
  }
  // "do not" ↔ "don't" is now "do not"; "can not" and "cannot" are both "can not".
  return new Set(out.map((p) => p.join(' ').replace(/\bwo not\b/g, 'will not').replace(/\bca not\b/g, 'can not')));
}

/** True if the answer matches any of the translations after normalising. */
export function matchesTranslation(answer: string, translations: string[]): boolean {
  const mine = variants(answer);
  if (!mine.size || [...mine].every((v) => !v)) return false;
  return translations.some((t) => [...variants(t)].some((v) => mine.has(v)));
}

/** Word tiles for building a translation (punctuation removed, original case kept). */
export const tiles = (s: string) =>
  s
    .replace(/[’‘`´]/g, "'")
    .split(/\s+/)
    .map((w) => w.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, ''))
    .filter(Boolean);

/** Tile answer: same words in the same order as any translation with exactly these tiles. */
export function matchesTiles(built: string[], translations: string[]): boolean {
  const key = (ws: string[]) => ws.map((w) => w.toLowerCase()).join(' ');
  const sorted = (ws: string[]) => key([...ws].sort());
  const mine = key(built);
  return translations.some((t) => {
    const tt = tiles(t);
    return sorted(tt) === sorted(built) && key(tt) === mine;
  });
}
