# Web Paste-to-Resize Image Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public, no-login `/image` page to the `lesstoken-landing` Next.js site where a user pastes an image (Ctrl+V) and gets a resized PNG copied straight back to their clipboard, ready to paste into an AI chat — entirely client-side, zero API cost.

**Architecture:** A pure resize-math helper (`lib/imageResize.js`) computes target dimensions; a new page (`pages/image.jsx`) wires a `paste` event listener → `createImageBitmap` → `<canvas>` draw → `canvas.toBlob('image/png')` → `navigator.clipboard.write`, with a manual retry button as a fallback for browsers with stricter user-activation rules. A small nav link is added to the existing landing page.

**Tech Stack:** Next.js 14 (static export, `pages/` router), React 18, inline styles (matching `pages/app/*.jsx` convention — this repo does not use CSS modules for app-style pages), Tailwind (only for `pages/index.jsx`, which already uses it), browser Canvas API, Clipboard API. No new dependencies.

## Global Constraints

- No backend/API changes — `lib/api.js` and all Railway/Flask code are untouched. (Spec: "Non-goals")
- Resize rule: fit within **1024×768**, preserve aspect ratio, never upscale — identical to the desktop app's `ImageService._resize_image` (`min(maxWidth/w, maxHeight/h, 1.0)`). (Spec: "Architecture" step 4)
- Clipboard output format is **PNG**, never JPEG — Chromium-based chat apps read the clipboard's PNG format specifically. (Spec: "Architecture" step 6)
- Input is paste-only (no file picker, no drag-and-drop); output is clipboard-only (no download link/button). (Spec: "Non-goals")
- No configurable quality/dimension controls — one fixed default, no settings UI. (Spec: "Non-goals")
- `/image` requires no authentication, unlike every page under `pages/app/`. (Spec: "Architecture")
- This repo has no test framework (no Jest/Vitest/RTL in `package.json`) — do not add one for this feature. Pure logic is checked with plain Node assertions; the page itself is verified manually in the Browser pane, matching the spec's own "Testing" section.

---

### Task 1: Resize-math helper

**Files:**
- Create: `lib/imageResize.js`

**Interfaces:**
- Produces: `computeTargetDimensions(width: number, height: number, maxWidth = 1024, maxHeight = 768): { width: number, height: number, scale: number }` — used by Task 2's `pages/image.jsx`.

- [ ] **Step 1: Write the failing check**

Run this — it imports a module that doesn't exist yet:

```bash
node --input-type=module -e "
import assert from 'node:assert/strict';
import { computeTargetDimensions } from './lib/imageResize.js';

assert.deepEqual(computeTargetDimensions(4000, 2500), { width: 1024, height: 640, scale: 0.256 }, 'downscale limited by width');
assert.deepEqual(computeTargetDimensions(1000, 2000), { width: 384, height: 768, scale: 0.384 }, 'downscale limited by height');
assert.deepEqual(computeTargetDimensions(400, 300), { width: 400, height: 300, scale: 1 }, 'never upscale a small image');
assert.deepEqual(computeTargetDimensions(1024, 768), { width: 1024, height: 768, scale: 1 }, 'exact fit is unchanged');

console.log('all checks passed');
"
```

- [ ] **Step 2: Run it to verify it fails**

Expected: `Cannot find module './lib/imageResize.js'` (or similar module-not-found error).

- [ ] **Step 3: Write the implementation**

```js
// lib/imageResize.js
// Same rule as the desktop app's ImageService._resize_image: fit within
// max dimensions, preserve aspect ratio, never upscale.
export function computeTargetDimensions(width, height, maxWidth = 1024, maxHeight = 768) {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    scale,
  };
}
```

- [ ] **Step 4: Run the same command again to verify it passes**

Run the exact command from Step 1.
Expected: `all checks passed` printed, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add lib/imageResize.js
git commit -m "feat: add pure resize-dimension helper for image tool"
```

---

### Task 2: `/image` page — paste, resize, preview

**Files:**
- Create: `pages/image.jsx`

**Interfaces:**
- Consumes: `computeTargetDimensions(width, height, maxWidth, maxHeight)` from Task 1 (`lib/imageResize.js`), imported as `import { computeTargetDimensions } from '../lib/imageResize';`.
- Produces: default-exported React component `ImageResizePage`, rendered at route `/image` (Next.js `pages/image.jsx` → `/image` automatically). Task 3 modifies this same file to add clipboard-write behavior; Task 4 does not depend on this file's internals, only on the route existing.

- [ ] **Step 1: Write the page**

```jsx
// pages/image.jsx
import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { computeTargetDimensions } from '../lib/imageResize';

