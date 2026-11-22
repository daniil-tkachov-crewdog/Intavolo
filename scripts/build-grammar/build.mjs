#!/usr/bin/env node
// Builds assets/grammar.json from the lessons in ./lessons and verifies them against Wiktionary:
//   1. every Italian word (prose in *…*, Italian table columns, examples, exercises) must have an
//      Italian entry on en.wiktionary.org;
//   2. every conjugation table is generated from Wiktionary's own conjugation table;
//   3. every exercise tagged with `v: [verb, tense, person]` must match Wiktionary's form exactly;
//   4. structural checks (one correct option, blanks present, no duplicate options…).
// Fails (exit 1) if anything doesn't check out. Writes scripts/build-grammar/REPORT.md.
// Responses are cached in scripts/build-grammar/.cache/ (git-ignored).
//
// Usage: node scripts/build-grammar/build.mjs [--offline]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '../..');
const CACHE = path.join(DIR, '.cache');
const OFFLINE = process.argv.includes('--offline');
fs.mkdirSync(CACHE, { recursive: true });

// ---------- Wiktionary access (curl, so the system proxy is honoured) ----------

const API = 'https://en.wiktionary.org/w/api.php';
function api(params) {
  const args = ['-s', '--fail', '--retry', '3', '-A', 'IntavoloGrammarBuild/1.0', API, '--data-urlencode', 'format=json', '--data-urlencode', 'formatversion=2'];
  for (const [k, v] of Object.entries(params)) args.push('--data-urlencode', `${k}=${v}`);
  return JSON.parse(execFileSync('curl', args, { maxBuffer: 256 * 1024 * 1024 }).toString());
}

const cacheFile = (name) => path.join(CACHE, name.replace(/[^\p{L}\p{N}_-]/gu, (c) => '%' + c.codePointAt(0).toString(16)) + '.json');
function cached(name, fn) {
  const f = cacheFile(name);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  if (OFFLINE) throw new Error(`Not cached (offline): ${name}`);
  const v = fn();
  fs.writeFileSync(f, JSON.stringify(v));
  return v;
}

/** Italian section wikitext for many titles (null = no Italian entry). */
function italianSections(titles) {
  const out = new Map();
  const todo = [];
  for (const t of titles) {
    const f = cacheFile('w_' + t);
    if (fs.existsSync(f)) out.set(t, JSON.parse(fs.readFileSync(f, 'utf8')));
    else todo.push(t);
  }
  if (todo.length && OFFLINE) throw new Error(`Not cached (offline): ${todo.slice(0, 5).join(', ')}…`);
  for (let i = 0; i < todo.length; i += 25) {
    const batch = todo.slice(i, i + 25);
    const r = api({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: batch.join('|') });
    const norm = new Map((r.query.normalized ?? []).map((n) => [n.to, n.from]));
    for (const pg of r.query.pages) {
      const title = norm.get(pg.title) ?? pg.title;
      const text = pg.missing ? '' : pg.revisions[0].slots.main.content;
      const m = text.match(/(^|\n)==Italian==\n([\s\S]*?)(?=\n==[^=]|$)/);
      const sec = m ? m[2] : null;
      out.set(title, sec);
      fs.writeFileSync(cacheFile('w_' + title), JSON.stringify(sec));
    }
  }
  return out;
}

// ---------- Conjugation tables ----------

const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** Wiktionary marks stress on every word (pàrlo); standard spelling only keeps accents on a final vowel. */
export const standard = (s) =>
  s
    .split(' ')
    .map((w) => {
      const d = w.normalize('NFD');
      const last = d.replace(/[̀-ͯ]+$/, '').length; // index after the final base char
      let out = '';
      for (let i = 0; i < d.length; i++) {
        if (/[̀-ͯ]/.test(d[i]) && i < last) continue; // drop internal accents
        out += d[i];
      }
      return out.normalize('NFC');
    })
    .join(' ');

const TENSE_ROWS = {
  'indicative|present': 'present',
  'indicative|imperfect': 'imperfect',
  'indicative|past historic': 'passato remoto',
  'indicative|future': 'future',
  'indicative|conditional': 'conditional',
  'subjunctive|present': 'subj present',
  'subjunctive|imperfect': 'subj imperfect',
};
export const TENSES = ['present', 'imperfect', 'passato remoto', 'future', 'conditional', 'subj present', 'subj imperfect', 'imperative'];
export const PERSONS = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'];

