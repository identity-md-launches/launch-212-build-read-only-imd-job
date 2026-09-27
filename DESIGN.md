# DESIGN.md — IMD job dashboard

Implemented design system, extracted from the final source (`src/styles.css` and the
components in `src/components/`). Use it to add another page that belongs to the same
product. Every value below is taken from source; rendered checks that confirmed them
are recorded in `artifacts/validation.md`.

## Overview

Audience: contributors and observers of the IMD network who want to see what jobs are
queued, executing, blocked, failed or completed, who holds the seats and how many
attempts a job has taken. The product is a dense but calm operational tool: light
neutral page, white cards with hairline borders, one blue accent reserved for
interactive elements, and colour-plus-icon-plus-text status badges.

System-wide rules:

- One page frame (`.page`, max 76rem, 16px inline padding with safe-area insets).
- Content lives in white cards (`.card`, `.table-wrap`) separated by 16px of space;
  groups are made with space first, borders second.
- The accent hue means "interactive" and nothing else. Status hues are used only in
  badges, banners and notices, never for decoration.
- Every state is communicated by text and an icon as well as colour.
- No dark theme, no web fonts, no animation beyond ≤120ms colour transitions and a
  0.96 press scale, both disabled under `prefers-reduced-motion`.

Page-specific arrangements (list page: banner → filters → table → pagination; detail
page: back link → heading → notices → summary/objective/delivery/nodes/reviews cards)
are compositions, not rules; reuse the primitives, not the order.

## Colors

All colours are hex in `src/styles.css` (`:root`, lines 7–109). Primitives are never
used in components; only semantic tokens are.

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Page background | `--color-bg-page` | `#f6f7f9` (`--gray-50`) | `body` |
| Surface | `--color-bg-surface` | `#ffffff` | cards, table, inputs, buttons |
| Subtle surface | `--color-bg-subtle` | `#eef0f3` (`--gray-100`) | table headers, disabled buttons |
| Hover surface | `--color-bg-hover` | `#eef0f3` | row and button hover (pointer devices only) |
| Border | `--color-border` | `#dfe3e8` (`--gray-200`) | card, table and row separators |
| Strong border | `--color-border-strong` | `#c7cdd5` (`--gray-300`) | inputs, buttons, chips |
| Text | `--color-text` | `#1a1d21` (`--gray-900`) | body, objectives |
| Secondary text | `--color-text-secondary` | `#4f5761` (`--gray-600`) | labels, table headers, template names, counts |
| Muted text | `--color-text-muted` | `#6b7380` (`--gray-500`) | captions, absolute timestamps, "Not in snapshot" |
| Disabled text | `--color-text-disabled` | `#4f5761` | text of `:disabled` buttons |
| Accent | `--color-accent` | `#1e4fd6` (`--blue-700`) | links, button labels, primary fill, checked chip border |
| Accent hover | `--color-accent-hover` | `#163d9f` (`--blue-800`) | link/primary hover |
| Accent soft | `--color-accent-soft` | `#e8effc` (`--blue-50`) | checked chip background |
| Focus ring | `--color-focus-ring` | `#1e4fd6` | `:focus-visible` outline, 2px solid, 2px offset; `Highlight` under forced colours |

Status roles (text on soft background), consumed by `.badge--*` in `StateBadge.tsx`:

| State | Foreground | Background |
| --- | --- | --- |
| queued | `--status-queued-fg` `#4f5761` | `--status-queued-bg` `#eef0f3` |
| executing | `--status-executing-fg` `#1e4fd6` | `--status-executing-bg` `#e8effc` |
| completed | `--status-completed-fg` `#1a7a3a` | `--status-completed-bg` `#e6f4ea` |
| failed | `--status-failed-fg` `#b42318` | `--status-failed-bg` `#fdecea` |
| blocked | `--status-blocked-fg` `#8a4b00` | `--status-blocked-bg` `#fff1dc` |
| other | `--status-other-fg` `#5b3fc4` | `--status-other-bg` `#efeafc` |

Banner roles reuse the same primitives: `--banner-live-*` (green), `--banner-warn-*`
(amber), `--banner-error-*` (red), `--banner-neutral-*` (gray). Banner and notice
borders are `color-mix(in oklab, <fg> 25%, transparent)`.

Measured rendered contrast (Chromium, final export, WCAG 2.x formula): every text pair
listed in `artifacts/validation.md` is ≥ 4.5:1; the lowest are completed badge and
live banner text at 4.76:1 and muted text on white at 4.78:1. Colour-mixed borders
were not measured.

## Typography

