#!/usr/bin/env node
// Builds assets/sentences.json: Italian sentences with their English translations, from Tatoeba.
//   - only sentences added by native Italian speakers (Tatoeba user_languages, level 5)
//   - 3–12 words, with at least one English translation (all translations are kept)
//   - every word must map to a word in assets/vocab.json, using a word forms table built from
//     the kaikki.org Wiktionary export (parlo → parlare, case → casa, del → di…); names are ignored
//   - level = level of the hardest word; picked evenly across levels with word variety
//
// Usage: node scripts/build-sentences/build.mjs --tatoeba <dir> --kaikki <kaikki-it.jsonl.gz> [--count 20000]
//   <dir> needs: ita_sentences_detailed.tsv, eng_sentences.tsv, ita-eng_links.tsv, user_languages.csv
//   (from https://downloads.tatoeba.org/exports/). Writes the forms table to scripts/build-sentences/forms.json.
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '../..');
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') && acc.push([a.slice(2), arr[i + 1]]), acc), [])
);
if (!args.tatoeba || !args.kaikki) {
  console.error('Usage: node build.mjs --tatoeba <dir> --kaikki <kaikki-it.jsonl(.gz)> [--count 20000]');
  process.exit(1);
}
const COUNT = Number(args.count || 20000);
const T = (f) => path.join(args.tatoeba, f);

function lines(file) {
  let stream = fs.createReadStream(file);
  if (file.endsWith('.gz')) stream = stream.pipe(zlib.createGunzip());
  return readline.createInterface({ input: stream, crlfDelay: Infinity });
}

// ---------- Vocabulary ----------
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const vocab = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/vocab.json'), 'utf8'));
const vocabByKey = new Map();
for (const w of vocab) if (w.level && !vocabByKey.has(w.it.toLowerCase())) vocabByKey.set(w.it.toLowerCase(), w);

// ---------- Word forms table (form → lemmas) ----------
const forms = new Map();
const addForm = (form, lemma) => {
  form = form.toLowerCase();
  lemma = lemma.toLowerCase();
  if (form === lemma || form.includes(' ')) return;
  if (!forms.has(form)) forms.set(form, new Set());
  forms.get(form).add(lemma);
};
// Wiktionary marks stress inside forms (abatìno); real spelling only keeps a final accent.
const plain = (f) => f.normalize('NFD').replace(/[̀-ͯ](?=.)/g, (m, i, s) => (/[a-z]/i.test(s.slice(i + 1)) ? '' : m)).normalize('NFC');
for await (const line of lines(args.kaikki)) {
  if (!line) continue;
  let e;
  try {
    e = JSON.parse(line);
  } catch {
    continue;
  }
  if (e.lang_code && e.lang_code !== 'it') continue;
  const word = (e.word || '').trim();
  if (!word || word.includes(' ')) continue;
  for (const s of e.senses || []) for (const f of s.form_of || []) if (f.word) addForm(word, f.word);
  for (const f of e.forms || []) {
    const tags = f.tags || [];
    if (!f.form || tags.includes('romanization') || tags.includes('table-tags') || tags.includes('inflection-template')) continue;
    if (tags.some((t) => ['diminutive', 'augmentative', 'pejorative', 'endearing'].includes(t))) continue;
    addForm(plain(f.form), word);
  }
}
// Articles and preposition + article: map to the vocabulary word they belong to.
const ART = { i: 'il', "l'": 'il', un: 'uno', "un'": 'uno', una: 'uno', gli: 'gli', le: 'le' };
for (const [f, l] of Object.entries(ART)) addForm(f, l);
for (const [prep, stem] of [['di', 'de'], ['a', 'a'], ['da', 'da'], ['in', 'ne'], ['su', 'su']])
  for (const tail of ['l', 'llo', "ll'", 'lla', 'i', 'gli', 'lle']) addForm(stem + tail, prep);
fs.writeFileSync(path.join(DIR, 'forms.json'), JSON.stringify(Object.fromEntries([...forms].map(([k, v]) => [k, [...v]]))));
console.log(`Forms table: ${forms.size} forms`);

/**
 * Vocabulary word for a token: itself or a lemma (up to 3 steps: parlò → parlare).
 * If several match (era = "age", but also a form of essere), the most basic (lowest level) wins.
 */
function resolve(tok) {
  const found = [];
  if (vocabByKey.has(tok)) found.push(vocabByKey.get(tok));
  const seen = new Set([tok]);
  let layer = [tok];
  for (let depth = 0; depth < 3 && layer.length; depth++) {
    const next = [];
    for (const t of layer)
      for (const l of forms.get(t) ?? []) {
        if (seen.has(l)) continue;
        seen.add(l);
        if (vocabByKey.has(l)) found.push(vocabByKey.get(l));
        next.push(l);
      }
    layer = next;
  }
  return found.sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level))[0] ?? null;
}

