import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkExact } from './answer.ts';

test('checkExact keeps Italian short words', () => {
  assert.equal(checkExact('a', ['a']), 'correct');
  assert.equal(checkExact('casa', ['a casa']), 'wrong');
  assert.equal(checkExact('il', ['i']), 'wrong');
});

test('checkExact ignores case, spaces and curly apostrophes', () => {
  assert.equal(checkExact('  Dall’ ', ["dall'"]), 'correct');
  assert.equal(checkExact('Sono  andato', ['sono andato']), 'correct');
});

test('checkExact: accents only → close', () => {
  assert.equal(checkExact('parlero', ['parlerò']), 'close');
  assert.equal(checkExact('e', ['è']), 'close');
});
