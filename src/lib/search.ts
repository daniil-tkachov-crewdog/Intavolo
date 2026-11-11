// Word search by Italian or English. Pure (unit-tested with node:test).
const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

export interface Searchable {
  id: number;
  it: string;
  en: string;
  alt: string[];
}

const norm = (s: string) => stripAccents(s.toLowerCase().trim()).replace(/^(to|the|a|an) /, '');

/**
 * Ranking: exact Italian → Italian starts with → exact English → English starts with →
 * Italian contains → English contains. Accents and "to "/"the " are ignored.
 */
export function searchWords<T extends Searchable>(words: T[], query: string, limit = 100): T[] {
  const q = norm(query);
  if (!q) return [];
  const scored: { w: T; score: number }[] = [];
  for (const w of words) {
    const it = norm(w.it);
    const ens = [w.en, ...w.alt].map(norm);
    let score = 0;
    if (it === q) score = 6;
    else if (it.startsWith(q)) score = 5;
    else if (ens.includes(q)) score = 4;
    else if (ens.some((e) => e.startsWith(q))) score = 3;
    else if (it.includes(q)) score = 2;
    else if (ens.some((e) => e.includes(q))) score = 1;
    if (score) scored.push({ w, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.w.it.length - b.w.it.length || a.w.it.localeCompare(b.w.it))
    .slice(0, limit)
    .map((x) => x.w);
}
