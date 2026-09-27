const UNITS: Array<[label: string, ms: number]> = [
  ['year', 365 * 24 * 3600_000],
  ['month', 30 * 24 * 3600_000],
  ['day', 24 * 3600_000],
  ['hour', 3600_000],
  ['minute', 60_000],
]

/** "just now", "3 minutes ago", "2 hours ago" — English only, no fragments joined at runtime. */
export function formatRelative(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return 'Unknown'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return 'Unknown'
  const diff = now - t
  if (diff < 45_000) return 'just now'
  for (const [label, ms] of UNITS) {
    if (diff >= ms) {
      const n = Math.floor(diff / ms)
      return n === 1 ? `1 ${label} ago` : `${n} ${label}s ago`
    }
  }
  return 'just now'
}

const absFormatter = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'UTC',
  timeZoneName: 'short',
})

/** Stable absolute timestamp in UTC, e.g. "27 Sept 2026, 02:55:16 UTC". */
export function formatAbsolute(iso: string | null | undefined): string {
  if (!iso) return 'Unknown'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso
  return absFormatter.format(t)
}

export function formatSeconds(ms: number): string {
  const s = Math.ceil(ms / 1000)
  return s === 1 ? '1 second' : `${s} seconds`
}
