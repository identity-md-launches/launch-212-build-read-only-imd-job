# Validation report — IMD job dashboard

Worker-side report for the assignment "Build a read-only IMD job dashboard". It records
what was built, which checks actually ran, their results, the Better Interface review
and the remaining limitations. It is not an independent network certification.
This file is delivered twice: tracked in git as `TEST-REPORT.md` and as the untracked
artifact `artifacts/validation.md`; the two are byte-for-byte identical. Screenshots
are delivered under `artifacts/screenshots/` (untracked, uploaded as artifacts).

## 1. Scope and assumptions

- Product: single-page React + TypeScript + Vite site, hash-routed (`#/` list,
  `#/jobs/<id>` detail), exported to `dist/` with `base: './'`.
- Data: `GET https://api.imd.fun/jobs?limit=200` and `GET /jobs/:id`. Probed on
  2026-09-27: the list endpoint honours `limit` (up to at least 2000) but ignores
  `offset`, `page`, `cursor`, `state` and `template`; it is sorted by `createdAt`
  descending; it carries no `Access-Control-Allow-Origin` header. Pagination is
  therefore client-side over a bounded window of 200 rows, and browsers on another
  origin cannot read the API directly.
- States seen live: `executing`, `completed`, `blocked`. `queued` and `failed` were not
  present, so the fixture contains 3 clearly labelled synthetic rows for them (plus one
  executing job with a delivery link, to exercise the "URL is not completion" rule).
- Completion is derived from `job.state` only (`src/api/normalize.ts` `normalizeState`,
  `deliveryNotice`). Delivery URLs are displayed but never change the state.
- Refresh policy: one list request per minute at most, only while
  `document.visibilityState === 'visible'`; manual refresh obeys the same gate
  (`src/lib/refreshPolicy.ts`, `src/data/useJobs.ts`).
- Detail requests: only for rows on the current page, max 3 concurrent, cached until
  `updatedAt`/`state` changes.
- Exclusions: no wallet connection, no writes, no dark theme, no localisation.
- Inferred choices: system font stack (no font download), page size options 10/25/50
  with 25 default, filters mirrored into the URL hash, UTC timestamps.

## 2. Coverage (Better Interface, six domains)

| Domain | Status | Evidence / inspected states | Unperformed subchecks |
| --- | --- | --- | --- |
| Accessibility | Checked | Source: native controls only, `<label for>`/wrapping labels on every input and select (browser confirmed 10/10 labelled), one `h1`, one `main`, skip link first in tab order and working (focus lands on `main`), `:focus-visible` 2px ring verified at 12 tab stops (computed `solid 2px rgb(30,79,214)`, screenshots `A-desktop-skiplink-focus.jpg`, `A-desktop-focus-ring-on-chip.jpg`), status conveyed by icon + text + colour, polite live regions for source state and result count, `prefers-reduced-motion` guard, `forced-colors` outline colour, native `disabled` on Refresh/Previous/Next with explanatory text beside Refresh, 320px reflow without horizontal scroll. Hit areas: checkboxes are 16×16 inside a 36px-tall label chip (the label is the target). | Screen-reader session; browser-native 200% zoom (320px reflow used instead); Windows forced-colors rendering; automated axe-style audit. |
| Layout | Checked | Logical properties throughout; `rem` breakpoints at 40/48rem chosen from where the filter grid and the table stop fitting; desktop 1280, intermediate 800 and 760, mobile 390 and 320 rendered with no overflow (list and detail); table → card reflow observed at 760 (`C-760-list.jpg`), 390 and 320; nodes table scrolls sideways with a visible hint. | RTL mirror (no RTL content in product); pseudo-localisation. |
| Writing | Checked | Source review of every label: verb-first buttons ("Refresh now", "Clear filters", "Previous/Next"), sentence case everywhere, errors state the cause and next step ("Unable to reach the live API… Switch the data source…"), empty state names the query and offers "Clear filters", placeholders are examples not labels, no "we"/"oops"/exclamation marks, consistent terms (job, seat, attempt, node, snapshot, fixture mode). | None. |
| Typography | Checked | Scale 12/13/14/16/20/24 with semantic tokens; headings descend (24 → 20 → 16); body 1.5, headings 1.15, prose 1.55; `tabular-nums` on changing numbers; `text-wrap: balance/pretty`; `overflow-wrap: anywhere` on ids/URLs; nowrap on badges and table seat/attempt cells; inputs 16px below 48rem (browser confirmed `16px` at 390 and 320); measure 60ch (list) / 75ch (detail). Wrapping observed in screenshots at all widths; the earlier awkward wraps in Seats/Attempts/"Data source" were fixed and rechecked. | Widows/orphans only inspected in the captured screenshots. |
| Colors | Checked | Hex primitives → semantic tokens, components use semantic tokens only; one accent hue for interaction; status ramps only for rendered states; measured 25 rendered text/background pairs in Chromium (list below), all ≥ 4.5:1 after one fix. | Contrast of `color-mix` borders and of the 16px checkbox glyph (native rendering) not measured; no dark theme exists. |
| UI | Checked | Concentric radii (12 outer / 8 inner / pill); borders for structure, no decorative shadows; transitions name exact properties (`background-color, color, scale`) at 120ms `cubic-bezier(0.2,0,0,1)`; `scale: 0.96` on press; hover gated by `(hover: hover)`; icons `currentColor`, single stroke weight; every state has a static text cue. States walked in browser: loading (jsdom test), live, live-stale (jsdom test), fixture-auto, fixture-manual, empty search, disabled refresh with countdown, detail loading/ready/missing, not-found (jsdom test). | Animations panel at 10% speed (only 120ms colour transitions exist). |

