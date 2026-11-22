import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, computeStreak, type Day } from './streak.ts';

const T = '2026-03-10';
const days = (spec: Record<string, number>, goal = 10) =>
  new Map<string, Day>(Object.entries(spec).map(([day, exercises]) => [day, { day, exercises, goal }]));

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(addDays('2025-12-31', 1), '2026-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('no activity → empty streak with starter freeze', () => {
  const s = computeStreak(new Map(), T);
  assert.deepEqual([s.current, s.longest, s.freezes, s.todayDone], [0, 0, 1, false]);
});

test('consecutive goal days count; today pending keeps the streak', () => {
  const s = computeStreak(days({ '2026-03-07': 10, '2026-03-08': 12, '2026-03-09': 10 }), T);
  assert.equal(s.current, 3);
  assert.equal(s.todayDone, false);
  const s2 = computeStreak(days({ '2026-03-08': 10, '2026-03-09': 10, [T]: 10 }), T);
  assert.equal(s2.current, 3);
  assert.equal(s2.todayDone, true);
});

test('below-goal day counts as missed', () => {
  const s = computeStreak(days({ '2026-03-06': 10, '2026-03-07': 3, '2026-03-08': 3, '2026-03-09': 10 }), T);
  assert.equal(s.current, 1); // 7th frozen, 8th breaks
  assert.equal(s.status.get('2026-03-07'), 'frozen');
  assert.equal(s.longest, 1);
});

test('one missed day is covered by the starter freeze', () => {
  const s = computeStreak(days({ '2026-03-07': 10, '2026-03-09': 10 }), T);
  assert.equal(s.current, 2);
  assert.equal(s.freezes, 0);
  assert.equal(s.status.get('2026-03-08'), 'frozen');
});

test('7 goal days earn a freeze, capped at 2', () => {
  const spec: Record<string, number> = {};
  for (let i = 1; i <= 21; i++) spec[addDays('2026-02-17', i)] = 10; // Feb 18 → Mar 10
  const s = computeStreak(days(spec), T);
  assert.equal(s.current, 21);
  assert.equal(s.freezes, 2);
  assert.equal(s.todayDone, true);
});

test('goal is per day: raising it later does not rewrite history', () => {
  const m = days({ '2026-03-08': 5, '2026-03-09': 5 }, 5);
  m.set(T, { day: T, exercises: 5, goal: 20 });
  const s = computeStreak(m, T);
  assert.equal(s.current, 2);
  assert.equal(s.todayDone, false);
});
