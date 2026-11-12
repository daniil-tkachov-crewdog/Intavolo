import data from '../../assets/vocab.json';

export interface Word {
  id: number;
  it: string;
  en: string; // main translation
  alt: string[]; // side translations (often empty)
  ipa: string;
  pos: string;
  topic: string;
  level?: Level; // CEFR level, missing for a few junk words
  examples: { it: string; en: string }[];
}

export const LEVEL_NAMES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type Level = (typeof LEVEL_NAMES)[number];
export const isLevel = (s: string | undefined): s is Level => LEVEL_NAMES.includes(s as Level);

export const WORDS = data as Word[];
export const WORD_BY_ID = new Map(WORDS.map((w) => [w.id, w]));

/** All accepted English answers for a word. */
export const englishOf = (w: Word) => [w.en, ...w.alt];

/** Topics with word counts, alphabetical ("Other" last). */
export const TOPICS = (() => {
  const counts = new Map<string, number>();
  for (const w of WORDS) counts.set(w.topic, (counts.get(w.topic) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => (a.name === 'Other' ? 1 : b.name === 'Other' ? -1 : a.name.localeCompare(b.name)));
})();

/** CEFR levels A1–C2 with word counts. */
export const LEVELS = LEVEL_NAMES.map((name) => ({ name, count: WORDS.filter((w) => w.level === name).length }));

/** Random order for the Explore feed, fixed for one app session. */
export const SHUFFLE_KEY = new Map(WORDS.map((w) => [w.id, Math.random()]));