// Number words missing from the vocabulary are treated like digits (else "sette" would match "setta").
const NUMBERS = new Set('zero uno due tre quattro cinque sei sette otto nove dieci undici dodici tredici quattordici quindici sedici diciassette diciotto diciannove venti trenta quaranta cinquanta sessanta settanta ottanta novanta cento mille'.split(' '));
const isFreeNumber = (t) => NUMBERS.has(t) && !vocabByKey.has(t);

// ---------- Tatoeba ----------
const native = new Set();
for await (const line of lines(T('user_languages.csv'))) {
  const c = line.split('\t');
  if (c[0] === 'ita' && c[1] === '5') native.add(c[2]);
}
const ita = new Map();
for await (const line of lines(T('ita_sentences_detailed.tsv'))) {
  const c = line.split('\t');
  if (native.has(c[3])) ita.set(c[0], c[2]);
}
const links = new Map();
for await (const line of lines(T('ita-eng_links.tsv'))) {
  const [a, b] = line.split('\t');
  if (!ita.has(a)) continue;
  if (!links.has(a)) links.set(a, []);
  links.get(a).push(b);
}
const needed = new Set([...links.values()].flat());
const eng = new Map();
for await (const line of lines(T('eng_sentences.tsv'))) {
  const c = line.split('\t');
  if (needed.has(c[0])) eng.set(c[0], c[2]);
}

// Names: words that appear capitalised in the middle of sentences and never in lower case.
const tokenize = (s) => s.replace(/[’`]/g, "'").match(/[A-Za-zÀ-ÿ]+'?|\d+/g) ?? [];
const capMid = new Map();
const lower = new Set();
for (const s of ita.values()) {
  tokenize(s).forEach((t, i) => {
    if (/^[A-ZÀ-Þ]/.test(t)) i > 0 && capMid.set(t, (capMid.get(t) ?? 0) + 1);
    else lower.add(t);
  });
}
const isName = (t) => (capMid.get(t) ?? 0) >= 3 && !lower.has(t.toLowerCase());

const candidates = [];
const seenText = new Set();
const stats = { total: ita.size, withEn: 0, length: 0, covered: 0 };
for (const [id, it] of ita) {
  const en = [...new Set((links.get(id) ?? []).map((b) => eng.get(b)).filter(Boolean))];
  if (!en.length) continue;
  stats.withEn++;
  const toks = tokenize(it);
  const n = it.split(/\s+/).length;
  if (n < 3 || n > 12) continue;
  stats.length++;
  const ids = [];
  let level = 0;
  let ok = true;
  for (const t of toks) {
    if (/^\d+$/.test(t) || isName(t) || isFreeNumber(t.toLowerCase())) continue;
    const w = resolve(t.toLowerCase());
    if (!w) {
      ok = false;
      break;
    }
    ids.push(w.id);
    level = Math.max(level, LEVELS.indexOf(w.level));
  }
  if (!ok || !ids.length) continue;
  // Skip near-duplicates (same sentence with another name).
  const key = toks.map((t) => (isName(t) ? '#' : t.toLowerCase())).join(' ');
  if (seenText.has(key)) continue;
  seenText.add(key);
  stats.covered++;
  candidates.push({ it, en, words: [...new Set(ids)], level, n });
}
console.log(stats);

// ---------- Pick COUNT sentences, evenly across levels ----------
// Prefer more English translations (more accepted answers), then shorter; at most 25 sentences per word.
candidates.sort((a, b) => b.en.length - a.en.length || a.n - b.n);
const byLevel = LEVELS.map((_, l) => candidates.filter((c) => c.level === l));
const quota = LEVELS.map(() => 0);
let left = COUNT;
let open = LEVELS.map((_, l) => l).filter((l) => byLevel[l].length);
while (left > 0 && open.length) {
  const share = Math.max(1, Math.floor(left / open.length));
  for (const l of open) {
    const add = Math.min(share, byLevel[l].length - quota[l], left);
    quota[l] += add;
    left -= add;
  }
  open = open.filter((l) => quota[l] < byLevel[l].length);
}
const perWord = new Map();
const picked = [];
for (const [l, list] of byLevel.entries()) {
  let taken = 0;
  for (const pass of [25, Infinity]) {
    for (const c of list) {
      if (taken >= quota[l]) break;
      if (c.picked || c.words.some((w) => (perWord.get(w) ?? 0) >= pass)) continue;
      c.picked = true;
      c.words.forEach((w) => perWord.set(w, (perWord.get(w) ?? 0) + 1));
      picked.push(c);
      taken++;
    }
  }
}
const out = picked.map((c, i) => ({ id: i + 1, it: c.it, en: c.en, words: c.words, level: LEVELS[c.level] }));
fs.writeFileSync(path.join(ROOT, 'assets/sentences.json'), JSON.stringify(out));
const per = Object.fromEntries(LEVELS.map((L) => [L, out.filter((s) => s.level === L).length]));
console.log(`Wrote ${out.length} sentences`, per, `${(fs.statSync(path.join(ROOT, 'assets/sentences.json')).size / 1e6).toFixed(1)} MB`);
console.log(`with 2+ translations: ${out.filter((s) => s.en.length > 1).length}`);
