import type { JobsStore } from '../data/useJobs'
import { formatAbsolute, formatRelative, formatSeconds } from '../lib/time'

interface Props {
  store: JobsStore
}

/**
 * States the banner communicates (text + colour + label, never colour alone):
 *  - Live data (fresh)            green
 *  - Live data, refresh failed    amber, "stale since …"
 *  - Fixture mode, automatic      red, "offline snapshot"
 *  - Fixture mode, manual         neutral, "offline snapshot"
 *  - Loading                      neutral
 */
export function SourceBanner({ store }: Props) {
  const { mode, msUntilRefresh, inFlight, lastSuccessAt, lastError, fixtureCapturedAt, now } = store
  const capturedRel = formatRelative(fixtureCapturedAt, now)
  const capturedAbs = formatAbsolute(fixtureCapturedAt)

  let tone: 'live' | 'warn' | 'error' | 'neutral' = 'neutral'
  let title = ''
  let detail = ''
  switch (mode) {
    case 'loading':
      title = 'Loading live data'
      detail = 'Requesting the latest jobs from https://api.imd.fun.'
      break
    case 'live':
      tone = 'live'
      title = 'Live data'
      detail = lastSuccessAt
        ? `Updated ${formatRelative(new Date(lastSuccessAt).toISOString(), now)} from https://api.imd.fun. Refreshes at most once a minute while this tab is visible.`
        : 'Connected to https://api.imd.fun.'
      break
    case 'live-stale':
      tone = 'warn'
      title = 'Live data is stale'
      detail = `${lastError ?? 'The last refresh failed.'} Showing the last successful result from ${
        lastSuccessAt ? formatRelative(new Date(lastSuccessAt).toISOString(), now) : 'an earlier fetch'
      }; the dashboard will retry automatically.`
      break
    case 'fixture-auto':
      tone = 'error'
      title = 'Fixture mode: offline snapshot, not live'
      detail = `${lastError ?? 'The live API is unavailable.'} Showing a bundled snapshot captured ${capturedRel} (${capturedAbs}). Rows marked "Mock" are invented examples; every other row is stale real data. The dashboard retries the live API once a minute while this tab is visible.`
      break
    case 'fixture-manual':
      tone = 'neutral'
      title = 'Fixture mode: offline snapshot, not live'
      detail = `Chosen manually. Snapshot captured ${capturedRel} (${capturedAbs}). Rows marked "Mock" are invented examples; every other row is stale real data.`
      break
  }

  const refreshDisabled = store.source !== 'live' || inFlight || msUntilRefresh > 0
  let refreshHint = ''
  if (store.source !== 'live') refreshHint = 'Switch to the live API to refresh.'
  else if (inFlight) refreshHint = 'Refreshing…'
  else if (msUntilRefresh > 0) refreshHint = `Next refresh allowed in ${formatSeconds(msUntilRefresh)}.`

  return (
    <section className={`banner banner--${tone}`} aria-labelledby="source-title">
      <div className="banner__text">
        {/* Polite live region: stays mounted, text updates on mode changes. */}
        <p className="banner__title" id="source-title" role="status" aria-live="polite">
          <span aria-hidden="true">{tone === 'live' ? '●' : tone === 'error' ? '■' : tone === 'warn' ? '▲' : '○'}</span>
          {title}
        </p>
        <p className="banner__detail">{detail}</p>
      </div>
      <div className="banner__controls">
        <div className="field">
          <label className="field__label" htmlFor="data-source">
            Data source
          </label>
          <select
            id="data-source"
            className="select"
            value={store.source}
            onChange={(e) => store.setSource(e.target.value === 'fixture' ? 'fixture' : 'live')}
          >
            <option value="live">Live API</option>
            <option value="fixture">Fixture snapshot (offline)</option>
          </select>
        </div>
        <button type="button" className="button" onClick={store.refresh} disabled={refreshDisabled}>
          Refresh now
        </button>
        {refreshHint ? <span className="banner__countdown">{refreshHint}</span> : null}
      </div>
    </section>
  )
}