/** { aux, pp, gerund, tenses: { present: [[forms io], [tu]…], … } } from Wiktionary. */
function conjugation(verb) {
  return cached('c_' + verb, () => {
    const html = api({ action: 'parse', page: verb, prop: 'text' }).parse.text;
    const it = html.split('id="Italian"')[1];
    if (!it) throw new Error(`No Italian section for ${verb}`);
    const start = it.indexOf('roa-inflection-table');
    if (start < 0) throw new Error(`No conjugation table for ${verb}`);
    const tbl = it.slice(start, it.indexOf('</table>', start));
    // Cells show pronunciation accents (hò, pàrlo); each form links to its real spelling, so use the link title.
    const cell = (h) => strip(h.replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<a [^>]*title="([^"]+)"[^>]*>[\s\S]*?<\/a>/g, (_, t) => t.replace(/#.*/, '').replace(/ \(page does not exist\)$/, '')));
    const rows = [...tbl.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((m) => [...m[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => cell(c[1])));
    const res = { aux: [], pp: [], gerund: [], tenses: {} };
    let mood = '';
    for (const r of rows) {
      const forms = (s) => [...new Set(s.split(',').map((x) => standard(x.replace(/\d+/g, '').trim())).filter((x) => x && x !== '—'))];
      if (r[0] === 'auxiliary verb') {
        res.aux = forms(r[1]);
        if (r[2] === 'gerund') res.gerund = forms(r[3]);
        continue;
      }
      if (r[0] === 'gerund') res.gerund = forms(r[1]);
      if (r[2] === 'past participle') res.pp = forms(r[3]);
      if (r[0] === 'past participle') res.pp = forms(r[1]);
      if (['indicative', 'subjunctive', 'imperative'].includes(r[0])) {
        mood = r[0];
        continue;
      }
      if (mood === 'imperative' && r.length === 6 && r[0] === '') {
        res.tenses.imperative = r.map((c, i) => (i === 0 ? [] : forms(c)));
        continue;
      }
      const key = TENSE_ROWS[`${mood}|${r[0]}`];
      if (key && r.length === 7) res.tenses[key] = r.slice(1).map(forms);
    }
    for (const t of TENSES) if (!res.tenses[t]) throw new Error(`Missing ${t} for ${verb}`);
    if (!res.pp.length) throw new Error(`Missing past participle for ${verb}`);
    // Wiktionary writes the stressed form of avere/essere: àvere → avere.
    res.aux = res.aux.map(standard);
    return res;
  });
}

// ---------- Italian tokens ----------

const SKIP = /^(-.*|.*-|_+|\d+|…|\.\.\.)$/;
/** Words in a piece of Italian text. Capitalised originals kept so names can be checked. */
function words(text) {
  return text
    .replace(/[«»"“”()\[\]{}.,!?;:¿¡…=+→←/|–—]/g, ' ')
    .replace(/[’`]/g, "'")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w && !SKIP.test(w));
}

const proseItalian = (text) => [...text.matchAll(/\*([^*]+)\*/g)].map((m) => m[1]);

// ---------- Build ----------

const lessonFiles = fs.readdirSync(path.join(DIR, 'lessons')).filter((f) => f.endsWith('.mjs')).sort();
const lessons = [];
for (const f of lessonFiles) lessons.push(...(await import(path.join(DIR, 'lessons', f))).default);

const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const tokenUse = new Map(); // token -> Set(where)
const distractorUse = new Map(); // words only found in wrong options (may be deliberately wrong forms)
const addTo = (map) => (where, text) => {
  for (const w of words(text)) {
    if (!map.has(w)) map.set(w, new Set());
    map.get(w).add(where);
  }
};
const addText = addTo(tokenUse);
const addDistractor = addTo(distractorUse);

const ids = new Set();
let verbChecks = 0;
let conjCells = 0;

for (const L of lessons) {
  const at = `[${L.id}]`;
  if (ids.has(L.id)) err(at, 'duplicate lesson id');
  ids.add(L.id);
  if (!L.sources?.length) err(at, 'no sources');
  if (!/^(A1|A2|B1|B2)$/.test(L.level)) err(at, `bad level ${L.level}`);
  for (const s of [L.title, L.summary]) for (const x of proseItalian(s)) addText(`${at} title`, x);

  L.blocks = L.blocks.map((b, bi) => {
    const where = `${at} block ${bi + 1}`;
    if (b.type === 'text' || b.type === 'tip') for (const x of proseItalian(b.text)) addText(where, x);
    if (b.type === 'table') {
      for (const r of b.rows) {
        if (r.length !== b.head.length) err(where, `row length ${r.length} ≠ header ${b.head.length}: ${r.join(' | ')}`);
        for (const i of b.it) addText(where, r[i]);
        r.forEach((c, i) => !b.it.includes(i) && proseItalian(c).forEach((x) => addText(where, x)));
      }
    }
    if (b.type === 'examples') for (const e of b.items) addText(where, e.it);
    if (b.type === 'conj') {
      // Resolve into a normal table straight from Wiktionary.
      const data = b.verbs.map((v) => conjugation(v));
      const label = b.tense === 'imperative' ? ['(io)', 'tu', 'Lei', 'noi', 'voi', 'Loro'] : PERSONS;
      const rows = PERSONS.map((_, i) => [label[i], ...data.map((d) => d.tenses[b.tense][i].join(' / ') || '—')]).filter((r) => r.slice(1).some((c) => c !== '—'));
      conjCells += rows.length * b.verbs.length;
      return { type: 'table', head: ['', ...b.verbs], rows, it: [], source: 'Wiktionary' };
    }
    return b;
  });

  L.exercises.forEach((e, ei) => {
    const where = `${at} ex ${ei + 1}`;
    if (!e.why) err(where, 'missing explanation');
    for (const x of [...proseItalian(e.why), ...proseItalian(e.en)]) addText(where, x);
    if (e.type === 'choice') {
      if (new Set(e.options).size !== e.options.length) err(where, 'duplicate options');
      if (e.options.length < 2) err(where, 'needs ≥2 options');
      addText(where, e.it.includes('___') ? e.it.replace(/_+/g, e.options[e.answer]) : e.it);
      e.options.forEach((o, i) => (i === e.answer ? addText : addDistractor)(where, o));
    }
    if (e.type === 'fill') {
      if (!e.it.includes('___')) err(where, 'fill needs ___');
      e.answers.forEach((a) => addText(where, e.it.replace(/_+/g, a)));
    }
    if (e.type === 'order') {
      if (words(e.sentence).length < 3) err(where, 'order sentence too short');
      addText(where, e.sentence);
    }
    if (e.v) {
      const [verb, tense, person] = e.v;
      const answer = e.type === 'choice' ? e.options[e.answer] : e.answers[0];
      const d = conjugation(verb);
      const forms = tense === 'pp' ? d.pp : tense === 'gerund' ? d.gerund : d.tenses[tense]?.[person];
      if (!forms) err(where, `unknown tense ${tense}`);
      else {
        const last = answer.toLowerCase().split(' ').slice(tense === 'pp' || tense === 'gerund' ? -1 : 0).join(' ');
        // Allow a reflexive/object pronoun in front ("mi alzo") or a participle agreeing (-o/-a/-i/-e).
        const ok = forms.some((f) => {
          const fl = f.toLowerCase();
          if (tense === 'pp') return fl.slice(0, -1) === last.slice(0, -1);
          return last === fl || last.endsWith(' ' + fl) || fl.endsWith(' ' + last) || last === fl.split(' ').pop();
        });
        if (!ok) err(where, `“${answer}” ≠ Wiktionary ${verb} ${tense}${person !== undefined ? ' ' + PERSONS[person] : ''}: ${forms.join(', ')}`);
        // Compound answer ("sono andata", "avevo mangiato"): the auxiliary must be the one Wiktionary gives.
        const parts = answer.toLowerCase().split(' ');
        if (tense === 'pp' && parts.length >= 2) {
          const auxWord = parts[parts.length - 2];
          // Reflexive ([verb, 'pp', 'refl']) and passive ([verb, 'pp', 'pass']) always take essere
          // (Wikipedia: Compound tense auxiliary verbs). The passive may also have "stato/a/i/e".
          const isForm = (a, w) => {
            const ad = conjugation(a);
            return Object.values(ad.tenses).some((rows) => rows.some((f) => f.includes(w))) || ad.pp.some((pp) => pp.slice(0, -1) === w.slice(0, -1));
          };
          const auxOk =
            person === 'pass'
              ? parts.slice(0, -1).filter((w) => !['si', 'mi', 'ti', 'ci', 'vi', 'già', 'mai'].includes(w)).every((w) => isForm('essere', w))
              : (person === 'refl' ? ['essere'] : d.aux).some((a) => isForm(a, auxWord));
          if (!auxOk) err(where, `“${answer}”: auxiliary “${auxWord}” but Wiktionary gives ${verb} → ${d.aux.join(' / ')}`);
        }
        verbChecks++;
      }
    }
  });
}

// Word-by-word Wiktionary lookup.
const tokens = [...tokenUse.keys()];
for (const t of tokens) distractorUse.delete(t);
const distractors = [...distractorUse.keys()];
const candidates = (t) => {
  const lower = t.toLowerCase();
  const c = [lower, t];
  const ap = lower.indexOf("'");
  if (ap > 0 && ap < lower.length - 1) c.push(lower.slice(0, ap + 1), lower.slice(ap + 1), t.slice(ap + 1)); // l'amico → l' + amico
  return c;
};
const allTitles = [...new Set([...tokens, ...distractors].flatMap(candidates))];
const sections = italianSections(allTitles);
// Very large pages ("a", "i") are split into "x/languages A to L" and "x/languages M to Z".
const missing = allTitles.filter((t) => sections.get(t) == null);
const split = italianSections(missing.flatMap((t) => [`${t}/languages A to L`, `${t}/languages M to Z`]));
for (const t of missing) {
  const sec = split.get(`${t}/languages A to L`) ?? split.get(`${t}/languages M to Z`);
  if (sec != null) sections.set(t, sec);
}
const has = (t) => sections.get(t) != null;
const unknown = [];
const known = (t) => {
  const lower = t.toLowerCase();
  const ap = lower.indexOf("'");
  return has(lower) || has(t) || (ap > 0 && ap < lower.length - 1 && has(lower.slice(0, ap + 1)) && (has(lower.slice(ap + 1)) || has(t.slice(ap + 1))));
};
for (const t of tokens) if (!known(t)) unknown.push(t);
const fakeDistractors = distractors.filter((t) => !known(t)).sort();
for (const t of unknown) err([...tokenUse.get(t)].join(', '), `“${t}” has no Italian entry on Wiktionary`);

// ---------- Output ----------

const count = (k) => lessons.reduce((n, L) => n + L.exercises.filter((e) => e.type === k).length, 0);
const report = [
  '# Grammar build report',
  '',
  `Generated by \`node scripts/build-grammar/build.mjs\`.`,
  '',
  `- Lessons: ${lessons.length}`,
  `- Exercises: ${lessons.reduce((n, L) => n + L.exercises.length, 0)} (choice ${count('choice')}, fill ${count('fill')}, order ${count('order')})`,
  `- Distinct Italian words checked against Wiktionary: ${tokens.length} — unknown: ${unknown.length}`,
  `- Conjugation table cells taken from Wiktionary: ${conjCells}`,
  `- Exercise answers checked against Wiktionary conjugation tables: ${verbChecks}`,
  `- Wrong options that are deliberately not real words (common learner mistakes): ${fakeDistractors.length}`,
  `- Errors: ${errors.length}`,
  '',
  '## Rule sources per lesson',
  '',
  ...lessons.flatMap((L) => [`### ${L.level} · ${L.title}`, ...L.sources.map((s) => `- [${s[0]}](${s[1]})`), '']),
  '## Deliberately wrong option forms',
  '',
  'These appear only as wrong answers in multiple-choice questions and are not Italian words on purpose:',
  '',
  fakeDistractors.join(', ') || '(none)',
  '',
  ...(errors.length ? ['## Errors', '', ...errors.map((e) => `- ${e}`)] : []),
].join('\n');
fs.writeFileSync(path.join(DIR, 'REPORT.md'), report + '\n');

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} error(s). See scripts/build-grammar/REPORT.md`);
  process.exit(1);
}
const out = lessons.map((L) => ({ ...L, sources: L.sources.map(([name, url]) => ({ name, url })) }));
fs.writeFileSync(path.join(ROOT, 'assets/grammar.json'), JSON.stringify(out));
console.log(`OK: ${lessons.length} lessons, ${tokens.length} words verified, ${verbChecks} verb answers checked, ${conjCells} table cells from Wiktionary.`);
