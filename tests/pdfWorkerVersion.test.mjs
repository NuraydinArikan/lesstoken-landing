import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test('vendored PDF worker version matches the pinned pdfjs-dist dependency', () => {
  const pkg = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const pinnedVersion = pkg.dependencies['pdfjs-dist'];
  // Must be an exact pin (no ^, ~, or range) -- pdf.js throws at runtime on
  // any API/worker version mismatch, and the worker is a hand-copied file
  // that npm will never update automatically.
  assert.match(pinnedVersion, /^\d+\.\d+\.\d+$/,
    `pdfjs-dist must be pinned to an exact version, got "${pinnedVersion}"`);

  const worker = readFileSync(path.join(rootDir, 'public', 'pdf.worker.min.mjs'), 'utf8');
  assert.ok(worker.includes(pinnedVersion),
    `public/pdf.worker.min.mjs does not contain the pinned version "${pinnedVersion}" -- ` +
    `it needs to be re-copied from node_modules/pdfjs-dist/build/pdf.worker.min.mjs`);
});
