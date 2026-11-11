#!/usr/bin/env node
// Joins Tatoeba per-language exports into "ita_id \t ita \t eng_id \t eng" pairs.
// Usage: node pairs.mjs <data dir>   (needs ita_sentences.tsv, eng_sentences.tsv, ita-eng_links.tsv)
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const dir = process.argv[2] || 'scripts/build-vocab/data';
const read = (f) => readline.createInterface({ input: fs.createReadStream(path.join(dir, f)), crlfDelay: Infinity });

const links = new Map(); // ita_id -> first eng_id
for await (const l of read('ita-eng_links.tsv')) {
  const [it, en] = l.split('\t');
  if (!links.has(it)) links.set(it, en);
}
const wantedEng = new Set(links.values());
const eng = new Map();
for await (const l of read('eng_sentences.tsv')) {
  const [id, , text] = l.split('\t');
  if (wantedEng.has(id)) eng.set(id, text);
}
const out = fs.createWriteStream(path.join(dir, 'ita-eng.tsv'));
let n = 0;
for await (const l of read('ita_sentences.tsv')) {
  const [id, , text] = l.split('\t');
  const enId = links.get(id);
  if (enId && eng.has(enId)) {
    out.write(`${id}\t${text}\t${enId}\t${eng.get(enId)}\n`);
    n++;
  }
}
out.end();
console.log(`Pairs: ${n}`);
