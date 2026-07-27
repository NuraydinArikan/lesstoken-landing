# Web App: Paste-to-Resize Image Tool

Date: 2026-07-27
Status: Approved

## Problem

The desktop app shrinks images before they're sent to AI chat tools (resize +
recompress, then write back to the clipboard). The web app has no equivalent
— it only optimizes pasted text. Users who want the same benefit in the
browser currently have no option.

## Goal

A public, no-login page where a user pastes an image from their clipboard
(Ctrl+V) and gets back a resized image on their clipboard, ready to paste
into ChatGPT/Claude/Gemini/etc. Entirely client-side: no upload, no backend
call, zero marginal API cost.

## Non-goals (explicitly out of scope for this iteration)

- File picker or drag-and-drop input — paste is the only input method.
- Download-to-disk output — clipboard write is the only output.
- Configurable quality/dimension controls — one fixed, sensible default.
- OCR / text extraction.
- Any backend or database change.

## Architecture

New static page, no auth: `pages/image.jsx` → route `/image` in the
`lesstoken-landing` Next.js app (static export, same as the rest of the
site). No new API routes; `lib/api.js` is untouched.

### Flow

1. Page renders a paste target ("Buraya bir görsel yapıştırın — Ctrl+V") and
   listens for the `paste` event on the document.
2. On paste, read the image `Blob` from `event.clipboardData.items` (first
   item whose `type` starts with `image/`). If none found, show an inline
   message and do nothing else.
3. Decode with `createImageBitmap(blob)`.
4. Compute target dimensions using the same rule as the desktop
   `ImageService._resize_image`: fit within **1024×768**, preserve aspect
   ratio, **never upscale** (`scale = min(1024/w, 768/h, 1.0)`).
5. Draw the bitmap onto an offscreen `<canvas>` sized to the target
   dimensions.
6. Export via `canvas.toBlob(cb, 'image/png')`. PNG, not JPEG — Chromium-
   based chat apps (ChatGPT/Claude/Gemini web, Discord, Slack, Teams) read
   the clipboard's PNG format specifically; this was the exact bug fixed in
   the desktop app (memory: `lesstoken` bug #11), and the same constraint
   applies to a browser `ClipboardItem`.
7. Immediately attempt
   `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])`
   — still within the transient user-activation window opened by the paste
   gesture, so this succeeds in Chromium browsers without a further click.
8. Always render an explicit **"📋 Panoya Kopyala"** button wired to the same
   write call, using the blob already held in memory. This is the fallback
   for browsers (Safari/Firefox) whose activation rules are stricter or
   where the automatic attempt silently fails — a real click always
   satisfies the browser's user-activation requirement.
9. Show a result summary: original vs. resized pixel dimensions, original vs.
   resized byte size, and a percentage reduction — reusing the visual style
   of the stats card already in `pages/app/optimize.jsx`.

### Edge cases

- **No image on clipboard**: inline message, no crash, no partial UI state.
- **Image already ≤ 1024×768**: skip the resize step (`scale === 1.0`), but
  still re-encode as PNG and offer the copy button — small images still need
  to land on the clipboard in the PNG format Chromium apps expect.
- **`clipboard.write` throws** (permissions, unsupported browser): caught,
  swallowed into a small inline note ("otomatik kopyalama başarısız oldu,
  butona tekrar tıklayın"), button stays clickable for retry. Never a hard
  failure — the resized preview `<img>` remains visible either way, so as a
  last resort the user can right-click → copy/save it directly from the
  browser.

### Discoverability

Add one nav link on the landing page (`pages/index.jsx`), next to the
existing EN/TR toggle and download button, using the same inline
`localesData` i18n object the nav already reads from (`nav.imageTool` in
both `tr` and `en` blocks). No changes to the dashboard's action-card
row (`pages/app/dashboard.jsx`) — that surface requires login and this tool
deliberately doesn't.

## Testing

Since there's no backend and no test suite covering the Next.js pages today,
verification is manual in the Browser pane:
1. Copy a large screenshot (e.g. 4000×2500) → paste on `/image` → confirm
   resized dimensions ≤ 1024×768, aspect ratio preserved, no upscale on a
   small source image.
2. Paste into an actual chat surface (this is the only way to confirm the
   clipboard PNG format is really readable by Chromium apps — see bug #11)
   and confirm the image appears.
3. Paste non-image clipboard content and confirm the inline "no image found"
   message, not a crash.
4. Click "Panoya Kopyala" manually and confirm it still works after the
   automatic attempt.
