import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesTiles, matchesTranslation, tiles } from './translate.ts';

const T = ["It's all going to be OK.", 'Everything will be fine.', "I don't know."];

test('any known translation is accepted', () => {
  assert.ok(matchesTranslation('everything will be fine', T));
  assert.ok(matchesTranslation("It's all going to be OK", T));
});

test('case, punctuation and curly apostrophes are ignored', () => {
  assert.ok(matchesTranslation('  EVERYTHING will be fine!!! ', T));
  assert.ok(matchesTranslation('it’s all going to be ok', T));
});

test('contractions are expanded', () => {
  assert.ok(matchesTranslation('it is all going to be ok', T));
  assert.ok(matchesTranslation('I do not know', T));
  assert.ok(matchesTranslation("I can't swim", ['I cannot swim.']));
  assert.ok(matchesTranslation('I will not go', ["I won't go."]));
  assert.ok(matchesTranslation("He's eaten", ['He has eaten.']));
});

test('spelling variants, equivalents and numbers', () => {
  assert.ok(matchesTranslation('My favourite colour is grey', ['My favorite color is gray.']));
  assert.ok(matchesTranslation('We watched a movie', ['We watched a film.']));
  assert.ok(matchesTranslation('I have 3 cats', ['I have three cats.']));
  assert.ok(matchesTranslation('it is okay', ["It's OK."]));
});

test('different meaning is not accepted', () => {
  assert.equal(matchesTranslation('Everything will be bad', T), false);
  assert.equal(matchesTranslation('', T), false);
  assert.equal(matchesTranslation('fine', T), false);
});

test('tiles', () => {
  assert.deepEqual(tiles("I don't know, Tom."), ['I', "don't", 'know', 'Tom']);
  assert.ok(matchesTiles(['I', "don't", 'know'], T));
  assert.equal(matchesTiles(["don't", 'I', 'know'], T), false);
});