Measured contrast pairs (final export, Chromium, WCAG relative luminance):

| Pair | Ratio |
| --- | --- |
| Objective text `#1a1d21` on white | 16.91 |
| Secondary text `#4f5761` on white / on `#eef0f3` / on `#f6f7f9` / on red banner / on green banner | 7.32 / 6.41 / 6.83 / 6.40 / 6.45 |
| Muted text `#6b7380` on white (13px and 12px) | 4.78 |
| Link / executing badge `#1e4fd6` on white / on `#e8effc` | 6.68 / 5.78 |
| Completed badge and live banner `#1a7a3a` on `#e6f4ea` | 4.76 |
| Failed / error banner `#b42318` on `#fdecea` | 5.75 |
| Blocked / mock tag / notice `#8a4b00` on `#fff1dc`; note text on white | 6.11 / 6.80 |
| Queued badge, table header `#4f5761` on `#eef0f3` | 6.41 |
| Disabled button text on `#eef0f3` (after fix) | 6.41 |

## 3. Findings and fixes

| # | Severity | Location | Evidence | Fix | Recheck |
| --- | --- | --- | --- | --- | --- |
| 1 | MEDIUM (colors) | `src/styles.css:435,442` (`.button:disabled`) | Measured 4.19:1 for muted text on the subtle background of the disabled "Refresh now" button, which carries the countdown meaning. | Added `--color-text-disabled` (`#4f5761`) at `src/styles.css:46` and used it for disabled buttons. | Re-measured 6.41:1. |
| 2 | MEDIUM (writing/comprehension) | `src/components/JobTable.tsx` seats cell | Live data showed "seat 2 · agent 50959" twice for one job (two nodes on the same seat). | `summarizeNodes` now returns `uniqueSeats` (`src/api/normalize.ts:39,63`); list shows each seat once with a "×n" count (`JobTable.tsx:27`); detail lists the node keys per seat. | Verified in `D-desktop-live.jpg`. |
| 3 | LOW (typography) | `src/styles.css:702` (`.jobs-table .seats > span`, `.attempts`), `:343` (`.banner__controls .field__label`) | Screenshot showed "seat 270 · agent / 51046", "2 (3 / nodes)" and "Data / source" wrapping mid-value at 1280px. | `white-space: nowrap` scoped to the list table and the banner label. A first version applied it to the detail grid too and caused 11px/7px overflow at 1280/320; scoped and rechecked. | No overflow at 1280/800/760/390/320 on list and detail. |
| 4 | LOW (accessibility) | `src/components/Filters.tsx:83` | Chip accessible name read "Queued1" because the count sat inside the label. | Count is `aria-hidden`; visually hidden ", N loaded" appended. Keyboard walk now reports "Queued, 1 loaded". | Verified in browser keyboard walk. |
| 5 | LOW (layout) | `src/components/JobDetail.tsx:193`, `src/styles.css:893–901` | On 390/320 the nodes table is cut at the container edge with no hint that it scrolls. | Added "Scroll the table sideways to see every column." shown below 48rem. | Verified in `B-mobile-390-detail.jpg`. |
| 6 | LOW (writing) | `src/components/SourceBanner.tsx:46`, `src/data/useJobs.ts:283` | Fixture-auto banner did not say the live API is retried; countdown could read "61 seconds" on first paint. | Sentence added; countdown clamped to 60s. | Verified ("60 seconds", retry sentence present). |
| 7 | HIGH (correctness, found by tests) | `src/data/useJobs.ts:154,189` | With React batching, two ticks could both pass the once-per-minute gate before the state rendered (test observed 3 list requests instead of 2); a StrictMode remount could leave the gate stuck. | Gate moved to synchronous refs (`listInFlight`, `lastAttemptRef`) reset on unmount. | jsdom test "at most once per minute" passes; browser observed exactly 2 list requests in 70s. |