const MAX_WIDTH = 1024;
const MAX_HEIGHT = 768;

export default function ImageResizePage() {
  const [status, setStatus] = useState('idle'); // idle | processing | done | no-image
  const [previewUrl, setPreviewUrl] = useState(null);
  const [original, setOriginal] = useState(null); // { width, height, bytes }
  const [resized, setResized] = useState(null); // { width, height, bytes }
  const blobRef = useRef(null);

  useEffect(() => {
    const handlePaste = (event) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));
      if (!imageItem) {
        setStatus('no-image');
        return;
      }

      setStatus('processing');
      setPreviewUrl(null);
      blobRef.current = null;

      const sourceBlob = imageItem.getAsFile();

      createImageBitmap(sourceBlob).then((bitmap) => {
        const { width, height } = computeTargetDimensions(bitmap.width, bitmap.height, MAX_WIDTH, MAX_HEIGHT);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);

        canvas.toBlob((resizedBlob) => {
          blobRef.current = resizedBlob;
          setOriginal({ width: bitmap.width, height: bitmap.height, bytes: sourceBlob.size });
          setResized({ width, height, bytes: resizedBlob.size });
          setPreviewUrl(URL.createObjectURL(resizedBlob));
          setStatus('done');
        }, 'image/png');
      });
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const pixelReduction = original && resized
    ? Math.round((1 - (resized.width * resized.height) / (original.width * original.height)) * 100)
    : null;

  return (
    <>
      <Head>
        <title>Görsel Küçült - Less Token</title>
      </Head>
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '12px' }}>
          Görsel Küçült
        </h1>
        <p style={{ color: '#666', marginBottom: '30px', textAlign: 'center', maxWidth: '480px' }}>
          Bir görseli kopyalayın (ekran görüntüsü, resim vb.) ve buraya yapıştırın (Ctrl+V).
          Sunucuya hiçbir şey yüklenmez, işlem tamamen tarayıcınızda yapılır.
        </p>

        <div
          tabIndex={0}
          style={{
            width: '100%',
            maxWidth: '480px',
            minHeight: '200px',
            border: '2px dashed #9ca3af',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          {status === 'idle' && <p style={{ color: '#9ca3af' }}>Buraya tıklayıp Ctrl+V ile yapıştırın</p>}
          {status === 'no-image' && (
            <p style={{ color: '#991b1b' }}>Panoda görsel bulunamadı. Bir görsel kopyalayıp tekrar deneyin.</p>
          )}
          {status === 'processing' && <p style={{ color: '#9ca3af' }}>İşleniyor...</p>}
          {status === 'done' && previewUrl && (
            <img src={previewUrl} alt="Küçültülmüş görsel önizleme" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
          )}
        </div>

        {status === 'done' && original && resized && (
          <div style={{
            marginTop: '20px',
            background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #6ee7b7',
            width: '100%',
            maxWidth: '480px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#047857', fontWeight: '600' }}>Boyut</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#059669', margin: '4px 0 0 0' }}>
                  {original.width}×{original.height} → {resized.width}×{resized.height}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#047857', fontWeight: '600' }}>Piksel Azaltma</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669', margin: '4px 0 0 0' }}>
                  %{pixelReduction}
                </p>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#047857', marginTop: '12px' }}>
              Dosya boyutu: {Math.round(original.bytes / 1024)} KB → {Math.round(resized.bytes / 1024)} KB
            </p>
          </div>
        )}
      </div>
    </>
  );
}
```

Note: the byte-size line is deliberately informational only (no percentage). Re-encoding as PNG can occasionally make a small, already-compressed JPEG source *larger* in bytes even though pixel count drops — the pixel-count reduction is what actually drives AI vision-token cost, so that's the number given a headline percentage.

- [ ] **Step 2: Verify manually in the Browser pane**

Start the dev server (`preview_start` with the `dev` script, or `npm run dev` if no launch config exists yet), navigate to `/image`, and check:
1. Copy a large image (e.g. take a 2000×2000+ screenshot) and paste with Ctrl+V on the page → a resized preview appears, dimensions shown are ≤ 1024×768 with aspect ratio preserved.
2. Copy a small image (e.g. a 200×200 icon) and paste → dimensions are unchanged (no upscale), "Piksel Azaltma" shows `%0`.
3. Copy some plain text (not an image) and paste → the "Panoda görsel bulunamadı" message appears, nothing crashes.

- [ ] **Step 3: Commit**

```bash
git add pages/image.jsx
git commit -m "feat: add paste-to-resize image page (preview only, no clipboard write yet)"
```

---

### Task 3: Copy resized image back to the clipboard

**Files:**
- Modify: `pages/image.jsx`

**Interfaces:**
- Consumes: `blobRef.current` (the resized PNG `Blob` set in Task 2's `toBlob` callback), `status`/`setStatus` from Task 2.
- Produces: `copyState` (`'idle' | 'copied' | 'failed'`) and `copyToClipboard()`, both local to this file — no other task depends on them.

- [ ] **Step 1: Add copy state and the copy function**

In `pages/image.jsx`, add a new state hook next to the existing ones:

```jsx
  const [copyState, setCopyState] = useState('idle'); // idle | copied | failed
