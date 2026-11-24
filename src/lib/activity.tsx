// Daily goal, streak and reminders. Local-first like progress: SQLite + sync to Supabase `daily_activity`.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as db from './db';
import { onDataChanged, scheduleSync } from './sync';
import { useAuth } from './auth';
import { cancelReminders, ensurePermission, planReminders } from './reminders';
import { computeStreak, dayKey, DEFAULT_GOAL, isMet, milestoneAt, type Day, type StreakInfo } from './streak';

export interface Reminder {
  enabled: boolean;
  hour: number;
  minute: number;
}

export interface Celebration {
  streak: number;
  milestone: boolean;
  freezeEarned: boolean;
}

interface Activity {
  today: string;
  days: Map<string, Day>;
  goal: number;
  done: number; // exercises today
  info: StreakInfo;
  reminder: Reminder;
  /** Reminders were never offered/configured yet. */
  reminderUnset: boolean;
  celebration: Celebration | null;
  record: (n?: number) => void;
  setGoal: (g: number) => void;
  /** Returns false if notifications are not allowed. */
  setReminder: (r: Reminder) => Promise<boolean>;
  dismissCelebration: () => void;
}

const Ctx = createContext<Activity | null>(null);

const load = () => new Map(db.loadActivity().map((r) => [r.day, { day: r.day, exercises: r.exercises, goal: r.goal }]));

const loadGoal = (days: Map<string, Day>) => {
  const saved = Number(db.getSetting('dailyGoal'));
  if (saved) return saved;
  // Fresh install / new device: take the goal from the latest synced day.
  const latest = [...days.values()].sort((a, b) => (a.day < b.day ? 1 : -1))[0];
  return latest?.goal ?? DEFAULT_GOAL;
};

const loadReminder = (): Reminder => ({
  enabled: db.getSetting('reminderEnabled') === '1',
  hour: Number(db.getSetting('reminderHour') ?? 19),
  minute: Number(db.getSetting('reminderMinute') ?? 0),
});

export function ActivityProvider({ children }: { children: ReactNode }) {
  const { session, guest } = useAuth();
  const inApp = !!session || guest;
  const [days, setDays] = useState(load);
  const [goal, setGoalState] = useState(() => loadGoal(days));
  const [today, setToday] = useState(() => dayKey(new Date()));
  const [reminder, setReminderState] = useState(loadReminder);
  const [reminderUnset, setUnset] = useState(() => db.getSetting('reminderEnabled') === null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const daysRef = useRef(days);
  daysRef.current = days;

  useEffect(
    () =>
      onDataChanged(() => {
        const d = load();
        setDays(d);
        setGoalState(loadGoal(d));
      }),
    []
  );

  // The day can roll over while the app sits in the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setToday(dayKey(new Date())));
    return () => sub.remove();
  }, []);

  const info = useMemo(() => computeStreak(days, today), [days, today]);
  const done = days.get(today)?.exercises ?? 0;

  // Keep the notification plan in sync with reality.
  useEffect(() => {
    const run = inApp ? planReminders({ ...reminder, today, todayDone: info.todayDone, streak: info.current }) : cancelReminders();
    run.catch(() => {});
  }, [inApp, reminder, today, info.todayDone, info.current]);

  const record = useCallback(
    (n = 1) => {
      const key = dayKey(new Date());
      if (key !== today) setToday(key);
      const prev = daysRef.current.get(key);
      const next: Day = { day: key, exercises: (prev?.exercises ?? 0) + n, goal: prev?.goal ?? goal };
      db.saveActivity(key, next.exercises, next.goal);
      scheduleSync();
      const map = new Map(daysRef.current).set(key, next);
      daysRef.current = map;
      setDays(map);
      if (!isMet(prev) && isMet(next)) {
        const before = computeStreak(new Map(map).set(key, { ...next, exercises: 0 }), key);
        const after = computeStreak(map, key);
        setCelebration({ streak: after.current, milestone: milestoneAt(after.current), freezeEarned: after.freezes > before.freezes });
      }
    },
    [goal, today]
  );

  const setGoal = useCallback((g: number) => {
    db.setSetting('dailyGoal', String(g));
    setGoalState(g);
    // Applies to today too, unless today is already done (then from tomorrow).
    const key = dayKey(new Date());
    const cur = daysRef.current.get(key);
    if (cur && !isMet(cur)) {
      const next = { ...cur, goal: g };
      db.saveActivity(key, next.exercises, g);
      scheduleSync();
      setDays(new Map(daysRef.current).set(key, next));
    }
  }, []);

  const setReminder = useCallback(async (r: Reminder) => {
    const ok = r.enabled ? await ensurePermission() : true;
    const value = { ...r, enabled: r.enabled && ok };
    db.setSetting('reminderEnabled', value.enabled ? '1' : '0');
    db.setSetting('reminderHour', String(value.hour));
    db.setSetting('reminderMinute', String(value.minute));
    setReminderState(value);
    setUnset(false);
    return ok;
  }, []);

  const dismissCelebration = useCallback(() => setCelebration(null), []);

  const value = useMemo(
    () => ({ today, days, goal, done, info, reminder, reminderUnset, celebration, record, setGoal, setReminder, dismissCelebration }),
    [today, days, goal, done, info, reminder, reminderUnset, celebration, record, setGoal, setReminder, dismissCelebration]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActivity() {
  const a = useContext(Ctx);
  if (!a) throw new Error('useActivity outside ActivityProvider');
  return a;
}