No open findings remain. Deliberate choices kept: dense 14px table text, a second
"Clear filters" button inside the empty state (the guide asks empty states to offer an
exit), UTC-only timestamps.

## 4. Verification

Commands run from the repository root on 2026-09-27 (Node v24.21.0, npm 11.19.0):

| Command | Result |
| --- | --- |
| `npm install` | 95 packages, 0 vulnerabilities; `package-lock.json` committed |
| `npx tsc -b --noEmit` (`npm run typecheck`) | exit 0, no errors |
| `npx vitest run` (`npm test`) | 4 files, 22 tests passed (`src/lib/refreshPolicy.test.ts`, `src/lib/filters.test.ts`, `src/api/normalize.test.ts`, `src/App.test.tsx`) |
| `npm run build` | exit 0 → `dist/index.html` (0.60 kB), `dist/assets/index-*.css` (15.27 kB), `dist/assets/index-*.js` (301.59 kB, 92.69 kB gzip); asset URLs are `./assets/…` |
| `node test/scratch/browser-check.mjs --long` | exit 0; report summarised below (script served `dist/` under `/preview/` and a proxy build under `/live/` on an ephemeral port, drove headless Chromium via Playwright 1.64 from the pinned MCP package, then exited) |

jsdom interaction tests cover: live rendering with seats/attempts; "repository link
on an executing job stays Executing" with the explanatory note; search, state filter,
URL mirroring and clear; empty state naming the query; hash routing to detail and back;
not-found; once-per-minute refresh incl. no refresh while hidden and one refresh on
becoming visible; CORS/network failure → labelled fixture mode with Mock rows; HTTP 500
→ fixture mode; later failure → "Live data is stale" keeping live rows; manual fixture
mode with disabled refresh and explanation; clamped pagination over the snapshot;
keyboard tab order from skip link through controls and toggling a chip with Space.

Browser scenarios (final export, all screenshots in `artifacts/screenshots/`):

- **A — 1280×900, production export.** Real CORS block observed in the console
  (`No 'Access-Control-Allow-Origin' header`), banner "Fixture mode: offline snapshot,
  not live", 2 Mock rows, 25 rows, no overflow, 1 `h1`, 1 `main`, skip link visible on
  focus and lands on `main`, 12-stop keyboard walk all with the 2px ring, search
  "escrow" → "1 of 51 loaded jobs match", empty state for a nonsense query, Clear
  filters, queued+failed chips → 2 of 51 and `#/?state=failed%2Cqueued`, page size 10
  → "Rows 1–10 of 51", Next → rows 11–20 and `page=2`, Previous disabled on page 1,
  detail opens with focus on the heading, offline notice, 1 node row, back link keeps
  `size=10`, Refresh disabled with "Next refresh allowed in 60 seconds.", manual
  fixture and back to live both labelled fixture. Screenshots `A-*.jpg`.
- **B — 390×844 and 320×844.** No overflow on list or detail, card layout active
  (`thead` visually hidden), inputs 16px, nodes table scrolls inside its container with
  the hint. Screenshots `B-mobile-390-*.jpg`, `B-mobile-320-*.jpg`.
- **C — 800 and 760.** No overflow; layout switches to cards below 768. `C-*.jpg`.
- **D — 1280×900, live mode through a same-origin proxy** (build with
  `VITE_IMD_API_BASE=/imd-api`, not the committed export). Banner "Live data", 200 rows
  loaded, 0 Mock labels, seats and attempts populated from 25 detail requests (one per
  visible row), Refresh disabled with countdown, detail with 3 node rows, **exactly 2
  list requests in 70 seconds**, no console errors, no failed requests. `D-*.jpg`.

## 5. Completion

**Complete for the stated scope.** Remaining limitations:

- The public API sends no CORS headers, so the committed export runs in labelled
  fixture mode on any static host until the API changes or a host proxies it; live
  behaviour was verified only through the local proxy build.
- The fixture is a snapshot from 2026-09-27 02:58 UTC and will age; the banner always
  states its capture time.
- Not performed: screen-reader session, physical-device test, native 200% zoom,
  Windows forced-colors rendering, automated accessibility scan, RTL.
- The expected CORS console error appears in scenarios A and B by design; it is the
  trigger for fixture mode, not a defect in the export.
