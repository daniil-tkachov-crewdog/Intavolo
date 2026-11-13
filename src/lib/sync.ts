// Local-first progress sync. SQLite is the source of truth; Supabase is the per-account copy.
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { supabase } from './supabase';
import * as db from './db';

const BATCH = 500;
const COLS = 'word_id, status, count, last_counted_at, next_review_at, review_step, updated_at, deleted, synced_at';

type ServerRow = Omit<db.SyncRow, 'deleted'> & { deleted: boolean; synced_at: string };

interface State {
  syncing: boolean;
  lastSyncedAt: number | null;
  error: string | null;
}

let userId: string | null = null;
let state: State = { syncing: false, lastSyncedAt: null, error: null };
let running: Promise<boolean> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const pulledListeners = new Set<() => void>();

const set = (s: Partial<State>) => {
  state = { ...state, ...s };
  listeners.forEach((l) => l());
};

/** Store subscribes to reload its in-memory maps after the DB changes underneath it. */
export function onDataChanged(cb: () => void) {
  pulledListeners.add(cb);
  return () => void pulledListeners.delete(cb);
}
const emitDataChanged = () => pulledListeners.forEach((l) => l());

async function push(uid: string) {
  const rows = db.dirtyRows();
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('progress')
      .upsert(chunk.map((r) => ({ ...r, user_id: uid, deleted: !!r.deleted })), { onConflict: 'user_id,word_id' });
    if (error) throw error;
    db.markClean(chunk);
  }
}

async function pull() {
  let cursor = db.getSetting('syncCursor') ?? '1970-01-01T00:00:00Z';
  let changed = false;
  for (;;) {
    const { data, error } = await supabase.from('progress').select(COLS).gt('synced_at', cursor).order('synced_at').limit(1000);
    if (error) throw error;
    const rows = (data ?? []) as ServerRow[];
    if (!rows.length) break;
    db.applyRemote(rows.map((r) => ({ ...r, deleted: r.deleted ? 1 : 0 })));
    changed = true;
    cursor = rows[rows.length - 1].synced_at;
    db.setSetting('syncCursor', cursor);
    if (rows.length < 1000) break;
  }
  if (changed) emitDataChanged();
}

/** Push local changes, then pull remote ones. Resolves false if offline / failed. */
export function syncNow(): Promise<boolean> {
  if (!userId) return Promise.resolve(false);
  if (running) return running;
  const uid = userId;
  set({ syncing: true });
  running = (async () => {
    try {
      await push(uid);
      await pull();
      const now = Date.now();
      db.setSetting('lastSyncedAt', String(now));
      set({ syncing: false, lastSyncedAt: now, error: null });
      return true;
    } catch (e) {
      set({ syncing: false, error: e instanceof Error ? e.message : 'Sync failed' });
      return false;
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Debounced sync after a local change. */
export function scheduleSync() {
  if (!userId) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    syncNow();
  }, 3000);
}

/** Called when a session appears. Local data from another user (or pre-account) is discarded. */
export function startSync(uid: string) {
  if (db.getSetting('syncUser') !== uid) {
    db.wipeProgress();
    db.setSetting('syncUser', uid);
    emitDataChanged();
  }
  userId = uid;
  const last = db.getSetting('lastSyncedAt');
  set({ lastSyncedAt: last ? Number(last) : null, error: null });
  syncNow();
}

/** Stop syncing and clear the phone's learning data. */
export function stopSync() {
  userId = null;
  if (timer) clearTimeout(timer);
  timer = null;
  db.wipeProgress();
  set({ syncing: false, lastSyncedAt: null, error: null });
  emitDataChanged();
}

export const hasUnsynced = () => db.dirtyRows().length > 0;

AppState.addEventListener('change', (s) => {
  if (s === 'active') syncNow();
});

export function useSyncStatus() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => state
  );
}
