// Small helpers for writing grammar lessons compactly.
// Convention: inside English prose, every Italian word is wrapped in *asterisks*
// so the verifier can find it (the app renders it in bold).

/** Lesson. */
export const lesson = (id, level, title, summary, sources, blocks, exercises) => ({ id, level, title, summary, sources, blocks, exercises });

/** Paragraph of English prose (Italian in *…*). */
export const p = (text) => ({ type: 'text', text });

/** Tip / warning box. */
export const tip = (text) => ({ type: 'tip', text });

/**
 * Table. `it` = indexes of columns that hold Italian (verified word by word).
 * Rows are arrays of strings.
 */
export const table = (head, rows, it) => ({ type: 'table', head, rows, it });

/** Conjugation table filled in at build time from Wiktionary. tenses: keys of TENSES in build.mjs. */
export const conj = (verbs, tense) => ({ type: 'conj', verbs, tense });

/** Example sentences: pairs "Italiano = English". */
export const ex = (...pairs) => ({
  type: 'examples',
  items: pairs.map((s) => {
    const [it, en] = s.split(' = ');
    return { it: it.trim(), en: en.trim() };
  }),
});

// ---- Exercises ----
// Common optional `v`: [infinitive, tense, person 0-5] → answer is checked against Wiktionary's table.

/**
 * Multiple choice. `it` = Italian sentence with ___ (or ''), `en` = English instruction or translation.
 * Options: mark the correct one with a leading "*".
 */
export const choice = (it, en, options, why, v) => {
  const answer = options.findIndex((o) => o.startsWith('*'));
  if (answer < 0) throw new Error(`No correct option: ${it} ${options}`);
  return { type: 'choice', it, en, options: options.map((o) => o.replace(/^\*/, '')), answer, why, ...(v && { v }) };
};

/** Type the missing word(s). `answers` = all accepted answers (first is shown). */
export const fill = (it, en, answers, why, v) => ({ type: 'fill', it, en, answers: [].concat(answers), why, ...(v && { v }) });

/** Put the words in order. `sentence` is the correct Italian sentence; words are shuffled in the app. */
export const order = (sentence, en, why) => ({ type: 'order', sentence, en, why });
