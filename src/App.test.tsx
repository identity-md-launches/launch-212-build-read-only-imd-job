import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { ApiJobDetail, ApiJobSummary } from './api/types'

const liveJobs: ApiJobSummary[] = [
  {
    id: 'aaaaaaaa-1111-4111-8111-111111111111',
    state: 'executing',
    template: 'skill:build-website',
    objective: 'Build a live dashboard for testing',
    blockedReason: null,
    delivery: null,
    createdAt: '2026-09-27T02:55:03.807Z',
    updatedAt: '2026-09-27T02:55:16.374Z',
  },
  {
    id: 'bbbbbbbb-2222-4222-8222-222222222222',
    state: 'completed',
    template: 'skill:oracle-assess',
    objective: 'Assess an oracle request',
    blockedReason: null,
    delivery: null,
    createdAt: '2026-09-27T02:00:00.000Z',
    updatedAt: '2026-09-27T02:10:00.000Z',
  },
  {
    id: 'cccccccc-3333-4333-8333-333333333333',
    state: 'executing',
    template: 'skill:research-report',
    objective: 'Executing job with a repository link already recorded',
    blockedReason: null,
    delivery: { repoUrl: 'https://github.com/example/repo', pullRequestUrl: null, commit: null, deliveredAt: null },
    createdAt: '2026-09-27T01:00:00.000Z',
    updatedAt: '2026-09-27T01:30:00.000Z',
  },
]

const liveDetail = (s: ApiJobSummary): ApiJobDetail => ({
  ...s,
  nodes: [
    {
      key: 'build_website',
      role: 'implement',
      state: 'working',
      attempt: 2,
      revisions: 1,
      dependsOn: [],
      allowedPaths: [],
      failureReason: null,
      dispatchNote: null,
      dispatchNoteAt: null,
      updatedAt: s.updatedAt,
      verdict: null,
      seat: { tokenId: '1081', agentId: '50985' },
    },
  ],
  reviews: [],
})

type FetchMode = 'ok' | 'cors' | 'http500'
let fetchMode: FetchMode = 'ok'
let fetchCalls: string[] = []

function installFetch() {
  fetchCalls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      fetchCalls.push(url)
      if (fetchMode === 'cors') throw new TypeError('Failed to fetch')
      if (fetchMode === 'http500') return new Response('oops', { status: 500 })
      if (/\/jobs\?limit=\d+$/.test(url)) {
        return new Response(JSON.stringify({ count: liveJobs.length, jobs: liveJobs }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      const m = url.match(/\/jobs\/([^/?]+)$/)
      if (m) {
        const s = liveJobs.find((j) => j.id === decodeURIComponent(m[1]))
        if (!s) return new Response(JSON.stringify({ error: 'invalid_job_id' }), { status: 400 })
        return new Response(JSON.stringify(liveDetail(s)), { status: 200 })
      }
      return new Response('not found', { status: 404 })
    }),
  )
}

beforeEach(() => {
  fetchMode = 'ok'
  window.location.hash = ''
  installFetch()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function flush() {
  // Let pending fetch promises and state updates settle (works with fake timers too).
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve()
    if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(0)
    else await new Promise((r) => setTimeout(r, 0))
  })
}

describe('live mode', () => {
  it('renders live rows, seats and attempts, and labels the source as live', async () => {
    render(<App />)
    expect(screen.getByText('Loading live data')).toBeInTheDocument()
    await flush()
    await flush()
    expect(screen.getByText('Live data')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: /jobs, page 1 of 1/i })
    expect(within(table).getAllByRole('row')).toHaveLength(1 + liveJobs.length)
    expect(within(table).getAllByText('seat 1081 · agent 50985').length).toBeGreaterThan(0)
    expect(within(table).getAllByText(/1 node, 1 revision/).length).toBe(liveJobs.length)
    // Delivery link on an executing job is not shown as completed.
    const row = within(table).getByRole('link', { name: /open job cccccccc/i }).closest('tr') as HTMLElement
    expect(within(row).getByText('Executing')).toBeInTheDocument()
    expect(within(row).getByText(/Completion is taken from the state only/)).toBeInTheDocument()
    expect(within(row).queryByText('Completed')).not.toBeInTheDocument()
    // No mock labels on live rows.
    expect(screen.queryByText('Mock')).not.toBeInTheDocument()
  })

  it('search, state filter and clear filters work; empty state names the query', async () => {
    const user = userEvent.setup()
    render(<App />)
    await flush()
    await flush()
    await user.type(screen.getByLabelText('Search'), 'oracle')
    expect(screen.getByText('1 of 3 loaded jobs match')).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Search'))
    await user.type(screen.getByLabelText('Search'), 'zzz-nothing')
    const empty = screen.getByText(/No jobs match “zzz-nothing”/).closest('.empty') as HTMLElement
    await user.click(within(empty).getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByText('Showing all 3 loaded jobs')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: /^Executing/ }))
    expect(screen.getByText('2 of 3 loaded jobs match')).toBeInTheDocument()
    expect(window.location.hash).toContain('state=executing')
  })

  it('opens a job detail via the hash route and returns to the list', async () => {
    const user = userEvent.setup()
    render(<App />)
    await flush()
    await flush()
    await user.click(screen.getByRole('link', { name: /open job aaaaaaaa/i }))
    await flush()
    expect(screen.getByRole('heading', { level: 1, name: liveJobs[0].id })).toBeInTheDocument()
    expect(screen.getByText(/2 highest · 2 total across 1 node · 1 revisions/)).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'build_website' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /back to all jobs/i }))
    await flush()
    expect(screen.getByRole('table', { name: /jobs, page/i })).toBeInTheDocument()
  })

  it('shows "not found" for an unknown id', async () => {
    window.location.hash = '#/jobs/does-not-exist'
    render(<App />)
    await flush()
    await flush()
    expect(screen.getByRole('heading', { name: 'Job not found' })).toBeInTheDocument()
  })
})

