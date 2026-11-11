#!/usr/bin/env node
// Builds assets/vocab.json from free sources:
//   --kaikki   kaikki.org Italian JSONL (.jsonl or .jsonl.gz)
//   --freq     FrequencyWords it_50k.txt
//   --tatoeba  Tatoeba ita-eng sentence pairs TSV (optional)
//   --out      output path (default: assets/vocab.json)
//   --limit    number of words (default: 3000)
import fs from 'node:fs';
import zlib from 'node:zlib';
import readline from 'node:readline';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);
if (!args.kaikki || !args.freq) {
  console.error('Usage: node build.mjs --kaikki <file> --freq <it_50k.txt> [--tatoeba <pairs.tsv>] [--out assets/vocab.json] [--limit 3000]');
  process.exit(1);
}
const LIMIT = Number(args.limit || 3000);
const OUT = args.out || 'assets/vocab.json';

const SKIP_POS = new Set(['name', 'abbrev', 'character', 'symbol', 'suffix', 'prefix', 'infix', 'punct', 'phrase', 'proverb', 'affix', 'romanization', 'contraction']);
const SKIP_TAGS = new Set(['form-of', 'alt-of', 'obsolete', 'archaic', 'rare', 'abbreviation', 'initialism', 'acronym', 'misspelling', 'dated']);
const MAX_MEANINGS = 3;

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
  const ok = (p) => p.split(' ').length <= 4 && !/[:"+=]/.test(p) && !/^(etc|used|denotes|indicates|expresses)\b/i.test(p);
  return pieces.filter(ok);
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

  const en = [];
  for (const s of e.senses || []) {
    const target = (s.form_of || [])[0]?.word;
    if (target && !formOf.has(key) && target.toLowerCase() !== key) formOf.set(key, target.toLowerCase());
    if (s.form_of || s.alt_of) continue;
    if ((s.tags || []).some((t) => SKIP_TAGS.has(t))) continue;
    for (const g of s.glosses || []) for (const m of cleanGloss(g)) if (!en.includes(m)) en.push(m);
  }
  const ipa = (e.sounds || []).find((x) => x.ipa)?.ipa || '';
  if (!entries.has(key)) entries.set(key, []);
  entries.get(key).push({ it: word, en, ipa, pos: e.pos || '' });
}

// Best entry per word: verbs win for infinitives (essere = to be, not "being");
// otherwise most meanings, with a small edge over nouns (mi = me, not the musical note).
const score = (x, key) => x.en.length + (x.pos === 'noun' ? 0 : 1) + (x.pos === 'verb' && /(are|ere|ire|rre)$/.test(key) ? 100 : 0);
const lemmas = new Map();
for (const [key, list] of entries) {
  const best = list.filter((x) => x.en.length).sort((a, b) => score(b, key) - score(a, key))[0];
  if (!best) continue;
  lemmas.set(key, { ...best, ipa: best.ipa || list.find((x) => x.ipa)?.ipa || '', allMeanings: best.en.length, en: best.en.slice(0, MAX_MEANINGS) });
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
  const { allMeanings, ...l } = lemmas.get(key);
  const entry = { id: words.length + 1, ...l, examples: [], rank: words.length + 1 };
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

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(words));
console.log(`Wrote ${OUT} (${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)} MB)`);
