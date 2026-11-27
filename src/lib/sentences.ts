import data from '../../assets/sentences.json';
import { LEVEL_NAMES, type Level } from './vocab';

// Built by scripts/build-sentences from Tatoeba (native speakers only, CC BY 2.0 FR).

export interface Sentence {
  id: number;
  it: string;
  en: string[]; // every English translation on Tatoeba
  words: number[]; // vocabulary word ids used in the sentence
  level: Level;
}

export const SENTENCES = data as Sentence[];
export const SESSION = 10;

export type Source = 'mine' | Level;

/** Sentences using at least one word the learner has added, best coverage first. */
export const fromMyWords = (known: { has: (id: number) => boolean }) =>
  SENTENCES.map((s) => ({ s, hit: s.words.filter((w) => known.has(w)).length }))
    .filter((x) => x.hit > 0)
    .map((x) => ({ s: x.s, share: x.hit / x.s.words.length }))
    .sort((a, b) => b.share - a.share)
    .map((x) => x.s);

export const atLevel = (level: Level) => SENTENCES.filter((s) => s.level === level);

export const LEVEL_COUNTS = LEVEL_NAMES.map((name) => ({ name, count: SENTENCES.filter((s) => s.level === name).length }));

const shuffle = <T,>(a: T[]) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

export const pickSession = (pool: Sentence[]) => shuffle(pool).slice(0, SESSION);

/** Random round from the best-covered part of a ranked pool, so rounds vary but stay familiar. */
export const pickRanked = (pool: Sentence[]) => pickSession(pool.slice(0, Math.max(SESSION * 10, Math.ceil(pool.length / 4))));
