# PDF + CSV Support for /file Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `pages/file.jsx` (the no-account web tool at lesstoken.app/file) extract text from `.pdf` and `.csv` files, in addition to the `.txt`/`.md`/`.docx` it already handles.

**Architecture:** `readFile()` in `pages/file.jsx` gains one new extension branch (`pdf`, via a dynamically-imported `pdfjs-dist`) and one new entry in the existing `TEXT_EXTENSIONS` array (`csv`, no new code path — CSV is already plain text). A scanned/image-only PDF that yields no text gets its own UI status (`empty`) rather than looking like a silent failure.

**Tech Stack:** Next.js 14 (pages router, static export), React 18, `pdfjs-dist` (new dependency) for client-side PDF text extraction, matching the existing `mammoth` (docx) pattern.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-17-pdf-csv-file-support-design.md`.
- Scope is `pages/file.jsx` and its direct dependencies only. The browser extension and desktop app are separate surfaces, not touched.
- **PDF size cap is the existing 2MB limit, unchanged.** Do not add a separate, larger cap for PDFs.
- **RTF is explicitly out of scope** for this plan — deferred pending a better-maintained parsing library.
- **Everything stays client-side.** No new server calls, no new `fetch` to any backend. This preserves the "we have no servers in this path at all" claim already published in this codebase's copy.
- The PDF worker file must be served as a plain static asset from `public/`, referenced by a hardcoded path — not left to bundler auto-discovery. This sidesteps a known `pdfjs-dist` + Next.js file-tracing pitfall.
- No new test infrastructure. `pages/file.jsx` has zero existing automated tests (browser-API-dependent: File API, drag-drop) and this plan does not change that — verification is manual build + hands-on testing, consistent with the same call already made for `extension/background.js` earlier in this project. `tests/supportContent.test.mjs` already covers locale parity and non-empty content, so Task 3's copy edit needs no new test.
- Both locales (`tr` and `en`) must be updated together in every task that touches copy — never ship one language ahead of the other.

---

### Task 1: CSV support

**Files:**
- Modify: `pages/file.jsx:9` (add `'csv'` to `TEXT_EXTENSIONS`), `pages/file.jsx:103` (`accept` attribute)
- Modify: `lib/toolI18n.js:39` and `:41` (tr), `lib/toolI18n.js:120` and `:122` (en)

**Interfaces:**
- Consumes: nothing new — reuses the existing `TEXT_EXTENSIONS.includes(ext)` branch and `file.text()` call already in `readFile()`.
- Produces: nothing new for later tasks to consume. Task 2 will further extend the same `accept` attribute and the same two locale strings this task touches, so its diffs must start from the state this task leaves behind.

- [ ] **Step 1: Add `csv` to the recognized plain-text extensions**

In `pages/file.jsx`, change line 9:

```js
const TEXT_EXTENSIONS = ['txt', 'md'];
```

to:

```js
const TEXT_EXTENSIONS = ['txt', 'md', 'csv'];
```

- [ ] **Step 2: Let the file picker offer `.csv`**

In `pages/file.jsx`, change line 103:

```jsx
<input ref={inputRef} type="file" accept=".txt,.md,.docx" style={{ display: 'none' }} onChange={(e) => readFile(e.target.files?.[0])} />
```

to:

```jsx
<input ref={inputRef} type="file" accept=".txt,.md,.docx,.csv" style={{ display: 'none' }} onChange={(e) => readFile(e.target.files?.[0])} />
```

- [ ] **Step 3: Update the Turkish copy to mention `.csv`**

In `lib/toolI18n.js`, inside the `tr.file` block, change line 39:

```js
      drop: 'veya dosyayı buraya sürükleyin (.txt, .md, .docx)',
```

to:

```js
      drop: 'veya dosyayı buraya sürükleyin (.txt, .md, .docx, .csv)',
```

and change line 41:

```js
      unsupported: 'Bu araç .txt, .md ve .docx dosyalarını okur.',
```

to:

```js
      unsupported: 'Bu araç .txt, .md, .docx ve .csv dosyalarını okur.',