```

Add this function inside the component, after the `handlePaste` `useEffect` block:

```jsx
  const copyToClipboard = async () => {
    if (!blobRef.current) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blobRef.current }),
      ]);
      setCopyState('copied');
    } catch (err) {
      setCopyState('failed');
    }
  };
```

- [ ] **Step 2: Reset copy state on each new paste, and auto-copy once resizing finishes**

In the `handlePaste` function from Task 2, find this block:

```jsx
      setStatus('processing');
      setPreviewUrl(null);
      blobRef.current = null;
```

Replace it with:

```jsx
      setStatus('processing');
      setPreviewUrl(null);
      setCopyState('idle');
      blobRef.current = null;
```

Then find the `canvas.toBlob` callback:

```jsx
        canvas.toBlob((resizedBlob) => {
          blobRef.current = resizedBlob;
          setOriginal({ width: bitmap.width, height: bitmap.height, bytes: sourceBlob.size });
          setResized({ width, height, bytes: resizedBlob.size });
          setPreviewUrl(URL.createObjectURL(resizedBlob));
          setStatus('done');
        }, 'image/png');
```

Replace it with (adds the automatic copy attempt, still inside the transient user-activation window opened by the paste gesture):

```jsx
        canvas.toBlob((resizedBlob) => {
          blobRef.current = resizedBlob;
          setOriginal({ width: bitmap.width, height: bitmap.height, bytes: sourceBlob.size });
          setResized({ width, height, bytes: resizedBlob.size });
          setPreviewUrl(URL.createObjectURL(resizedBlob));
          setStatus('done');
          copyToClipboard();
        }, 'image/png');
