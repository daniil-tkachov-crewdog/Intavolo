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

// Sync columns: updated_at (ms), dirty (needs push), deleted (tombstone, so deletions sync too).
const cols = db.getAllSync<{ name: string }>('PRAGMA table_info(progress)').map((c) => c.name);
if (!cols.includes('updated_at')) {
  db.execSync(`
    ALTER TABLE progress ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE progress ADD COLUMN dirty INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE progress ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;
  `);
}

interface Row {
  word_id: number;
  status: Status;
  count: number;
  last_counted_at: number | null;
  next_review_at: number | null;
  review_step: number;
}

export interface SyncRow extends Row {
  updated_at: number;
  deleted: 0 | 1;
}

export function loadProgress(): Progress[] {
  return db.getAllSync<Row>('SELECT * FROM progress WHERE deleted = 0').map((r) => ({
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
    `INSERT OR REPLACE INTO progress (word_id, status, count, last_counted_at, next_review_at, review_step, updated_at, dirty, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`,
    p.wordId, p.status, p.count, p.lastCountedAt, p.nextReviewAt, p.reviewStep, Date.now()
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

export function deleteProgress(wordId: number) {
  db.runSync('UPDATE progress SET deleted = 1, dirty = 1, updated_at = ? WHERE word_id = ?', Date.now(), wordId);
}

// ---- Sync helpers ----

export function dirtyRows(): SyncRow[] {
  return db.getAllSync<SyncRow>(
    'SELECT word_id, status, count, last_counted_at, next_review_at, review_step, updated_at, deleted FROM progress WHERE dirty = 1'
  );
}

/** Clear the dirty flag unless the row changed again since it was read. */
export function markClean(rows: SyncRow[]) {
  db.withTransactionSync(() => {
    for (const r of rows) db.runSync('UPDATE progress SET dirty = 0 WHERE word_id = ? AND updated_at = ?', r.word_id, r.updated_at);
    db.runSync('DELETE FROM progress WHERE deleted = 1 AND dirty = 0');
  });
}

/** Apply server rows unless the local copy has newer unpushed changes. */
export function applyRemote(rows: SyncRow[]) {
  db.withTransactionSync(() => {
    for (const r of rows) {
      const local = db.getFirstSync<{ updated_at: number; dirty: number }>('SELECT updated_at, dirty FROM progress WHERE word_id = ?', r.word_id);
      if (local?.dirty && local.updated_at >= r.updated_at) continue;
      if (r.deleted) {
        db.runSync('DELETE FROM progress WHERE word_id = ?', r.word_id);
      } else {
        db.runSync(
          `INSERT OR REPLACE INTO progress (word_id, status, count, last_counted_at, next_review_at, review_step, updated_at, dirty, deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
          r.word_id, r.status, r.count, r.last_counted_at, r.next_review_at, r.review_step, r.updated_at
        );
        db.runSync('DELETE FROM skipped WHERE word_id = ?', r.word_id);
      }
    }
  });
}

/** Remove all learning data from the phone (sign out, account switch, delete account). */
export function wipeProgress() {
  db.execSync('DELETE FROM progress; DELETE FROM skipped;');
  db.runSync("DELETE FROM settings WHERE key IN ('syncUser', 'syncCursor', 'lastSyncedAt')");
}

export function deleteSetting(key: string) {
  db.runSync('DELETE FROM settings WHERE key = ?', key);
}