```

- [ ] **Step 4: Update the English copy to mention `.csv`**

In `lib/toolI18n.js`, inside the `en.file` block, change line 120:

```js
      drop: 'or drop a file here (.txt, .md, .docx)',
```

to:

```js
      drop: 'or drop a file here (.txt, .md, .docx, .csv)',
```

and change line 122:

```js
      unsupported: 'This tool reads .txt, .md and .docx files.',
```

to:

```js
      unsupported: 'This tool reads .txt, .md, .docx and .csv files.',
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 6: Manually verify CSV loads**

Serve the build and try it in a real browser — `next dev` does not hydrate in this project, so use the static export:

```bash
npx serve out -l 3133
```

At `http://localhost:3133/file`:
1. Create a small test file, e.g. `name,age\nAda,36\nGrace,85`, save it as `test.csv`.
2. Drop it onto the file tool (or use "Dosya seç" / "Choose file" — the file picker should now show `.csv` as selectable).
3. Expected: the raw CSV content appears in the "Çıkarılan metin" / "Extracted text" textarea, comma-separated, exactly as typed.
4. Switch language (`localStorage.setItem('lang','en')`, reload) and confirm the drop-zone hint text now lists `.csv` in English too.

- [ ] **Step 7: Commit**

```bash
git add pages/file.jsx lib/toolI18n.js
git commit -m "feat(file-tool): accept .csv files

CSV is already plain text, so this reuses the existing file.text() path --
no new parsing, just one more recognized extension."
```

---

### Task 2: PDF support

**Files:**
- Modify: `package.json` (add `pdfjs-dist` dependency)
- Create: `public/pdf.worker.min.mjs` (copied from the installed package, not authored)
- Modify: `pages/file.jsx` (new `pdf` branch in `readFile()`, new `'empty'` status, `accept` attribute, status comment)
- Modify: `lib/toolI18n.js` (both locales: `drop`, `unsupported`, and a new `pdfEmpty` key)

**Interfaces:**
- Consumes: `TEXT_EXTENSIONS`, the `readFile()` function, and the `accept` attribute from Task 1 — this task's diffs assume Task 1 already landed.
- Produces: a new `status` value `'empty'` (distinct from the existing `idle | reading | done | error | unsupported | toolarge`), rendered via a new locale key `t.pdfEmpty`. Nothing later in this plan consumes this, but note it if this file is touched again.

- [ ] **Step 1: Add the `pdfjs-dist` dependency**

In `package.json`, inside `"dependencies"`, add a line after `"next": "^14.0.0",` (keep alphabetical order, matching the existing list):

```json
    "next": "^14.0.0",
    "pdfjs-dist": "^6.2.108",
```

Run:

```bash
npm install
```

Expected: install succeeds, `node_modules/pdfjs-dist` exists.

- [ ] **Step 2: Copy the worker script into `public/`**

`pdfjs-dist` requires a separate worker script at runtime. Rather than relying on bundler auto-discovery (a known failure point with this package), it's served as a plain static file — the same mechanism already serving `mark.svg` and the favicons.

Run:

```bash
ls node_modules/pdfjs-dist/build/pdf.worker.min.mjs
```

Expected: the file exists. **If it does not** (a different major version resolved than the `6.2.108` this plan was written against), run `ls node_modules/pdfjs-dist/build/` to see what's actually there, and use that exact filename in this step and in Step 4 below instead of `pdf.worker.min.mjs`.

Then copy it:

```bash
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs
```

Expected: `public/pdf.worker.min.mjs` now exists, roughly 1.2MB.

- [ ] **Step 3: Track the status comment and add the `pdf` branch to `readFile()`**

In `pages/file.jsx`, change line 16:

```js
  const [status, setStatus] = useState('idle'); // idle | reading | done | error | unsupported | toolarge
```

to:

```js
  const [status, setStatus] = useState('idle'); // idle | reading | done | error | unsupported | toolarge | empty
```

Then change the `readFile` function (lines 25-49):