describe('refresh behaviour', () => {
  it('fetches the list at most once per minute while visible, and not while hidden', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    render(<App />)
    await flush()
    const listCalls = () => fetchCalls.filter((u) => /\/jobs\?limit=/.test(u)).length
    expect(listCalls()).toBe(1)
    const refreshButton = screen.getByRole('button', { name: 'Refresh now' })
    expect(refreshButton).toBeDisabled()
    expect(screen.getByText(/Next refresh allowed in \d+ seconds?\./)).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(listCalls()).toBe(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000)
    })
    await flush()
    expect(listCalls()).toBe(2)

    // Hidden tab: no further refreshes, even after several minutes.
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60_000)
    })
    expect(listCalls()).toBe(2)

    // Visible again: one refresh at once, then the minute gate applies.
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await flush()
    expect(listCalls()).toBe(3)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(listCalls()).toBe(3)
    expect(screen.getByRole('button', { name: 'Refresh now' })).toBeDisabled()
  })
})

describe('fixture mode', () => {
  it('falls back to a labelled offline snapshot when the API is blocked (CORS/network)', async () => {
    fetchMode = 'cors'
    render(<App />)
    await flush()
    await flush()
    expect(screen.getByText('Fixture mode: offline snapshot, not live')).toBeInTheDocument()
    expect(screen.getByText(/browser blocked the request/)).toBeInTheDocument()
    // Mock rows are labelled, and queued/failed states are present.
    expect(screen.getAllByText('Mock').length).toBeGreaterThan(0)
    expect(screen.getByRole('checkbox', { name: /^Queued/ })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /^Failed/ })).toBeInTheDocument()
    // Never claims live success.
    expect(screen.queryByText('Live data')).not.toBeInTheDocument()
  })

  it('reports an HTTP error as stale/offline rather than success', async () => {
    fetchMode = 'http500'
    render(<App />)
    await flush()
    await flush()
    expect(screen.getByText(/answered with HTTP 500/)).toBeInTheDocument()
    expect(screen.getByText('Fixture mode: offline snapshot, not live')).toBeInTheDocument()
  })

  it('marks live data stale when a later refresh fails, keeping the last good rows', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    render(<App />)
    await flush()
    expect(screen.getByText('Live data')).toBeInTheDocument()
    fetchMode = 'cors'
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000)
    })
    await flush()
    expect(screen.getByText('Live data is stale')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /jobs, page/i })).toBeInTheDocument()
    expect(screen.queryByText('Mock')).not.toBeInTheDocument()
  })

  it('can be chosen manually and the refresh button explains why it is off', async () => {
    const user = userEvent.setup()
    render(<App />)
    await flush()
    await flush()
    await user.selectOptions(screen.getByLabelText('Data source'), 'fixture')
    expect(screen.getByText('Fixture mode: offline snapshot, not live')).toBeInTheDocument()
    expect(screen.getByText(/Chosen manually/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh now' })).toBeDisabled()
    expect(screen.getByText('Switch to the live API to refresh.')).toBeInTheDocument()
    // Fixture detail shows the offline notice.
    await user.click(screen.getByRole('link', { name: /open job 00000000-0000-4000-8000-00000000f001/i }))
    await flush()
    expect(screen.getByText(/Offline snapshot: this record was captured/)).toBeInTheDocument()
    expect(screen.getByText('Mock data')).toBeInTheDocument()
  })

  it('paginates the bounded snapshot with clamped page numbers', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/?source=fixture&size=10&page=99'
    render(<App />)
    await flush()
    expect(screen.getByText(/Page 6 of 6/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(screen.getByText(/Page 5 of 6/)).toBeInTheDocument()
    expect(screen.getByText(/Rows 41–50 of 51/)).toBeInTheDocument()
  })
})

describe('keyboard navigation', () => {
  it('tabs from the skip link through the controls to the first job link', async () => {
    const user = userEvent.setup()
    render(<App initialSource="fixture" autoRefresh={false} />)
    await flush()
    await user.tab()
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveFocus()
    await user.tab() // header link (dashboard title)
    await user.tab() // raw feed link
    await user.tab()
    expect(screen.getByLabelText('Data source')).toHaveFocus()
    await user.tab() // refresh button (disabled buttons are skipped) -> search
    expect(screen.getByLabelText('Search')).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText('Template')).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText('Sort by')).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('checkbox', { name: /^Queued/ })).toHaveFocus()
    await user.keyboard(' ')
    expect(screen.getByRole('checkbox', { name: /^Queued/ })).toBeChecked()
    expect(screen.getByText('1 of 51 loaded jobs match')).toBeInTheDocument()
  })
})
