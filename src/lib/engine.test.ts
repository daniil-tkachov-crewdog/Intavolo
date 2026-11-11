import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAnswer, createProgress, isDue, HOUR, DAY, type Progress } from './engine.ts';
import { checkAnswer } from './answer.ts';

const T0 = 1_700_000_000_000;

function answerTimes(p: Progress, n: number, start: number) {
  let t = start;
  for (let i = 0; i < n; i++) {
    p = applyAnswer(p, 'correct', t).progress;
    t += HOUR;
  }
  return { p, t };
}

test('counts once per hour', () => {
  let p = createProgress(1, 'new', T0);
  p = applyAnswer(p, 'correct', T0).progress;
  assert.equal(p.count, 1);
  p = applyAnswer(p, 'correct', T0 + HOUR - 1).progress;
  assert.equal(p.count, 1);
  assert.equal(isDue(p, T0 + HOUR), true);
  p = applyAnswer(p, 'correct', T0 + HOUR).progress;
  assert.equal(p.count, 2);
});

test('hint, accent slip and mistakes do not count or reset', () => {
  let p = applyAnswer(createProgress(1, 'familiar', T0), 'correct', T0).progress;
  for (const o of ['hinted', 'close', 'wrong'] as const) {
    p = applyAnswer(p, o, T0 + 2 * HOUR).progress;
    assert.equal(p.count, 1);
  }
});

test('levels up New 10 -> Familiar 10 -> Fluent 15 -> Mastered', () => {
  let { p, t } = answerTimes(createProgress(1, 'new', T0), 10, T0);
  assert.equal(p.status, 'familiar');
  ({ p, t } = answerTimes(p, 10, t));
  assert.equal(p.status, 'fluent');
  ({ p, t } = answerTimes(p, 14, t));
  assert.equal(p.status, 'fluent');
  ({ p } = answerTimes(p, 1, t));
  assert.equal(p.status, 'mastered');
  assert.ok(p.nextReviewAt! > t);
});

test('Mastered: reviewed later, wrong answer drops to Fluent', () => {
  let p = createProgress(1, 'mastered', T0);
  assert.equal(isDue(p, T0), false);
  assert.equal(isDue(p, T0 + DAY), true);
  p = applyAnswer(p, 'correct', T0 + DAY).progress;
  assert.equal(p.status, 'mastered');
  assert.equal(p.nextReviewAt, T0 + DAY + 3 * DAY);
  const r = applyAnswer(p, 'wrong', T0 + 10 * DAY);
  assert.equal(r.progress.status, 'fluent');
  assert.equal(r.progress.count, 0);
  assert.equal(r.demoted, true);
});

test('answer check', () => {
  assert.equal(checkAnswer(' Città ', ['città']), 'correct');
  assert.equal(checkAnswer('citta', ['città']), 'close');
  assert.equal(checkAnswer('perche', ['perché']), 'close');
  assert.equal(checkAnswer('talk', ['to speak', 'to talk']), 'correct');
  assert.equal(checkAnswer('to speak', ['to speak']), 'correct');
  assert.equal(checkAnswer('house!', ['house', 'home']), 'correct');
  assert.equal(checkAnswer('dog', ['house']), 'wrong');
});
