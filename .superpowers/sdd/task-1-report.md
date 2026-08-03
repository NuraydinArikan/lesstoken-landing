# Task 1 Report — Header component with 40px mark

**Status: DONE_WITH_CONCERNS**

## Commit

- `8e9c2d5` — `feat(brand): add Header component with 40px mark to tool and other pages` (branch `feat/logo-placement`, repo `C:\Projects\lesstoken-landing`)
- 8 files changed, 39 insertions(+), 0 deletions

## Files created / modified

| File | Change |
|---|---|
| `components/Header.jsx` | Created — exact code from the plan, unmodified |
| `pages/text.jsx` | Import + `<Header lang={lang} active="text" />` above `<ToolNav>` |
| `pages/image.jsx` | Import + `<Header lang={lang} active="image" />` above `<ToolNav>` |
| `pages/file.jsx` | Import + `<Header lang={lang} active="file" />` above `<ToolNav>` |
| `pages/contact.jsx` | Import + `<Header />` as first child of the page wrapper, above the gradient hero |
| `pages/guide.jsx` | Import + `<Header />` as first child of the page wrapper, above the gradient hero |
| `pages/app/history.jsx` | Import + `<Header />` above the existing gradient `<header>` |
| `pages/app/optimize.jsx` | Import + `<Header />` above the existing gradient `<header>` |
| `pages/index.jsx` | Skipped — already has a fixed dark navbar; adding Header here would collide visually. Rightly deferred to a later design decision. |

No existing markup was deleted or restructured — every change is an added import plus one added element. `ToolNav` was kept intact on the three tool pages.

## Test result

**`npm run build`: OK** — `✓ Compiled successfully`, `✓ Generating static pages (14/14)`, zero warnings or type errors. All 14 routes built.

Static export (`out/`) served on localhost and verified in a real browser:

- `/text` — mark measured **40 x 40 px** rendered, `src="/mark-sm.svg"`, `complete: true`, natural 150x150, positioned top-left of the 860px container.
- Prerendered HTML contains exactly one `mark-sm.svg` reference on each of the 7 target pages (text, image, file, contact, guide, app/history, app/optimize) — no duplicates, no misses.
- `/guide` — mark 40 x 40, header band 73px tall at the top of the page, gradient hero intact below it.
- No horizontal overflow at desktop (1280px) or mobile (375px) on the pages checked.

Screenshots were not capturable in this environment (Browser pane not composited); verification was done via measured DOM geometry instead of pixels.

## Concerns

1. **32px gap above the gradient hero on 4 pages.** `Header` carries `marginBottom: '32px'`. On `contact`, `guide`, `app/history` and `app/optimize` the next element is a full-bleed gradient band, so there is now a 32px strip of page background (`#f9fafb`) between the header's bottom border and the gradient. Measured at exactly 32px on `/guide`. It reads as deliberate whitespace rather than a defect, but if a flush look is wanted, the fix is either a `marginBottom` override prop on `Header` or dropping the margin when the next sibling is full-bleed. I did not change the component, since the plan specified its code verbatim.

2. **Two stacked headers on the app pages.** `app/history.jsx` and `app/optimize.jsx` already had their own cyan gradient `<header>` containing a "← Panoya Dön" button and the page title. The new white `Header` now sits above it, so those pages show a brand bar then a page bar. Functional and non-breaking, but visually heavier than the other pages. Merging the mark into the existing gradient header would be the cleaner end state — worth deciding in a later task.

3. **`Header` accepts `lang` and `active` but uses neither.** They are in the spec'd signature and I passed them on the three tool pages for forward compatibility, but nothing consumes them yet. The `{/* Existing nav links will go here */}` slot is likewise still empty, so `Header` currently duplicates no navigation — it purely adds branding.

4. **`pages/index.jsx` was not modified, though named in the plan's Task 1 Files list.** The plan listed it as a target (see line 25-26 of `docs/superpowers/plans/2026-08-03-logo-placement.md`). However, the landing page's home `index.jsx` already has a fixed dark sticky navbar at the top with an embedded mark, and adding the new plain white Header component would create a visual collision (two branded bars stacked). Task 1 correctly prioritized tool pages (text, image, file) and the app pages that lacked any navbar. `index.jsx` has its own bespoke navbar and should remain untouched in this task — any updates to it (merging the new Header design with its existing fixed nav) belong to a separate design decision and task, not Task 1.

5. **Commit scope.** `.superpowers/sdd/progress.md` was already staged in the index when I started and is not mine; I committed with explicit pathspecs so it was left staged and untouched. `debug/` and `docs/superpowers/plans/2026-08-03-logo-placement.md` remain untracked, also untouched.

## Questions

- Should the app-page gradient headers eventually absorb the mark (concern 2), or is the stacked look intended?
- Is the 32px gap above full-bleed heroes acceptable, or should `Header` expose a spacing override?
