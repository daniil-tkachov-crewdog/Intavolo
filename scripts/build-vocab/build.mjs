#!/usr/bin/env node
// Builds assets/vocab.json from free sources:
//   --kaikki   kaikki.org Italian JSONL (.jsonl or .jsonl.gz)
//   --freq     FrequencyWords it_50k.txt
//   --tatoeba  Tatoeba ita-eng sentence pairs TSV (optional)
//   --wordnet  WordNet dict folder (data.noun, index.noun, …) for topics
//   --out      output path (default: assets/vocab.json)
//   --limit    max number of words (default: every lemma found in the frequency list)
import fs from 'node:fs';
import zlib from 'node:zlib';
import readline from 'node:readline';
import path from 'node:path';
import { loadTopics } from './topics.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);
if (!args.kaikki || !args.freq) {
  console.error('Usage: node build.mjs --kaikki <file> --freq <it_50k.txt> [--tatoeba <pairs.tsv>] [--wordnet <dict dir>] [--out assets/vocab.json] [--limit N]');
  process.exit(1);
}
const LIMIT = Number(args.limit || Infinity);
const OUT = args.out || 'assets/vocab.json';

const SKIP_POS = new Set(['name', 'abbrev', 'character', 'symbol', 'suffix', 'prefix', 'infix', 'punct', 'phrase', 'proverb', 'affix', 'romanization', 'contraction']);
const SKIP_TAGS = new Set(['form-of', 'alt-of', 'obsolete', 'archaic', 'rare', 'abbreviation', 'initialism', 'acronym', 'misspelling', 'dated']);
const MAX_ALT = 2; // side translations besides the main one

function lines(file) {
  let stream = fs.createReadStream(file);
  if (file.endsWith('.gz')) stream = stream.pipe(zlib.createGunzip());
  return readline.createInterface({ input: stream, crlfDelay: Infinity });
}

