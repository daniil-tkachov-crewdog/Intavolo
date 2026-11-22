import data from '../../assets/grammar.json';
import * as db from './db';

// Lessons are built and verified by scripts/build-grammar (see REPORT.md there).

export type Block =
  | { type: 'text'; text: string } // Italian words are wrapped in *…*
  | { type: 'tip'; text: string }
  | { type: 'table'; head: string[]; rows: string[][]; it: number[]; source?: string }
  | { type: 'examples'; items: { it: string; en: string }[] };

export type GrammarExercise =
  | { type: 'choice'; it: string; en: string; options: string[]; answer: number; why: string }
  | { type: 'fill'; it: string; en: string; answers: string[]; why: string }
  | { type: 'order'; sentence: string; en: string; why: string };

export interface Lesson {
  id: string;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  title: string;
  summary: string;
  sources: { name: string; url: string }[];
  blocks: Block[];
  exercises: GrammarExercise[];
}

export const LESSONS = data as Lesson[];
export const LESSON_BY_ID = new Map(LESSONS.map((l) => [l.id, l]));
export const GRAMMAR_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;

/** A lesson counts as done at 80% or more. */
export const PASS = 0.8;

/** Best score (0–1) for a lesson on this phone, or null if never finished. */
export function bestScore(id: string): number | null {
  const v = db.getSetting(`grammar:${id}`);
  return v === null ? null : Number(v);
}

export function saveScore(id: string, score: number) {
  const prev = bestScore(id);
  if (prev === null || score > prev) db.setSetting(`grammar:${id}`, String(score));
}

/** Splits "Prendo *il* treno" into plain and Italian (bold) parts. */
export const splitItalian = (text: string) => text.split(/\*([^*]+)\*/).map((part, i) => ({ part, it: i % 2 === 1 }));