```

(`copyToClipboard` is defined above `handlePaste` in the component body but is a stable function each render only reads `blobRef.current` at call time, so referencing it here is safe regardless of declaration order at runtime — function declarations inside the component are all created before any event fires.)

- [ ] **Step 3: Add the copy button and failure note to the JSX**

Find the closing of the stats card block from Task 2:

```jsx
            <p style={{ fontSize: '12px', color: '#047857', marginTop: '12px' }}>
              Dosya boyutu: {Math.round(original.bytes / 1024)} KB → {Math.round(resized.bytes / 1024)} KB
            </p>
          </div>
        )}
      </div>
    </>
  );
}
```

Replace it with (adds the button + conditional retry note directly after the stats card, still inside the outermost `<div>`):

```jsx
            <p style={{ fontSize: '12px', color: '#047857', marginTop: '12px' }}>
              Dosya boyutu: {Math.round(original.bytes / 1024)} KB → {Math.round(resized.bytes / 1024)} KB
            </p>
          </div>
        )}

        {status === 'done' && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={copyToClipboard}
              style={{
                padding: '10px 20px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              {copyState === 'copied' ? '✓ Kopyalandı' : '📋 Panoya Kopyala'}
            </button>
            {copyState === 'failed' && (
              <p style={{ fontSize: '12px', color: '#991b1b', marginTop: '8px' }}>
                Otomatik kopyalama başarısız oldu. Yukarıdaki butona tekrar tıklayın.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 4: Verify manually in the Browser pane**

Restart/reload the dev server preview at `/image` and check:
1. Copy an image, paste it → button reads "✓ Kopyalandı" without clicking anything (auto-copy succeeded in Chromium).
2. Open an actual chat surface that accepts pasted images (e.g. https://claude.ai or ChatGPT) in another tab, paste there with Ctrl+V, and confirm the resized image actually appears — this is the only real proof the clipboard PNG format is readable by a Chromium-based app (this exact class of bug was fixed for the desktop app before).
3. Click "📋 Panoya Kopyala" manually after the auto-copy already ran, and confirm it still works (button stays functional, doesn't error on repeat clicks).

- [ ] **Step 5: Commit**

```bash
git add pages/image.jsx
git commit -m "feat: copy resized image to clipboard automatically, with manual retry button"
```

---

### Task 4: Landing page nav link

**Files:**
- Modify: `pages/index.jsx:12` (tr locale `nav` object)
- Modify: `pages/index.jsx:91` (en locale `nav` object)
- Modify: `pages/index.jsx:231-236` (nav markup, the `download` link)

**Interfaces:**
- Consumes: nothing from other tasks — only requires that the `/image` route exists (Task 2).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Add the nav label to both locales**

Find (line 12):

```jsx
    nav: { logo: "Less Token", download: "İndir" },
```

Replace with:

```jsx
    nav: { logo: "Less Token", imageTool: "Görsel Küçült", download: "İndir" },
```

Find (line 91):

```jsx
    nav: { logo: "Less Token", download: "Download" },
```

Replace with:

```jsx
    nav: { logo: "Less Token", imageTool: "Shrink Image", download: "Download" },
```

- [ ] **Step 2: Add the link in the nav markup**

Find:

```jsx
            <a
              href="#download"
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition"
            >
              {i18n?.nav?.download}
            </a>
```

Replace with:

```jsx
            <a
              href="/image"
              className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition"
            >
              {i18n?.nav?.imageTool}
            </a>
            <a
              href="#download"
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition"
            >
              {i18n?.nav?.download}
            </a>
```

- [ ] **Step 3: Verify manually in the Browser pane**

Reload `/` in the Browser pane and check:
1. The nav shows "Görsel Küçült" (TR, default) between the language toggle and the "İndir" button.
2. Click the EN toggle → label switches to "Shrink Image".
3. Click the new link → navigates to `/image` and the page from Task 2/3 loads.

- [ ] **Step 4: Commit**

```bash
git add pages/index.jsx
git commit -m "feat: link the image-resize tool from the landing page nav"
```

---

## Self-Review

**Spec coverage:**
- Route `/image`, no auth → Task 2 (new page, no auth check added, unlike `pages/app/*`).
- Paste-only input, no file picker/drag-drop → Task 2 `handlePaste`, nothing else wired to file input.
- 1024×768 fit, no upscale, matching desktop algorithm → Task 1 `computeTargetDimensions`, asserted against desktop's exact formula in the code comment.
- PNG output, not JPEG → Task 2 `canvas.toBlob(..., 'image/png')`.
- Clipboard-write-only output, no download button → Task 3, no `<a download>` or save button anywhere.
- Auto-copy + manual fallback button → Task 3 Steps 1–3.
- No-image-on-clipboard message → Task 2 `status === 'no-image'` branch.
- Already-small-image handling (skip resize, still copy as PNG) → Task 1's `scale` clamps to 1 (no upscale), Task 2 still runs the same `toBlob`/copy path regardless of scale, so a small image is still re-encoded to PNG and copied — no special-casing needed since the resize step is a no-op by construction.
- `clipboard.write` failure → Task 3 `catch` branch → `copyState === 'failed'` note.
- No configurable settings UI → confirmed absent from all task code.
- No backend/API change → confirmed, no task touches `lib/api.js` or `web/`.
- Nav link discoverability → Task 4.
- Dashboard NOT touched → confirmed, no task modifies `pages/app/dashboard.jsx`.

**Placeholder scan:** No TBD/TODO markers; every step has complete, runnable code.

**Type consistency:** `computeTargetDimensions` signature (`width, height, maxWidth, maxHeight` → `{ width, height, scale }`) is identical between its Task 1 definition and Task 2's call site. `blobRef`, `status`, `setStatus`, `original`, `resized`, `previewUrl` are defined once in Task 2 and referenced with matching names in Task 3 — no renames introduced.

---

Plan complete and saved to `docs/superpowers/plans/2026-07-27-web-image-paste-resize.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