function cleanGloss(g) {
  const text = g.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
  // Descriptions ("Used as…", "The name of…") start capitalized; real translations don't.
  if (!text || /^[A-Z]/.test(text.replace(/^I\b/, 'i'))) return [];
  const pieces = text.split(/[;,]/).map((p) => p.trim().replace(/\.$/, '')).filter(Boolean);
  if (/^(compound|gerund|plural|feminine|masculine|inflection|alternative|apocopic|superlative|diminutive|augmentative|past participle|present participle|synonym|clipping|ellipsis)( form)? of\b/i.test(text)) return [];
  const ok = (p) => p.split(' ').length <= 4 && !/[:"+=]/.test(p) && !/^(etc|used|denotes|indicates|expresses)\b/i.test(p);
  return pieces.filter(ok).map((p) => p.replace(/^(a|an) (?=\w)/, ''));
}

const tokenize = (t) => t.toLowerCase().split(/[^a-zàáèéìíòóùú]+/).filter(Boolean);

// 1) Kaikki: lemma entries per word + "form of" links (e.g. ha -> avere)
const entries = new Map(); // word -> [{ it, en, ipa, pos }]
const formOf = new Map(); // word -> lemma
for await (const line of lines(args.kaikki)) {
  if (!line) continue;
  let e;
  try { e = JSON.parse(line); } catch { continue; }
  if (e.lang_code && e.lang_code !== 'it') continue;
  const word = (e.word || '').trim();
  if (!word || word.includes(' ') || /[A-Z]/.test(word[0]) || SKIP_POS.has(e.pos)) continue;
  const key = word.toLowerCase();

  const en = []; // all meanings
  let main = null; // meanings of the first usable sense (main + close synonyms)
  for (const s of e.senses || []) {
    const target = (s.form_of || [])[0]?.word;
    if (target && !formOf.has(key) && target.toLowerCase() !== key) formOf.set(key, target.toLowerCase());
    if (s.form_of || s.alt_of) continue;
    if ((s.tags || []).some((t) => SKIP_TAGS.has(t))) continue;
    const pieces = (s.glosses || []).slice(0, 1).flatMap(cleanGloss);
    if (pieces.length && !main) main = [...new Set(pieces)];
    for (const m of pieces) if (!en.includes(m)) en.push(m);
  }
  const ipa = (e.sounds || []).find((x) => x.ipa)?.ipa || '';
  if (!entries.has(key)) entries.set(key, []);
  entries.get(key).push({ it: word, en, main: main || [], ipa, pos: e.pos || '', order: entries.get(key).length });
}

// Best entry per word: verbs win for infinitives (essere = to be, not "being");
// otherwise Wiktionary's first entry (usually the main meaning: cane = dog), unless another has many more meanings.
const score = (x, key) => Math.min(x.en.length, 6) + (x.order === 0 ? 3 : 0) + (x.pos === 'verb' && /(are|ere|ire|rre)$/.test(key) ? 100 : 0);
const lemmas = new Map();
for (const [key, list] of entries) {
  const best = list.filter((x) => x.en.length).sort((a, b) => score(b, key) - score(a, key))[0];
  if (!best) continue;
  lemmas.set(key, { ...best, ipa: best.ipa || list.find((x) => x.ipa)?.ipa || '', allMeanings: best.en.length });
}
console.log(`Lemmas found: ${lemmas.size}`);

// 2) Frequency: walk the list; a word form counts for its lemma (ha -> avere).
// A form that is also a real word stays itself if it has 3+ meanings, or 2+ and isn't a noun
// (ora = hour, grazie = thanks); otherwise it counts for its lemma (ha = avere, resta = restare).
// Hand fixes for the most common words (overrides.json).
const overrides = JSON.parse(fs.readFileSync(new URL('./overrides.json', import.meta.url), 'utf8'));
const skip = new Set(overrides.skip);
for (const [key, fix] of Object.entries(overrides.words)) {
  const ipa = lemmas.get(key)?.ipa || entries.get(key)?.find((x) => x.ipa)?.ipa || '';
  lemmas.set(key, { it: key, ipa, allMeanings: 99, ...fix });
}

const words = [];
const byWord = new Map();
const add = (key) => {
  if (byWord.has(key) || !lemmas.has(key) || words.length >= LIMIT) return;
  const { it, en, main, ipa, pos } = lemmas.get(key);
  const sense = main?.length ? main : en;
  const entry = { id: 0, it, en: sense[0], alt: sense.slice(1, 1 + MAX_ALT), ipa, pos, topic: '', examples: [] };
  words.push(entry);
  byWord.set(key, entry);
};
for await (const line of lines(args.freq)) {
  const w = line.split(/\s+/)[0]?.toLowerCase();
  if (!w) continue;
  const lemma = formOf.get(w);
  const self = skip.has(w) ? undefined : lemmas.get(w);
  const strong = self && (self.allMeanings >= 3 || (self.allMeanings >= 2 && self.pos !== 'noun'));
  if (strong || ((!lemma || !lemmas.has(lemma)) && !skip.has(w))) add(w);
  else if (lemma) add(lemma);
  if (words.length >= LIMIT) break;
}
console.log(`Words selected: ${words.length}`);

// 3) Tatoeba: 2 shortest pairs (3+ words) containing each word
if (args.tatoeba) {
  const seen = new Set();
  for await (const line of lines(args.tatoeba)) {
    const cols = line.split('\t');
    if (cols.length < 4) continue;
    const [, it, , en] = cols;
    if (seen.has(it) || it.length > 80) continue;
    seen.add(it);
    const toks = tokenize(it);
    if (toks.length < 4) continue;
    for (const t of new Set(toks)) {
      const w = byWord.get(t);
      if (!w) continue;
      w.examples.push({ it, en });
      w.examples.sort((a, b) => a.it.length - b.it.length);
      if (w.examples.length > 2) w.examples.length = 2;
    }
  }
  console.log(`Words with examples: ${words.filter((w) => w.examples.length).length}`);
}

// 4) Topics (WordNet), then alphabetical order with ids 1..N. The frequency list only picked the words.
if (args.wordnet) {
  const topicFor = loadTopics(args.wordnet);
  for (const w of words) w.topic = topicFor(w);
  const counts = {};
  for (const w of words) counts[w.topic] = (counts[w.topic] || 0) + 1;
  console.log('Topics:', Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(', '));
}
words.sort((a, b) => a.it.localeCompare(b.it, 'it'));
words.forEach((w, i) => (w.id = i + 1));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(words));
console.log(`Wrote ${OUT} (${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)} MB)`);
