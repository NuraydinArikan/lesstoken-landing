# PDF + CSV Support for /file — Design

**Date:** 2026-08-17
**Status:** Approved
**Repo:** lesstoken-landing (Next.js static export, Vercel → lesstoken.app)
**Scope:** `pages/file.jsx` (the no-account web tool) only. Extension and desktop app are separate surfaces, not touched here.

## Why

`/file` currently reads `.txt`, `.md`, and `.docx`. Users asked whether PDF and
other formats could be added. PDF is the clear next format — extremely common,
and the `/support` FAQ already claims the tool is limited to the current
three, which becomes actively wrong the moment this ships if left unedited
(the same class of mistake already caught once this session: shipped copy
that doesn't match the product).

## Scope decisions

1. **PDF and CSV this round. RTF explicitly deferred.** Researched RTF
   parsing libraries live: the most current option (`rtf-stream-parser`) is
   built for Outlook/Exchange email bodies, not general RTF documents; the
   only general-purpose option (`rtf-parser`) hasn't been updated in 7 years.
   Neither is at the reliability bar `mammoth` (docx) or `pdfjs-dist` (PDF)
   already clear. RTF gets its own decision once a real candidate library has
   been tested against actual RTF files, not bundled into this spec on
   optimism.
2. **CSV is a one-line addition.** CSV is already plain text — it goes
   through the exact same `file.text()` path as `.txt`/`.md`, added to the
   `TEXT_EXTENSIONS` array. No parsing, no header/delimiter detection. The
   file lands in the textarea comma-separated, exactly as it exists on disk.
3. **PDF size cap: the existing 2MB limit, unchanged.** A text-heavy PDF
   (the kind this tool is for) is typically a few hundred KB. A PDF well over
   2MB is more likely to be scanned/image-heavy — which returns no extractable
   text anyway (see below) — so a separate, larger cap would mostly just let
   through files that fail for an unrelated reason. Not worth the complexity.

## PDF extraction

**Library: `pdfjs-dist`** (Mozilla's PDF.js, the same engine behind Chrome's
and Firefox's built-in PDF viewers). Runs entirely client-side — required to
keep the "we have no servers in this path at all" promise repeated throughout
this codebase's copy.

**Worker file handling — the one real integration risk, resolved.**
`pdfjs-dist` requires a separate worker script, and its file layout (worker
scripts, WASM binaries, legacy build variants) is exactly what trips up
Next.js's automatic file tracing in *standalone* server builds, per current
reports. That failure mode doesn't apply here — this project is
`output: 'export'` (fully static), so there is no server-side tracer to miss
anything. The chosen approach sidesteps the whole class of problem anyway:
the worker file is copied into `public/` as a plain static asset (the same
mechanism already serving `mark.svg`, favicons, etc.) and referenced by a
hardcoded absolute path via `GlobalWorkerOptions.workerSrc`, rather than
relying on any bundler auto-discovery.

Verified live against the package's actual published build output (unpkg,
`pdfjs-dist@6.2.108`): the worker ships as `pdf.worker.min.mjs`. `pdfjs-dist`
moved to ESM-only in recent major versions, so older `.js` worker filenames
found in older tutorials no longer apply. Re-confirm the filename in
`node_modules/pdfjs-dist/build/` at implementation time in case the version
that resolves differs from 6.2.108.

**Integration shape**, mirroring the existing `mammoth` branch in
`pages/file.jsx`'s `readFile()`:

```js
} else if (ext === 'pdf') {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map(item => item.str).join(' '));
  }
  const extracted = pages.join('\n\n');
  if (!extracted.trim()) {
    setStatus('empty');
  } else {
    setText(extracted);
    setStatus('done');
  }
}
```

**Scanned/image-only PDFs get their own status, not a silent empty box.**
A PDF with no embedded text layer (a phone-camera scan, an image-only export)
will parse successfully but yield nothing. That's not an error — the code
path all works — so it doesn't belong in the existing `'error'` state. It's a
new `status: 'empty'`, with copy that says what actually happened:
*"Bu PDF'te çıkarılabilir metin bulunamadı — muhtemelen taranmış bir belge."*
(EN: *"No extractable text found in this PDF — it's likely a scanned
document."*) A generic blank textarea would leave the user guessing whether
the tool is broken.

## Files touched

| File | Change |
|---|---|
| `package.json` | add `pdfjs-dist` dependency |
| `public/pdf.worker.min.mjs` | new static asset, copied from the installed package |
| `pages/file.jsx` | `TEXT_EXTENSIONS` gains `'csv'`; new `pdf` branch in `readFile()`; new `'empty'` status rendered alongside the existing `unsupported`/`error`/`toolarge` messages; `accept` attribute on the file input becomes `.txt,.md,.docx,.csv,.pdf` |
| `lib/toolI18n.js` | both locales' `file.drop` and `file.unsupported` strings updated to list the new formats; new `file.empty` string added, both locales |
| `lib/supportContent.mjs` | the `/support` FAQ item "Hangi dosya türlerini yükleyebilirim?" / "Which file types can I upload?" updated to include PDF and CSV, both locales — otherwise it becomes stale the moment this ships |

## Testing

No test infrastructure exists for `pages/file.jsx` today — it's a browser-API-dependent
React component (File API, drag-drop events), consistent with the
`background.js` precedent already established this session (building a
browser-API mock harness for one feature is disproportionate). Verification
is manual: build, then load a real multi-page text PDF, a scanned/image-only
PDF, and a `.csv` file through the actual tool.

`tests/supportContent.test.mjs` already guards locale parity and non-empty
content, so the FAQ copy update is covered by existing tests without writing
new ones.

## Out of scope

- RTF (deferred pending a better library)
- Desktop app and browser extension (separate surfaces)
- Any change to the 2MB size cap
- OCR for scanned PDFs (the 'empty' state names the situation; it doesn't try to solve it)
