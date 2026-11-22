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

/** Sentences made only of words the learner has added (any status). */
export const fromMyWords = (known: { has: (id: number) => boolean }) => SENTENCES.filter((s) => s.words.every((w) => known.has(w)));

export const atLevel = (level: Level) => SENTENCES.filter((s) => s.level === level);

export const LEVEL_COUNTS = LEVEL_NAMES.map((name) => ({ name, count: SENTENCES.filter((s) => s.level === name).length }));

export const pickSession = (pool: Sentence[]) => [...pool].sort(() => Math.random() - 0.5).slice(0, SESSION);
