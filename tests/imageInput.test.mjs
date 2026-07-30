import { test } from 'node:test';
import assert from 'node:assert/strict';

import { classifyFile } from '../lib/imageInput.mjs';

test('ignores a missing file, as when the picker is cancelled', () => {
  assert.equal(classifyFile(null), 'ignore');
  assert.equal(classifyFile(undefined), 'ignore');
});

test('rejects a non-image file', () => {
  assert.equal(classifyFile({ type: 'application/pdf' }), 'not-image');
  assert.equal(classifyFile({ type: 'text/plain' }), 'not-image');
});

test('rejects a file whose type the browser could not determine', () => {
  assert.equal(classifyFile({ type: '' }), 'not-image');
  assert.equal(classifyFile({}), 'not-image');
});

test('accepts the image types the picker offers', () => {
  for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/gif']) {
    assert.equal(classifyFile({ type }), 'process', type);
  }
});