- Families: `--font-sans` = `ui-sans-serif, system-ui, -apple-system, "Segoe UI",
  Roboto, "Helvetica Neue", Arial, sans-serif`; `--font-mono` = `ui-monospace,
  SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`. No font files are
  shipped; the rendered face is the platform's. Root has `-webkit-font-smoothing:
  antialiased` and `-moz-osx-font-smoothing: grayscale`.
- Scale (rem, 16px root): `--text-xs` 12px captions and data labels on mobile cards;
  `--text-sm` 13px table meta, badges, field labels, banner detail; `--text-base` 14px
  UI text and table cells (body default); `--text-md` 16px objective prose, inputs on
  mobile, h3; `--text-lg` 20px h2 and the detail-page h1; `--text-xl` 24px page title.
- Weights: 400 body; 600 labels, badges, h2/h3, buttons; 650 page title (`h1`,
  `letter-spacing: -0.01em`). Nothing below 400.
- Line height: body 1.5; headings 1.15; objective prose 1.55; clamped objectives 1.45.
- Wrapping: headings `text-wrap: balance`; paragraphs `text-wrap: pretty`; ids and
  URLs `overflow-wrap: anywhere`; badges, table headers, seat lines and attempt counts
  in the list table `white-space: nowrap`; list objectives clamp to 2 lines at a 60ch
  measure (`.job-cell__objective`); detail objectives cap at 75ch (`.objective`,
  `white-space: pre-wrap`).
- Numbers that change (counts, page numbers, attempts, countdowns) use
  `font-variant-numeric: tabular-nums` via `.num`, `.chip__count`,
  `.pagination__status`, `.banner__countdown`.
- Small uppercase labels (`.tag`, mobile card data labels) carry 0.02–0.04em tracking.
- Inputs and selects are 16px below the 48rem breakpoint (iOS zoom guard) and 14px above.
- Links use `text-underline-position: from-font`, `text-decoration-thickness: from-font`,
  `text-decoration-skip-ink: auto`.
- Document: `<html lang="en" dir="ltr">`; all timestamps are rendered in UTC with an
  explicit "UTC" suffix (`src/lib/time.ts`).

## Layout

- Spacing steps: `--space-1` 4px, `-2` 8px, `-3` 12px, `-4` 16px, `-6` 24px, `-8` 32px.
  Within a group use 4–8px; between groups 16px (`.stack`); around the page 16–32px.
- Frame: `.page` centres content at `max-width: 76rem` with
  `padding-inline: max(16px, env(safe-area-inset-*))`. Logical properties
  (`inset-inline-start`, `padding-inline`, `margin-inline-end`) are used throughout.
- Breakpoints come from content, in rem:
  - `≥ 40rem` (640px): the filter form becomes a 3-column grid (search 2fr, template
    1fr, sort 1fr) with the state chips spanning all columns.
  - `≥ 48rem` (768px): inputs drop to 14px / 36px height. Below `47.99rem` the jobs
    table switches to stacked cards: `table/tbody/tr/td` become blocks, `thead` is
    visually hidden, each `td[data-label]` prints its label from `::before`, the State
    cell moves first (`order: -1`), and Seats/Attempts sit inline.
  - The nodes table on the detail page never reflows; it scrolls sideways inside
    `.table-scroll` with a visible hint (`.table-scroll__hint`) shown below 48rem.
- Grids: `.meta-grid` (`repeat(auto-fit, minmax(12rem, 1fr))`) for label/value pairs;
  flex-wrap rows for header, banner, filter actions and pagination.
- Sticky chrome: none. The skip link is absolutely positioned off-canvas until focused.
- Observed in the browser at 1280, 800, 760, 390 and 320 CSS px with no horizontal
  overflow on the list and detail pages. Widths between 391 and 759 other than 640
  boundaries were not individually inspected.

## Elevation & Depth

Flat by design. Structure comes from 1px borders (`--color-border`, `--color-border-strong`)
and two background tones (page vs surface). The single shadow token `--shadow-1`
(`0 1px 2px rgb(0 0 0 / 0.04), 0 1px 3px rgb(0 0 0 / 0.06)`) is declared for future
floating surfaces but no current component uses it. Overlays, modals and z-layers do
not exist; the only stacked element is the focused skip link (`z-index: 10`).

## Shapes

- `--radius-sm` 4px: tags. `--radius-md` 8px: inputs, selects, buttons, notices,
  the nodes table container, the raw-record disclosure. `--radius-lg` 12px: cards,
  banner, table wrapper (= 8px inner radius + 4px, keeping nesting concentric).
  `--radius-pill` 999px: badges and filter chips.
- Borders are 1px solid; the "Mock" tag uses a solid amber border, the generic `.tag`
  a dashed one.
- Icons are 14px inline SVG strokes at 2px (`StateBadge.tsx`), `currentColor`, one
  glyph per state (clock, play, check, cross, pause bars, question mark).

## Components

All components are plain React function components in `src/components/`; there is no
package export, so reuse them by import path.

- **SourceBanner** (`SourceBanner.tsx`, `.banner`, `.banner--live|warn|error|neutral`).
  Reads the store's `mode` and renders one of five states: loading, live, live-stale,
  fixture-auto, fixture-manual. Title is a polite `role="status"` live region; the
  glyph before it is decorative. Contains the "Data source" select and the "Refresh
  now" button (native `disabled` while the once-per-minute gate holds, with a countdown
  sentence beside it).
- **Filters** (`Filters.tsx`, `.filters`, `.chip`, `.fieldset`). A `<form role="search">`
  with labelled search input, template select, sort select, a fieldset of checkbox
  chips (one per state, count shown visually and as hidden text ", N loaded"), rows-per-
  page select and a "Clear filters" link-style button. Emits a complete `FilterState`;
  the app mirrors it into the URL hash.
- **StateBadge** (`StateBadge.tsx`, `.badge`, `.badge--<state>`). Normalised state with
  icon + text; hidden text exposes a differing raw API value.
- **JobTable** (`JobTable.tsx`, `.table-wrap`, `.jobs-table`). Semantic table with a
  visible caption ("Jobs, page x of y"), `data-label` on every cell for the card layout,
  link per row to `#/jobs/<id>` (accessible name "Open job <id>"), de-duplicated seat
  lines, attempts summary, relative + absolute update time. Loading / unavailable /
  not-in-snapshot cell states are text.
