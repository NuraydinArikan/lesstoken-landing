# /support Page — Progress Ledger

Plan: docs/superpowers/plans/2026-08-15-support-page.md
Branch: feature/support-page
Merge base: 899cc3553ff2bfe1dd69315975ddd67f81542bbc
Started at HEAD: d61428f

## Tasks
- [x] Task 1: Bilingual content module
- [x] Task 2: /support page with tabs and FAQ
- [x] Task 3: ContactForm component
- [x] Task 4: Retire /contact

## Completed
- Task 1: complete (commit 35c25a0, review clean)
- Task 2: complete (commit 34ffcb0, review clean)
- Task 3: complete (commit d423096, review clean)
- Task 4: complete (commit 9f50e3f, review clean)
- Task 3: complete (commit d423096, review clean; live-API verification deliberately skipped)
- Task 4: complete (commit 9f50e3f, review clean, zero findings)

## Minor findings for final review
- T1 tests/supportContent.test.mjs: no regression test enforcing the "no savings-formula FAQ" constraint; satisfied by inspection only.
- T2 pages/support.jsx:62-90: not a full ARIA tabs pattern (no role=tablist/tab/tabpanel, no arrow-key nav); accordion panel not tied to its trigger via aria-controls/id. Inherited from the plan brief.
- T2 pages/support.jsx:36-39: clicking the already-active tab still closes an open FAQ item; selectTab resets openFaq without checking the tab actually changed.
- T2 pages/support.jsx: one-frame flash of Turkish for non-Turkish users before detectLang resolves. Site-wide existing pattern (same in _app.jsx), not a regression.
- T3 components/ContactForm.jsx:35-39: "user customised the subject" is a string-suffix heuristic (endsWith em-dash+space), not an explicit edited flag; text ending that way is clobbered on tab switch.
- T3 components/ContactForm.jsx:59-86: no abort/mounted guard around the in-flight fetch; unmounting mid-submit calls setState on a detached component.
- T3: data.error assumed present on non-OK JSON bodies. Inherited from the old /contact page, not a regression, unverified against the live endpoint.

## Deferred verification (needs the user or a deploy)
- T3: real submission, HTTP 429 path, and offline path against the live contact API.
- T4: the /contact -> /support redirect is edge-level and only testable after deploy.
- Task 3 (components/ContactForm.jsx:37): subject heuristic endsWith("— ") will overwrite user text legitimately ending in em-dash. Inherited from brief verbatim, not implementer-introduced.
- Task 3 (components/ContactForm.jsx:51): form state uses closure pattern ({ ...form, ... }) not functional updates, could drop concurrent updates if async interleaving occurred (does not in this component). Inherited from brief.

## Final whole-branch review (opus)
Verdict was "not ready to merge" with 4 Important findings; all fixed in dfc08b6
and independently re-verified:
- False FAQ answer ("fails quietly") -- extension does show an error banner.
- data.error passed through, exposing the backend's hard-coded Turkish 502 body
  to English readers.
- Spec-approved links dropped; content model now carries optional links[].
- Quoted error string did not match what the extension emits.
Plus: rate-limit copy corrected to ~1 hour (real limit 15/hr), and
extension/SUBMISSION_CHECKLIST.md repointed off the wrong Support URL.
All recorded Minor findings were triaged as carry.
