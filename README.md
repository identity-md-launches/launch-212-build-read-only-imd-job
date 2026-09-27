# IMD job dashboard

A read-only, single-page dashboard for IMD jobs. It reads the public endpoints
`https://api.imd.fun/jobs` and `https://api.imd.fun/jobs/:id` and shows each job's
state, assigned seats, attempts and last update, with search, filters, sorting and
bounded pagination. It never asks for a wallet signature and never sends a transaction.

The finished static export lives in `dist/` and is committed. `dist/index.html` uses
relative asset URLs (`./assets/…`) and hash routing (`#/`, `#/jobs/<id>`), so it works
from any static host, a gateway subpath or an ENS name without server rewrites.

## What it shows

| Element | Source |
| --- | --- |
| State badge (Queued, Executing, Blocked, Failed, Completed, Other) | `job.state` only. A repository URL or delivery record never counts as completion; an executing or failed job with a delivery link gets an explicit note saying so. |
| Seats | `nodes[].seat` (`tokenId`, `agentId`) from `/jobs/:id`, de-duplicated per job |
| Attempts | highest `nodes[].attempt`, plus node count and total revisions |
| Last update | `updatedAt`, relative and absolute (UTC) |
| Job detail | full objective, delivery record, launch, every node (state, attempt, revisions, seat, verdict), reviews and the raw API record |

The list endpoint does not include seats or attempts, so the dashboard fetches
`/jobs/:id` only for the rows on the current page (at most 3 requests in flight)
and caches each detail until the row's `updatedAt` or `state` changes.

## Data sources and refresh policy

- **Live API.** The list is requested once with `?limit=200` (the API ignores offset
  and cursor parameters, so pagination is client-side over that bounded window) and
  refreshed **at most once per minute, only while the tab is visible**. The manual
  "Refresh now" button obeys the same gate and shows a countdown. A hidden tab never
  refreshes; on becoming visible again it refreshes once if a minute has passed.
- **Live data is stale.** If a refresh fails after an earlier success, the last good
  rows stay on screen under an amber banner that names the failure and the age of the data.
- **Fixture mode (offline snapshot).** If no live request has ever succeeded, for
  example because the API sends no CORS headers or the network is down, the dashboard
  shows a bundled snapshot under a red banner that says "Fixture mode: offline snapshot,
  not live", with the capture time. It keeps retrying the live API once a minute.
  The snapshot (`src/fixtures/snapshot.json`) holds 48 verbatim rows captured from the
  API plus 3 invented rows for the queued and failed states; invented rows carry
  `synthetic: true` and render a "Mock" tag. Fixture mode can also be chosen
  manually with the "Data source" control or by opening `#/?source=fixture`.

**Known limitation:** as of 2026-09-27 `https://api.imd.fun` returns no
`Access-Control-Allow-Origin` header, so a browser on any other origin cannot read
it and the export lands in fixture mode automatically. Live mode was verified through
a same-origin proxy (see the test report). If the API adds CORS headers, the same
export switches to live data with no rebuild. A host can also proxy the API and
rebuild with `VITE_IMD_API_BASE=/your-proxy-path`.

## Install, preview, rebuild, publish

Requires Node 20+ (built with Node 24 and npm 11).

```bash
npm ci                 # install exact dependencies from package-lock.json
npm run dev            # Vite dev server with hot reload
npm run typecheck      # tsc -b --noEmit
npm test               # vitest: unit + interaction tests (jsdom)
npm run build          # production export into dist/ (base ./)
npm run preview        # serve dist/ locally on http://localhost:4173
npm run check          # typecheck + test + build in one go
```

Rebuild after any source change, then commit `dist/` together with the source. The
publisher serves the committed export and does not rebuild.

To publish, upload the contents of `dist/` to any static host (an IPFS gateway,
GitHub Pages, S3, Netlify, …). No server configuration, environment variables or
secrets are needed. With the IMD contributor daemon:

```bash
imd site publish dist --name imd-job-dashboard
```

## Project layout

```
index.html                 entry (lang, viewport, description)
src/main.tsx               React root
src/App.tsx                shell, hash routing, list page composition
src/styles.css             design tokens and all component styles (see DESIGN.md)
src/api/client.ts          fetch wrapper, timeouts, error classes, LIST_LIMIT
src/api/types.ts           API shapes observed on 2026-09-27
src/api/normalize.ts       state mapping, node summaries, delivery notice
src/data/useJobs.ts        store: live/fixture modes, once-per-minute refresh, detail cache
src/lib/refreshPolicy.ts   pure refresh gate (tested)
src/lib/filters.ts         search, filters, sort, pagination, URL round trip (tested)
src/lib/router.ts          hash router
src/lib/time.ts            relative/absolute time formatting
src/components/            SourceBanner, Filters, JobTable, Pagination, JobDetail, StateBadge
src/fixtures/snapshot.json offline snapshot (real capture + labelled mock rows)
dist/                      committed production export
TEST-REPORT.md             test report, Better Interface review, limitations
artifacts/validation.md    identical delivery copy of the test report (untracked, uploaded as an artifact)
artifacts/screenshots/     browser evidence from the final export (untracked, uploaded as artifacts)
DESIGN.md                  implemented design system
```

## Test report

The full report with commands, results, browser evidence and limitations is in
[`TEST-REPORT.md`](TEST-REPORT.md) (an identical copy is delivered as
`artifacts/validation.md`; the screenshots it cites are delivered under
`artifacts/screenshots/`, which the daemon uploads separately from git). Summary of
the final run:

| Check | Result |
| --- | --- |
| `npm run typecheck` | passed, no errors |
| `npm test` | 22 tests in 4 files passed (filters, refresh policy, normalisation, app interactions incl. search, filters, pagination, routing, CORS fallback, HTTP error, stale live data, manual fixture mode, keyboard tab order, once-per-minute refresh with hidden-tab gating) |
| `npm run build` | passed; `dist/index.html` + 2 assets with relative URLs |
| Browser (headless Chromium via Playwright, bounded script) | desktop 1280, intermediate 800/760, mobile 390 and 320: no horizontal overflow, labelled controls, visible focus rings, skip link, empty state, filters, pagination, detail routing; automatic fixture mode under the real CORS block; live mode through a local proxy with exactly 2 list requests in 70 s |
| Rendered contrast | 25 measured foreground/background pairs, all ≥ 4.5:1 after fixing the disabled button (was 4.19:1) |

Not performed: screen-reader sessions, physical-device testing, browser-native 200%
zoom (320 px reflow was checked instead), Windows forced-colors rendering.