- **Pagination** (`Pagination.tsx`, `.pagination`). `<nav aria-label="Pagination">` with
  Previous/Next buttons (native `disabled` at the ends) and a bounded status line.
- **JobDetail** (`JobDetail.tsx`). Back link, `h1` job id that receives focus on
  navigation (`tabIndex={-1}`), notices for offline/stale/missing/error, then cards:
  Summary (`.meta-grid`), Objective, Delivery (with the "state decides completion"
  notice), Nodes (`.nodes-table` in `.table-scroll`), Reviews, and a native
  `<details class="raw">` with the raw JSON. Not-found state is an `.empty` card.
- **Buttons** (`.button`, `.button--primary`, `.button--link`): 36px min height, 600
  weight, accent text on white or white on accent, `scale: 0.96` on press, hover only
  under `@media (hover: hover)`. Only the empty state uses a filled primary button.
- **Inputs** (`.input`, `.select`): 40px on mobile / 36px desktop, strong border,
  browser-style focus ring via the global `:focus-visible` rule.
- **Empty state** (`.empty`, `.empty__title`, `.empty__body`): centred title, one
  sentence of orientation, at most one action.
- **Notices** (`.notice`, `.notice--error`) and **tags** (`.tag`, `.tag--mock`).

Keyboard behaviour is native throughout: no custom widgets, no positive `tabindex`,
`Skip to content` first in the tab order targeting `main#main`.

## Do's and Don'ts

- Start a new page inside `.page` with a `.stack` of `.card`s; put the page title in
  the header pattern from `App.tsx` and keep exactly one `h1`.
- Use `--color-accent` only for things that respond to input. Use a status token only
  for the state it names; add a token before borrowing one.
- Add a state by extending `JobState`, `STATE_LABEL`, the icon map in `StateBadge.tsx`
  and a `--status-<name>-fg/bg` pair; never by inline colour.
- Keep every list cell readable as text: loading, unavailable and empty are words, not
  blank cells or spinners.
- Prefer native controls with `<label for>`; do not add ARIA roles to divs.
- Keep tables semantic; for narrow widths reuse the `data-label` card pattern rather
  than a second mobile component. Anything that must stay tabular scrolls inside
  `.table-scroll` with the hint paragraph.
- Do not introduce web fonts, shadows for depth, a dark theme, wallet libraries or
  motion beyond the existing 120ms colour transitions.
- Recipe for another page: add a route match in `App.tsx`, render a component that
  returns `.stack` > `.card` sections with `h2` headings and `.meta-grid` for facts,
  reuse `StateBadge` for any job state, format times with `src/lib/time.ts`, and read
  data through `useJobs` so the banner's source/refresh semantics stay consistent.
