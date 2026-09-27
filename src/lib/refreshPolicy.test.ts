import { describe, expect, it } from 'vitest'
import { MIN_REFRESH_INTERVAL_MS, msUntilAllowed, refreshAllowed, shouldAutoRefresh } from './refreshPolicy'

describe('refresh policy', () => {
  it('allows the first refresh immediately', () => {
    expect(refreshAllowed(null, 1000)).toBe(true)
    expect(msUntilAllowed(null, 1000)).toBe(0)
  })

  it('blocks a second refresh inside one minute', () => {
    const t0 = 100_000
    expect(refreshAllowed(t0, t0 + 59_999)).toBe(false)
    expect(msUntilAllowed(t0, t0 + 30_000)).toBe(30_000)
    expect(refreshAllowed(t0, t0 + MIN_REFRESH_INTERVAL_MS)).toBe(true)
  })

  it('never auto-refreshes while hidden, in flight or disabled', () => {
    const base = { lastAttemptAt: null, now: 5, enabled: true, inFlight: false, visible: true }
    expect(shouldAutoRefresh(base)).toBe(true)
    expect(shouldAutoRefresh({ ...base, visible: false })).toBe(false)
    expect(shouldAutoRefresh({ ...base, inFlight: true })).toBe(false)
    expect(shouldAutoRefresh({ ...base, enabled: false })).toBe(false)
  })
})
