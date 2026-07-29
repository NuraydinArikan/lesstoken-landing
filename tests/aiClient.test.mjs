import test from 'node:test';
import assert from 'node:assert/strict';
import { OPERATIONS, buildPrompt, extractText, DEFAULT_MODELS } from '../lib/aiClient.mjs';

test('has the same 7 operations as the desktop app, in order', () => {
  assert.deepEqual(
    OPERATIONS.map((o) => o.key),
    ['clean', 'shorten', 'formal', 'summarize', 'bullets', 'translate_en', 'email']
  );
});

test('buildPrompt matches the desktop prompt shape', () => {
  const p = buildPrompt('clean', 'abc');
  assert.equal(
    p,
    'Clean up spelling, grammar, and clarity.\n' +
      "Return only the final text. Keep the user's language unless translation is requested.\n\n" +
      'Text:\nabc'
  );
});

test('extractText reads each provider response shape', () => {
  assert.equal(extractText('openai', { choices: [{ message: { content: 'x' } }] }), 'x');
  assert.equal(extractText('claude', { content: [{ type: 'text', text: 'y' }] }), 'y');
  assert.equal(
    extractText('gemini', { candidates: [{ content: { parts: [{ text: 'z' }] } }] }),
    'z'
  );
});

test('default models are pinned', () => {
  assert.deepEqual(DEFAULT_MODELS, {
    openai: 'gpt-5.6-luna',
    claude: 'claude-haiku-4-5-20251001',
    gemini: 'gemini-3.5-flash-lite',
  });
});
