import { normalizeState, STATE_LABEL } from '../api/normalize'
import type { JobState } from '../api/types'

const ICONS: Record<JobState, React.ReactNode> = {
  // Clock: queued
  queued: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  // Play triangle in circle: executing
  executing: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l5.5-3.5z" fill="currentColor" stroke="none" />
    </>
  ),
  // Check: completed
  completed: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </>
  ),
  // Cross: failed
  failed: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  // Pause bars: blocked
  blocked: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7M14 8.5v7" />
    </>
  ),
  // Question: other
  other: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 16.5h.01" />
    </>
  ),
}

interface Props {
  /** Raw API state string; normalised here. */
  state: string
  /** Show the raw value when it differs from the normalised label. */
  showRaw?: boolean
}

export function StateBadge({ state, showRaw = false }: Props) {
  const norm = normalizeState(state)
  const label = STATE_LABEL[norm]
  const raw = state.toLowerCase()
  const differs = raw !== norm && raw !== label.toLowerCase()
  return (
    <span className={`badge badge--${norm}`} data-state={norm}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {ICONS[norm]}
      </svg>
      <span>{label}</span>
      {showRaw && differs ? <span className="visually-hidden"> (API state: {state})</span> : null}
    </span>
  )
}
