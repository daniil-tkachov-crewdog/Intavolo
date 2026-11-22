// Daily goal + streak rules. Pure functions (unit-tested with node:test).

/** One calendar day of practice (local date, YYYY-MM-DD). */
export interface Day {
  day: string;
  exercises: number;
  goal: number;
}

export type DayStatus = 'done' | 'frozen';

export interface StreakInfo {
  current: number;
  longest: number;
  freezes: number;
  todayDone: boolean;
  status: Map<string, DayStatus>;
}

export const GOALS = [5, 10, 20, 30] as const;
export const DEFAULT_GOAL = 10;
export const START_FREEZES = 1;
export const MAX_FREEZES = 2;
/** A freeze is earned every N goal days. */
export const FREEZE_EVERY = 7;
export const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365, 500, 1000];

const pad = (n: number) => String(n).padStart(2, '0');

export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Local Date at midnight for a day key. */
export const parseDay = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (key: string, n: number) => {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
};

export const isMet = (d: Day | undefined) => !!d && d.goal > 0 && d.exercises >= d.goal;

/**
 * Walks every day from the first goal day to today.
 * Goal met → streak +1 (every 7th goal day earns a freeze, max 2).
 * Missed day while a streak is alive → a freeze is used if there is one, otherwise the streak resets.
 * Today never breaks the streak; it only adds to it once the goal is met.
 */
export function computeStreak(days: Map<string, Day>, today: string): StreakInfo {
  const status = new Map<string, DayStatus>();
  let first: string | null = null;
  for (const d of days.values()) if (isMet(d) && d.day <= today && (!first || d.day < first)) first = d.day;

  let current = 0;
  let longest = 0;
  let freezes = START_FREEZES;
  let goalDays = 0;
  if (!first) return { current, longest, freezes, todayDone: false, status };

  const met = (key: string) => {
    current++;
    goalDays++;
    if (goalDays % FREEZE_EVERY === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
    longest = Math.max(longest, current);
    status.set(key, 'done');
  };

  for (let key = first; key < today; key = addDays(key, 1)) {
    if (isMet(days.get(key))) met(key);
    else if (current > 0 && freezes > 0) {
      freezes--;
      status.set(key, 'frozen');
    } else current = 0;
  }
  const todayDone = isMet(days.get(today));
  if (todayDone) met(today);
  return { current, longest, freezes, todayDone, status };
}

/** Milestone reached exactly at this streak length, if any. */
export const milestoneAt = (streak: number) => MILESTONES.includes(streak) || (streak > 1000 && streak % 100 === 0);
