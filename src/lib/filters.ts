import { normalizeState, STATE_ORDER } from '../api/normalize'
import type { ApiJobSummary, JobState } from '../api/types'

export type SortKey = 'updated' | 'created' | 'state'

export interface FilterState {
  q: string
  states: JobState[]
  template: string
  sort: SortKey
  page: number
  size: number
}

export const PAGE_SIZES = [10, 25, 50] as const
export const DEFAULT_SIZE = 25

export const EMPTY_FILTERS: FilterState = { q: '', states: [], template: '', sort: 'updated', page: 1, size: DEFAULT_SIZE }

export function filtersFromParams(p: URLSearchParams): FilterState {
  const states = (p.get('state') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is JobState => (STATE_ORDER as string[]).includes(s))
  const sortRaw = p.get('sort')
  const sort: SortKey = sortRaw === 'created' || sortRaw === 'state' ? sortRaw : 'updated'
  const sizeRaw = Number(p.get('size'))
  const size = (PAGE_SIZES as readonly number[]).includes(sizeRaw) ? sizeRaw : DEFAULT_SIZE
  const pageRaw = Number(p.get('page'))
  const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1
  return { q: p.get('q') ?? '', states, template: p.get('template') ?? '', sort, page, size }
}

export function paramsFromFilters(f: FilterState): URLSearchParams {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.states.length) p.set('state', f.states.join(','))
  if (f.template) p.set('template', f.template)
  if (f.sort !== 'updated') p.set('sort', f.sort)
  if (f.size !== DEFAULT_SIZE) p.set('size', String(f.size))
  if (f.page > 1) p.set('page', String(f.page))
  return p
}

export function hasActiveFilters(f: FilterState): boolean {
  return !!f.q || f.states.length > 0 || !!f.template
}

function matchesQuery(job: ApiJobSummary, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  const hay = [job.id, job.template ?? '', job.objective ?? '', job.blockedReason ?? '', job.delivery?.repoUrl ?? '']
    .join('\n')
    .toLowerCase()
  return hay.includes(needle)
}

export function applyFilters(jobs: ApiJobSummary[], f: FilterState): ApiJobSummary[] {
  const stateSet = new Set(f.states)
  const out = jobs.filter(
    (j) =>
      matchesQuery(j, f.q) &&
      (stateSet.size === 0 || stateSet.has(normalizeState(j.state))) &&
      (!f.template || j.template === f.template),
  )
  const stateRank = (j: ApiJobSummary) => STATE_ORDER.indexOf(normalizeState(j.state))
  out.sort((a, b) => {
    if (f.sort === 'state') {
      const d = stateRank(a) - stateRank(b)
      if (d !== 0) return d
    }
    if (f.sort === 'created') return b.createdAt.localeCompare(a.createdAt)
    return b.updatedAt.localeCompare(a.updatedAt)
  })
  return out
}

export interface PageSlice<T> {
  items: T[]
  page: number
  pageCount: number
  from: number
  to: number
  total: number
}

/** Bounded, clamped client-side pagination over an already bounded list. */
export function paginate<T>(items: T[], page: number, size: number): PageSlice<T> {
  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / size))
  const safePage = Math.min(Math.max(1, page), pageCount)
  const start = (safePage - 1) * size
  const slice = items.slice(start, start + size)
  return {
    items: slice,
    page: safePage,
    pageCount,
    from: total === 0 ? 0 : start + 1,
    to: start + slice.length,
    total,
  }
}

export function countByState(jobs: ApiJobSummary[]): Record<JobState, number> {
  const counts: Record<JobState, number> = { queued: 0, executing: 0, completed: 0, failed: 0, blocked: 0, other: 0 }
  for (const j of jobs) counts[normalizeState(j.state)]++
  return counts
}

export function templatesOf(jobs: ApiJobSummary[]): string[] {
  return Array.from(new Set(jobs.map((j) => j.template ?? '').filter(Boolean))).sort()
}
