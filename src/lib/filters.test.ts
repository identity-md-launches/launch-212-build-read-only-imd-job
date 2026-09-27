import { describe, expect, it } from 'vitest'
import type { ApiJobSummary } from '../api/types'
import { applyFilters, EMPTY_FILTERS, filtersFromParams, paginate, paramsFromFilters } from './filters'

const job = (over: Partial<ApiJobSummary>): ApiJobSummary => ({
  id: 'id',
  state: 'completed',
  template: 'skill:oracle-assess',
  objective: 'objective',
  blockedReason: null,
  delivery: null,
  createdAt: '2026-09-27T00:00:00.000Z',
  updatedAt: '2026-09-27T00:00:00.000Z',
  ...over,
})

const jobs: ApiJobSummary[] = [
  job({ id: 'a1', state: 'executing', objective: 'Build a dashboard', updatedAt: '2026-09-27T03:00:00.000Z' }),
  job({ id: 'b2', state: 'queued', template: 'shape:chain', objective: 'Escrow contract', updatedAt: '2026-09-27T02:00:00.000Z' }),
  job({ id: 'c3', state: 'completed', objective: 'Assess oracle', updatedAt: '2026-09-27T01:00:00.000Z', delivery: { repoUrl: 'https://x', pullRequestUrl: null, commit: null, deliveredAt: null } }),
  job({ id: 'd4', state: 'blocked', blockedReason: 'node x: runtime_error', updatedAt: '2026-09-27T00:30:00.000Z' }),
]

describe('applyFilters', () => {
  it('searches id, objective, template and blocked reason case-insensitively', () => {
    expect(applyFilters(jobs, { ...EMPTY_FILTERS, q: 'DASHBOARD' }).map((j) => j.id)).toEqual(['a1'])
    expect(applyFilters(jobs, { ...EMPTY_FILTERS, q: 'runtime_error' }).map((j) => j.id)).toEqual(['d4'])
    expect(applyFilters(jobs, { ...EMPTY_FILTERS, q: 'shape:' }).map((j) => j.id)).toEqual(['b2'])
    expect(applyFilters(jobs, { ...EMPTY_FILTERS, q: 'c3' }).map((j) => j.id)).toEqual(['c3'])
  })

  it('filters by normalised state and by template', () => {
    expect(applyFilters(jobs, { ...EMPTY_FILTERS, states: ['queued', 'blocked'] }).map((j) => j.id)).toEqual(['b2', 'd4'])
    expect(applyFilters(jobs, { ...EMPTY_FILTERS, template: 'shape:chain' }).map((j) => j.id)).toEqual(['b2'])
  })

  it('sorts by updated (default) and by state rank', () => {
    expect(applyFilters(jobs, EMPTY_FILTERS).map((j) => j.id)).toEqual(['a1', 'b2', 'c3', 'd4'])
    expect(applyFilters(jobs, { ...EMPTY_FILTERS, sort: 'state' }).map((j) => j.id)).toEqual(['b2', 'a1', 'd4', 'c3'])
  })
})

describe('paginate', () => {
  it('clamps out-of-range pages and reports bounds', () => {
    const s = paginate([1, 2, 3, 4, 5], 9, 2)
    expect(s.page).toBe(3)
    expect(s.pageCount).toBe(3)
    expect(s.items).toEqual([5])
    expect(s.from).toBe(5)
    expect(s.to).toBe(5)
    const empty = paginate([], 1, 10)
    expect(empty.pageCount).toBe(1)
    expect(empty.from).toBe(0)
  })
})

describe('URL round trip', () => {
  it('encodes and decodes filters, ignoring unknown values', () => {
    const f = { ...EMPTY_FILTERS, q: 'x y', states: ['queued' as const], template: 'shape:chain', page: 3, size: 50 }
    const back = filtersFromParams(paramsFromFilters(f))
    expect(back).toEqual(f)
    expect(filtersFromParams(new URLSearchParams('state=bogus,failed&size=7&page=-2&sort=nope'))).toEqual({ ...EMPTY_FILTERS, states: ['failed'] })
  })
})
