// Learning rules. Pure functions, no React Native imports (unit-tested with node:test).

export type Status = 'new' | 'familiar' | 'fluent' | 'mastered';
export type Outcome = 'correct' | 'close' | 'hinted' | 'wrong';

export interface Progress {
  wordId: number;
  status: Status;
  count: number;
  lastCountedAt: number | null;
  nextReviewAt: number | null; // Mastered only
  reviewStep: number; // Mastered only
}

export const STATUSES: Status[] = ['new', 'familiar', 'fluent', 'mastered'];
export const STATUS_LABEL: Record<Status, string> = {
  new: 'New',
  familiar: 'Familiar',
  fluent: 'Fluent',
  mastered: 'Mastered',
};
export const GOALS: Record<Exclude<Status, 'mastered'>, number> = { new: 10, familiar: 10, fluent: 15 };
export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
export const REVIEW_DAYS = [1, 3, 7, 14, 30];

const NEXT: Record<Exclude<Status, 'mastered'>, Status> = { new: 'familiar', familiar: 'fluent', fluent: 'mastered' };

const reviewAt = (now: number, step: number) => now + REVIEW_DAYS[Math.min(step, REVIEW_DAYS.length - 1)] * DAY;

export function createProgress(wordId: number, status: Status, now: number): Progress {
  return {
    wordId,
    status,
    count: 0,
    lastCountedAt: null,
    nextReviewAt: status === 'mastered' ? reviewAt(now, 0) : null,
    reviewStep: 0,
  };
}

/** Can this word earn a count (or be reviewed) right now? */
export function isDue(p: Progress, now: number): boolean {
  if (p.status === 'mastered') return p.nextReviewAt !== null && p.nextReviewAt <= now;
  return p.lastCountedAt === null || now - p.lastCountedAt >= HOUR;
}

/** When this word becomes due next. */
export function dueAt(p: Progress): number {
  if (p.status === 'mastered') return p.nextReviewAt ?? 0;
  return p.lastCountedAt === null ? 0 : p.lastCountedAt + HOUR;
}

export interface AnswerResult {
  progress: Progress;
  counted: boolean;
  leveledUp: boolean;
  demoted: boolean;
}

export function applyAnswer(p: Progress, outcome: Outcome, now: number): AnswerResult {
  const none = { progress: p, counted: false, leveledUp: false, demoted: false };

  if (p.status === 'mastered') {
    if (outcome === 'wrong') {
      return { ...none, progress: { ...p, status: 'fluent', count: 0, lastCountedAt: null, nextReviewAt: null, reviewStep: 0 }, demoted: true };
    }
    if (outcome === 'correct' && isDue(p, now)) {
      const step = p.reviewStep + 1;
      return { ...none, progress: { ...p, reviewStep: step, nextReviewAt: reviewAt(now, step) }, counted: true };
    }
    return none;
  }

  // Mistakes, hints and accent slips never count and never reset.
  if (outcome !== 'correct' || !isDue(p, now)) return none;

  const count = p.count + 1;
  if (count < GOALS[p.status]) {
    return { ...none, progress: { ...p, count, lastCountedAt: now }, counted: true };
  }
  const status = NEXT[p.status];
  return {
    progress: {
      ...p,
      status,
      count: 0,
      lastCountedAt: now,
      nextReviewAt: status === 'mastered' ? reviewAt(now, 0) : null,
      reviewStep: 0,
    },
    counted: true,
    leveledUp: true,
    demoted: false,
  };
}
