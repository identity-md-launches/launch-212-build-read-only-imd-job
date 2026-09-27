/**
 * Refresh policy: at most one list refresh per minute, and only while the
 * page is visible. Pure functions so the rule is testable without React.
 */
export const MIN_REFRESH_INTERVAL_MS = 60_000

export function nextRefreshAt(lastAttemptAt: number | null): number | null {
  if (lastAttemptAt === null) return null
  return lastAttemptAt + MIN_REFRESH_INTERVAL_MS
}

/** Milliseconds until a refresh is allowed; 0 when allowed now. */
export function msUntilAllowed(lastAttemptAt: number | null, now: number): number {
  const next = nextRefreshAt(lastAttemptAt)
  if (next === null) return 0
  return Math.max(0, next - now)
}

export function refreshAllowed(lastAttemptAt: number | null, now: number): boolean {
  return msUntilAllowed(lastAttemptAt, now) === 0
}

/** Should the automatic timer fire a refresh right now? */
export function shouldAutoRefresh(opts: {
  visible: boolean
  inFlight: boolean
  lastAttemptAt: number | null
  now: number
  enabled: boolean
}): boolean {
  if (!opts.enabled || !opts.visible || opts.inFlight) return false
  return refreshAllowed(opts.lastAttemptAt, opts.now)
}