```js
  const readFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setStatus('toolarge');
      return;
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    setStatus('reading');
    try {
      if (TEXT_EXTENSIONS.includes(ext)) {
        setText(await file.text());
        setStatus('done');
      } else if (ext === 'docx') {
        const mammoth = (await import('mammoth')).default;
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        setText(result.value);
        setStatus('done');
      } else {
        setStatus('unsupported');
      }
    } catch (err) {
      console.warn('file read failed', err);
      setStatus('error');
    }
  };
```

to:

```js
  const readFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setStatus('toolarge');
      return;
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    setStatus('reading');
    try {
      if (TEXT_EXTENSIONS.includes(ext)) {
        setText(await file.text());
        setStatus('done');
      } else if (ext === 'docx') {
        const mammoth = (await import('mammoth')).default;
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        setText(result.value);
        setStatus('done');
      } else if (ext === 'pdf') {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        const pages = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          pages.push(content.items.map((item) => item.str).join(' '));
        }
        const extracted = pages.join('\n\n').trim();
        if (extracted) {
          setText(extracted);
          setStatus('done');
        } else {
          setStatus('empty');
        }
      } else {
        setStatus('unsupported');
      }
    } catch (err) {
      console.warn('file read failed', err);
      setStatus('error');
    }
  };
```

- [ ] **Step 4: Let the file picker offer `.pdf`, and render the new `empty` status**

In `pages/file.jsx`, change line 103 (already edited once by Task 1 — this is the second edit, on top of that):

```jsx
<input ref={inputRef} type="file" accept=".txt,.md,.docx,.csv" style={{ display: 'none' }} onChange={(e) => readFile(e.target.files?.[0])} />
```

to:

```jsx
<input ref={inputRef} type="file" accept=".txt,.md,.docx,.csv,.pdf" style={{ display: 'none' }} onChange={(e) => readFile(e.target.files?.[0])} />
```

Then, immediately after the `toolarge` status line (line 107):

```jsx
            {status === 'toolarge' && <p style={{ fontSize: '13px', color: '#991b1b', marginTop: '8px' }}>{t.tooLarge}</p>}
```

add a new line right below it:

```jsx
            {status === 'toolarge' && <p style={{ fontSize: '13px', color: '#991b1b', marginTop: '8px' }}>{t.tooLarge}</p>}
            {status === 'empty' && <p style={{ fontSize: '13px', color: '#991b1b', marginTop: '8px' }}>{t.pdfEmpty}</p>}
```

- [ ] **Step 5: Update the Turkish copy for PDF, and add the `pdfEmpty` message**

In `lib/toolI18n.js`, inside the `tr.file` block, change the `drop` line (already edited once by Task 1):

```js
      drop: 'veya dosyayı buraya sürükleyin (.txt, .md, .docx, .csv)',
```

to:

```js
      drop: 'veya dosyayı buraya sürükleyin (.txt, .md, .docx, .csv, .pdf)',
```

Change the `unsupported` line (already edited once by Task 1):

```js
      unsupported: 'Bu araç .txt, .md, .docx ve .csv dosyalarını okur.',
```

to:

```js
      unsupported: 'Bu araç .txt, .md, .docx, .csv ve .pdf dosyalarını okur.',
```

Add a new `pdfEmpty` key right after `tooLarge`:

```js
      tooLarge: 'Dosya çok büyük (en fazla 2 MB).',
      pdfEmpty: 'Bu PDF\'te çıkarılabilir metin bulunamadı — muhtemelen taranmış bir belge.',
```

- [ ] **Step 6: Update the English copy for PDF, and add the `pdfEmpty` message**

In `lib/toolI18n.js`, inside the `en.file` block, change the `drop` line (already edited once by Task 1):

```js
      drop: 'or drop a file here (.txt, .md, .docx, .csv)',
```

to:

```js
      drop: 'or drop a file here (.txt, .md, .docx, .csv, .pdf)',
```

Change the `unsupported` line (already edited once by Task 1):

```js
      unsupported: 'This tool reads .txt, .md, .docx and .csv files.',
```

to:

```js
      unsupported: 'This tool reads .txt, .md, .docx, .csv and .pdf files.',
```

