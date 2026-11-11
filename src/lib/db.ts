import { openDatabaseSync } from 'expo-sqlite';
import type { Progress, Status } from './engine';

// v2: word ids changed when the vocabulary moved to 16k words with topics.
const db = openDatabaseSync('intavolo-v2.db');

export const transaction = (fn: () => void) => db.withTransactionSync(fn);

db.execSync(`
  CREATE TABLE IF NOT EXISTS progress (
    word_id INTEGER PRIMARY KEY NOT NULL,
    status TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    last_counted_at INTEGER,
    next_review_at INTEGER,
    review_step INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS skipped (
    word_id INTEGER PRIMARY KEY NOT NULL,
    skipped_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`);

interface Row {
  word_id: number;
  status: Status;
  count: number;
  last_counted_at: number | null;
  next_review_at: number | null;
  review_step: number;
}

export function loadProgress(): Progress[] {
  return db.getAllSync<Row>('SELECT * FROM progress').map((r) => ({
    wordId: r.word_id,
    status: r.status,
    count: r.count,
    lastCountedAt: r.last_counted_at,
    nextReviewAt: r.next_review_at,
    reviewStep: r.review_step,
  }));
}

export function saveProgress(p: Progress) {
  db.runSync(
    `INSERT OR REPLACE INTO progress (word_id, status, count, last_counted_at, next_review_at, review_step)
     VALUES (?, ?, ?, ?, ?, ?)`,
    p.wordId, p.status, p.count, p.lastCountedAt, p.nextReviewAt, p.reviewStep
  );
  db.runSync('DELETE FROM skipped WHERE word_id = ?', p.wordId);
}

export function loadSkipped(): Map<number, number> {
  const rows = db.getAllSync<{ word_id: number; skipped_at: number }>('SELECT * FROM skipped');
  return new Map(rows.map((r) => [r.word_id, r.skipped_at]));
}

export function saveSkipped(wordId: number, at: number) {
  db.runSync('INSERT OR REPLACE INTO skipped (word_id, skipped_at) VALUES (?, ?)', wordId, at);
}

export function getSetting(key: string): string | null {
  return db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key)?.value ?? null;
}

export function setSetting(key: string, value: string) {
  db.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
}
