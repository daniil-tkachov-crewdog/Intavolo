import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchWords } from './search.ts';

const W = [
  { id: 1, it: 'casa', en: 'house', alt: ['home'] },
  { id: 2, it: 'casale', en: 'farmhouse', alt: [] },
  { id: 3, it: 'città', en: 'city', alt: ['town'] },
  { id: 4, it: 'parlare', en: 'to speak', alt: ['to talk'] },
  { id: 5, it: 'abitazione', en: 'home', alt: ['dwelling'] },
];
const ids = (q: string) => searchWords(W, q).map((w) => w.id);

test('Italian exact first, then prefix', () => assert.deepEqual(ids('casa'), [1, 2]));
test('accents ignored', () => assert.deepEqual(ids('citta'), [3]));
test('English, ignoring "to"', () => assert.deepEqual(ids('speak'), [4]));
test('English side translations', () => assert.deepEqual(ids('home'), [1, 5]));
test('English contains', () => assert.deepEqual(ids('house'), [1, 2]));
test('empty query', () => assert.deepEqual(ids('  '), []));