Add a new `pdfEmpty` key right after `tooLarge`:

```js
      tooLarge: 'File is too large (2 MB max).',
      pdfEmpty: 'No extractable text found in this PDF — it\'s likely a scanned document.',
```

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: build succeeds with no errors. Confirm the worker file made it into the static export:

```bash
ls out/pdf.worker.min.mjs
```

Expected: the file is present (Next.js copies everything under `public/` into `out/` verbatim during static export).

- [ ] **Step 8: Manually verify PDF extraction, including the scanned-document case**

Serve the build:

```bash
npx serve out -l 3133
```

At `http://localhost:3133/file`:
1. Drop a real, multi-page, text-based PDF (any PDF with selectable text — export one from a Word doc or a webpage's "Print to PDF" if nothing else is handy). Expected: extracted text appears in the textarea, status goes through "Dosya okunuyor…" then settles on the text (no error).
2. Drop a scanned/image-only PDF (a phone-camera photo of a page saved as PDF works, or any PDF you know has no real text layer). Expected: the textarea stays empty and the new message appears — *"Bu PDF'te çıkarılabilir metin bulunamadı — muhtemelen taranmış bir belge."*
3. Open the browser's DevTools console during both tests. Expected: no errors, no "Failed to load worker" or similar `pdfjs-dist` warnings — a wrong worker path fails loudly here, this is the step that would catch it.
4. Confirm the drop-zone hint text now lists `.pdf` too, in both languages.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json public/pdf.worker.min.mjs pages/file.jsx lib/toolI18n.js
git commit -m "feat(file-tool): add PDF text extraction via pdfjs-dist

Worker script is served as a plain public/ static asset with a hardcoded
workerSrc path rather than left to bundler auto-discovery -- pdfjs-dist's
worker/WASM file layout is a known trip-up for Next.js's file tracing.

Scanned/image-only PDFs parse successfully but yield no text -- that's not
an error, so it gets its own 'empty' status and a message that says what
actually happened, instead of leaving the textarea blank with no explanation."
```

---

### Task 3: Update the /support FAQ to match

**Files:**
- Modify: `lib/supportContent.mjs:63` (tr), `lib/supportContent.mjs:142` (en)

**Interfaces:**
- Consumes: nothing from Tasks 1-2 directly, but describes their result — do this task last, after PDF and CSV support actually exist, so the copy never claims a capability that isn't shipped yet.
- Produces: nothing further depends on this task.

- [ ] **Step 1: Update the Turkish FAQ answer**

In `lib/supportContent.mjs`, change line 63:

```js
          a: 'Dosya aracı .txt, .md ve .docx okur; dosya boyutu en fazla 2 MB olabilir. Okuma tamamen tarayıcınızda yapılır, dosyanız hiçbir yere yüklenmez.'
```

to:

```js
          a: 'Dosya aracı .txt, .md, .docx, .csv ve .pdf okur; dosya boyutu en fazla 2 MB olabilir. Okuma tamamen tarayıcınızda yapılır, dosyanız hiçbir yere yüklenmez.'
```

- [ ] **Step 2: Update the English FAQ answer**

In `lib/supportContent.mjs`, change line 142:

```js
          a: 'The File tool reads .txt, .md and .docx, up to 2 MB. The reading happens entirely in your browser — your file is never uploaded anywhere.'
```

to:

```js
          a: 'The File tool reads .txt, .md, .docx, .csv and .pdf, up to 2 MB. The reading happens entirely in your browser — your file is never uploaded anywhere.'
```

- [ ] **Step 3: Run the existing content tests**

Run: `npm test`
Expected: all tests pass, including `tests/supportContent.test.mjs`'s locale-parity and non-empty-content checks. No new test is needed — none of the existing assertions check for specific file-type keywords, so this step is a regression check, not a new failing→passing cycle.

- [ ] **Step 4: Commit**

```bash
git add lib/supportContent.mjs
git commit -m "docs(support): mention PDF and CSV in the file-types FAQ

Left stale, this would have repeated the same mistake caught earlier this
session: shipped copy that no longer matches what the product actually does."
```
