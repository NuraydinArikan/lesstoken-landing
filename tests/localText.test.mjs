import test from 'node:test';
import assert from 'node:assert/strict';
import { localClean } from '../lib/localText.js';

test('collapses repeated spaces and trims', () => {
  assert.equal(localClean('  merhaba   dünya  '), 'merhaba dünya');
});

test('preserves paragraph breaks but collapses blank-line runs', () => {
  assert.equal(localClean('a\n\n\n\nb'), 'a\n\nb');
});

test('normalizes whitespace within lines', () => {
  assert.equal(localClean('satır  bir\t\tdevam\nsatır iki'), 'satır bir devam\nsatır iki');
});

test('empty input returns empty string', () => {
  assert.equal(localClean('   '), '');
});
