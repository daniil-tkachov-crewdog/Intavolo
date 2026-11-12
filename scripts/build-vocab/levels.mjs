#!/usr/bin/env node
// Adds a CEFR level (A1–C2) to every word in assets/vocab.json. One level per word.
//   1) Kelly list (CEFR-tagged Italian lemmas), lowest level if listed more than once.
//   2) Words Kelly doesn't cover: frequency band from FrequencyWords it_50k.txt
//      (verbs also count common forms, e.g. "parlo" for parlare).
//   Words missing from both lists are rare: C2. Only known junk gets no level.
//
// Kelly source: https://ssharoff.github.io/kelly/it_m3.xls, exported as TSV (lemma \t pos \t level).
//   node scripts/build-vocab/levels.mjs --kelly <kelly-it.tsv> --freq <it_50k.txt> [--vocab assets/vocab.json]
import fs from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);
if (!args.kelly || !args.freq) {
  console.error('Usage: node levels.mjs --kelly <kelly-it.tsv> --freq <it_50k.txt> [--vocab assets/vocab.json]');
  process.exit(1);
}
const VOCAB = args.vocab || 'assets/vocab.json';
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const NO_LEVEL = new Set(['aa', 'abba']);
// Frequency bands (cumulative rank over our own words) for words Kelly doesn't cover.
const BANDS = [['A1', 600], ['A2', 1500], ['B1', 3000], ['B2', 5500], ['C1', 9000], ['C2', Infinity]];

const kelly = new Map(); // lemma -> level
for (const line of fs.readFileSync(args.kelly, 'utf8').split('\n')) {
  const [lemma, , level] = line.split('\t');
  if (!lemma || !LEVELS.includes(level?.trim())) continue;
  for (const v of lemma.toLowerCase().split(',').map((s) => s.trim()).filter(Boolean)) {
    const prev = kelly.get(v);
    if (!prev || LEVELS.indexOf(level.trim()) < LEVELS.indexOf(prev)) kelly.set(v, level.trim());
  }
}

const freqRank = new Map();
fs.readFileSync(args.freq, 'utf8').split('\n').forEach((line, i) => {
  const w = line.split(/\s+/)[0]?.toLowerCase();
  if (w && !freqRank.has(w)) freqRank.set(w, i);
});

/** Best (lowest) frequency rank of a word, verbs including common inflected forms. */
function rankOf(w) {
  const forms = [w.it];
  const m = w.pos === 'verb' && w.it.match(/^(.+)(are|ere|ire)(si)?$/);
  if (m) {
    const [, stem, end] = m;
    forms.push(stem + 'o', stem + 'i', stem + { are: 'ato', ere: 'uto', ire: 'ito' }[end], stem + (end === 'are' ? 'a' : 'e'));
  }
  return Math.min(...forms.map((f) => freqRank.get(f) ?? Infinity));
}

const words = JSON.parse(fs.readFileSync(VOCAB, 'utf8'));
for (const w of words) delete w.level;

const ranked = words
  .filter((w) => !NO_LEVEL.has(w.it))
  .map((w) => ({ w, r: rankOf(w) }))
  .sort((a, b) => a.r - b.r);

let source = { kelly: 0, freq: 0 };
ranked.forEach(({ w }, i) => {
  const k = kelly.get(w.it);
  if (k) source.kelly++;
  else source.freq++;
  w.level = k ?? BANDS.find(([, edge]) => i < edge)[0];
});

fs.writeFileSync(VOCAB, JSON.stringify(words));
const counts = {};
for (const w of words) counts[w.level ?? 'none'] = (counts[w.level ?? 'none'] || 0) + 1;
console.log('Levels:', counts, 'Source:', source);
