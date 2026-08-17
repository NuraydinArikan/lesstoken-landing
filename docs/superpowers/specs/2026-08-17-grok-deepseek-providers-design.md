# Grok + DeepSeek Providers — Design

**Date:** 2026-08-17
**Status:** Approved (via clarifying-question flow + user's own manifest.json edit)
**Repo:** lesstoken-landing, `extension/` only

## Why

The extension supports OpenAI, Claude and Gemini. Both Grok (x.ai) and
DeepSeek expose OpenAI-compatible chat completions APIs with self-serve API
keys — the same "paste your key, extension calls the provider directly, no
server in the middle" model the existing three already use. Live CORS
preflight and POST tests from the extension's real `chrome-extension://`
origin confirm both permit the request (`access-control-allow-origin: *` for
x.ai, the exact extension origin for DeepSeek) — unlike Ollama, which 403s by
default and would need per-user local reconfiguration.

## Scope

- `extension/` only. The desktop app (separate repo, `LessTokenDesktop`) is
  out of scope — adding providers there is a distinct, larger decision.
- Copilot: **ruled out**. No self-serve API key for its completion engine;
  the SDK route requires OAuth/GitHub App auth, a different shape entirely.
- Ollama: **ruled out for this pass**. The blocker (default CORS rejection,
  requiring the user to set `OLLAMA_ORIGINS` and restart their own Ollama
  server) is a different category of cost from a pasted key. Revisit
  separately if wanted.
- Ships as part of v1.0.1, bundled with the already-merged Ollama removal and
  the new store description text (`extension/manifest.json` already updated:
  `version: 1.0.1`, new `description`).

## Model IDs

| Provider | Model | Why |
|---|---|---|
| Grok | `grok-4.6` | Verified live against x.ai's own docs (Aug 2026). No floating "latest" alias offered, so pinned — same pattern as the existing OpenAI (`gpt-4.1`) and Claude (`claude-opus-5`) entries. |
| DeepSeek | `deepseek-chat` | DeepSeek's own floating alias for their current general-purpose model — same pattern as Gemini's `gemini-flash-latest`. Not `deepseek-reasoner` (that's a chain-of-thought model; this task is text rewriting, not reasoning). |

## Files touched

| File | Change |
|---|---|
| `extension/manifest.json` | Done: `version`, `description`. Still needed: `host_permissions` += `https://api.x.ai/*`, `https://api.deepseek.com/*` |
| `extension/background.js` | Two new `case` branches in the provider switch; two new functions `optimizeWithGrok`, `optimizeWithDeepSeek`, modeled on `optimizeWithOpenAI` (same request/response shape, different base URL + model) |
| `extension/popup.html` | Two new `<option>` in `#provider`, appended after the existing three |
| `extension/options.html` | Two new `<option>` in `#provider`; two new `.form-group` blocks (password input + help text) for the API keys, matching the existing three |
| `extension/options.js` | Two new key-input consts; wired into the existing load/save blocks the same way as `openai-key`/`claude-key`/`gemini-key` |
| `lib/supportContent.mjs` | Two FAQ edits, **both locales**: "Which provider should I choose?" (currently says "All three work" / "Üçü de çalışır" — becomes false at 5 providers) and the "Where do I get an API key?" item's `links` array (currently 3 provider links, needs 2 more) |

Storage key convention unchanged: `${provider}-key`, e.g. `grok-key`,
`deepseek-key` — matches how `background.js:93` already reads
`settings[`${provider}-key`]` generically.

Provider order is OpenAI, Claude, Gemini (unchanged), then Grok, then
DeepSeek — appended, not interleaved, everywhere the list appears.

## Explicitly not touched

- `pages/index.jsx`'s general "can I use multiple providers" FAQ
  (`Birden fazla AI sağlayıcı kullanabilir miyim?`) — describes the product
  family as a whole, not a per-surface exhaustive list, and doesn't become
  factually wrong by omission the way the /support "all three work" line
  does.
- Store summary — already decided separately to go generic ("...and more")
  rather than enumerate five providers by name.
- No new test infrastructure for `background.js`. It has zero existing test
  coverage (Chrome-API-dependent service worker code); building a mock
  harness for it is out of proportion to this task. `tests/supportContent.test.mjs`
  already validates the `links` field shape, so the FAQ content edit is
  covered by existing tests without new ones.

## Verification

- `node -e "JSON.parse(...)"` on manifest.json after the host_permissions edit.
- `npm test` — existing `supportContent.test.mjs` must still pass after the
  FAQ content edit (locale parity, link shape, no placeholder text).
- Manual: load the unpacked extension, confirm both new providers appear in
  the popup and options selectors, and that saving+reloading options
  preserves both new keys (mirrors the existing three).
