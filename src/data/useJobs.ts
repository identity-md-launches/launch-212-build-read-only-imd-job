import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { describeApiError, fetchJobDetail, fetchJobList } from '../api/client'
import type { ApiJobDetail, ApiJobSummary, Fixture } from '../api/types'
import fixtureJson from '../fixtures/snapshot.json'
import { detailIsCurrent } from '../api/normalize'
import { MIN_REFRESH_INTERVAL_MS, shouldAutoRefresh } from '../lib/refreshPolicy'

export const fixture = fixtureJson as Fixture

/** Which source the person asked for. */
export type SourceChoice = 'live' | 'fixture'

/**
 * What is actually on screen:
 *  - live:            last live fetch succeeded, data is fresh (≤ interval)
 *  - live-stale:      a live fetch succeeded earlier, the latest attempt failed
 *  - fixture-auto:    no live fetch has ever succeeded; showing the offline snapshot
 *  - fixture-manual:  the person chose the fixture explicitly
 *  - loading:         first live request still in flight
 */
export type DataMode = 'live' | 'live-stale' | 'fixture-auto' | 'fixture-manual' | 'loading'

export type DetailStatus =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; detail: ApiJobDetail }
  | { status: 'error'; message: string }
  | { status: 'missing' } // fixture mode: the snapshot has no detail for this id

interface State {
  source: SourceChoice
  jobs: ApiJobSummary[]
  liveJobs: ApiJobSummary[] | null
  details: Record<string, DetailStatus>
  inFlight: boolean
  lastAttemptAt: number | null
  lastSuccessAt: number | null
  lastError: string | null
  /** ms wall clock, bumped every second so countdowns re-render. */
  tick: number
}

type Action =
  | { type: 'set-source'; source: SourceChoice }
  | { type: 'list-start'; at: number }
  | { type: 'list-success'; at: number; jobs: ApiJobSummary[] }
  | { type: 'list-failure'; at: number; message: string }
  | { type: 'detail'; id: string; value: DetailStatus }
  | { type: 'tick'; at: number }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'set-source': {
      if (action.source === state.source) return state
      if (action.source === 'fixture') {
        return { ...state, source: 'fixture', jobs: fixture.jobs, details: fixtureDetails() }
      }
      // Back to live: reuse the last live list if we have one; otherwise the
      // fixture stays on screen (labelled) until a live fetch succeeds.
      return {
        ...state,
        source: 'live',
        jobs: state.liveJobs ?? fixture.jobs,
        details: state.liveJobs ? {} : fixtureDetails(),
      }
    }
    case 'list-start':
      return { ...state, inFlight: true, lastAttemptAt: action.at }
    case 'list-success': {
      // Invalidate cached details whose summary changed.
      const details: Record<string, DetailStatus> = {}
      for (const j of action.jobs) {
        const d = state.details[j.id]
        if (d && d.status === 'ready' && detailIsCurrent(j, d.detail)) details[j.id] = d
      }
      return {
        ...state,
        inFlight: false,
        lastSuccessAt: action.at,
        lastError: null,
        liveJobs: action.jobs,
        jobs: state.source === 'live' ? action.jobs : state.jobs,
        details: state.source === 'live' ? details : state.details,
      }
    }
    case 'list-failure':
      return {
        ...state,
        inFlight: false,
        lastError: action.message,
        // Never seen live data: fall back to the labelled fixture.
        jobs: state.source === 'live' && state.liveJobs === null ? fixture.jobs : state.jobs,
        details: state.source === 'live' && state.liveJobs === null ? fixtureDetails() : state.details,
      }
    case 'detail':
      return { ...state, details: { ...state.details, [action.id]: action.value } }
    case 'tick':
      return state.tick === action.at ? state : { ...state, tick: action.at }
  }
}

function fixtureDetails(): Record<string, DetailStatus> {
  const out: Record<string, DetailStatus> = {}
  for (const j of fixture.jobs) {
    const d = fixture.details[j.id]
    out[j.id] = d ? { status: 'ready', detail: d } : { status: 'missing' }
  }
  return out
}

const DETAIL_CONCURRENCY = 3

export interface JobsStore {
  source: SourceChoice
  mode: DataMode
  jobs: ApiJobSummary[]
  details: Record<string, DetailStatus>
  inFlight: boolean
  lastAttemptAt: number | null
  lastSuccessAt: number | null
  lastError: string | null
  now: number
  /** ms until a manual or automatic refresh is allowed (0 = now). */
  msUntilRefresh: number
  autoRefresh: boolean
  setSource: (s: SourceChoice) => void
  refresh: () => void
  ensureDetails: (ids: string[]) => void
  fixtureCapturedAt: string
}

export function useJobs(options: { autoRefresh?: boolean; initialSource?: SourceChoice } = {}): JobsStore {
  const autoRefresh = options.autoRefresh ?? true
  const [state, dispatch] = useReducer(reducer, options.initialSource ?? 'live', (initialSource): State => ({
    source: initialSource,
    jobs: initialSource === 'fixture' ? fixture.jobs : [],
    liveJobs: null,
    details: initialSource === 'fixture' ? fixtureDetails() : {},
    inFlight: false,
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastError: null,
    tick: Date.now(),
  }))

  const stateRef = useRef(state)
  stateRef.current = state
  const abortRef = useRef<AbortController | null>(null)
  const detailQueue = useRef<string[]>([])
  const detailActive = useRef(0)
  const detailInFlight = useRef<Set<string>>(new Set())
  // Synchronous gate: React state renders later, so the once-per-minute rule
  // is enforced on refs that update the moment a request starts.
  const listInFlight = useRef(false)
  const lastAttemptRef = useRef<number | null>(null)

  const doRefresh = useCallback(() => {
    const s = stateRef.current
    if (s.source !== 'live' || listInFlight.current) return
    const now = Date.now()
    if (lastAttemptRef.current !== null && now - lastAttemptRef.current < MIN_REFRESH_INTERVAL_MS) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    listInFlight.current = true
    lastAttemptRef.current = now
    dispatch({ type: 'list-start', at: now })
    fetchJobList(controller.signal).then(
      (list) => {
        if (controller.signal.aborted) return
        listInFlight.current = false
        dispatch({ type: 'list-success', at: Date.now(), jobs: list.jobs })
      },
      (err: unknown) => {
        if (controller.signal.aborted) return
        listInFlight.current = false
        dispatch({ type: 'list-failure', at: Date.now(), message: describeApiError(err) })
      },
    )
  }, [])

  // First load. On unmount (or a StrictMode remount) the in-flight request is
  // cancelled, so the gate is reset: a cancelled attempt does not count.
  useEffect(() => {
    if (stateRef.current.source === 'live') doRefresh()
    return () => {
      abortRef.current?.abort()
      listInFlight.current = false
      lastAttemptRef.current = null
    }
  }, [doRefresh])

  // One-second tick: drives countdowns, relative times and the auto-refresh gate.
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now()
      dispatch({ type: 'tick', at: now })
      const s = stateRef.current
      if (
        s.source === 'live' &&
        shouldAutoRefresh({
          enabled: autoRefresh,
          visible: document.visibilityState === 'visible',
          inFlight: listInFlight.current,
          lastAttemptAt: lastAttemptRef.current,
          now,
        })
      ) {
        doRefresh()
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [autoRefresh, doRefresh])

  // Becoming visible again: refresh at once if the minute has elapsed.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible' || !autoRefresh) return
      const s = stateRef.current
      if (s.source === 'live' && shouldAutoRefresh({ enabled: true, visible: true, inFlight: listInFlight.current, lastAttemptAt: lastAttemptRef.current, now: Date.now() })) {
        doRefresh()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [autoRefresh, doRefresh])

  const pumpDetails = useCallback(() => {
    while (detailActive.current < DETAIL_CONCURRENCY && detailQueue.current.length > 0) {
      const id = detailQueue.current.shift() as string
      const s = stateRef.current
      if (s.source !== 'live') continue
      const current = s.details[id]
      if (detailInFlight.current.has(id) || (current && current.status === 'ready')) continue
      detailActive.current++
      detailInFlight.current.add(id)
      dispatch({ type: 'detail', id, value: { status: 'loading' } })
      fetchJobDetail(id)
        .then(
          (detail) => dispatch({ type: 'detail', id, value: { status: 'ready', detail } }),
          (err: unknown) => dispatch({ type: 'detail', id, value: { status: 'error', message: describeApiError(err) } }),
        )
        .finally(() => {
          detailActive.current--
          detailInFlight.current.delete(id)
          pumpDetails()
        })
    }
  }, [])

  const ensureDetails = useCallback(
    (ids: string[]) => {
      const s = stateRef.current
      if (s.source !== 'live') return
      for (const id of ids) {
        const d = s.details[id]
        if (detailInFlight.current.has(id)) continue
        if (d && d.status !== 'idle' && d.status !== 'error') continue
        if (!detailQueue.current.includes(id)) detailQueue.current.push(id)
      }
      pumpDetails()
    },
    [pumpDetails],
  )

  const setSource = useCallback(
    (source: SourceChoice) => {
      dispatch({ type: 'set-source', source })
      if (source === 'live') {
        // A manual switch back to live may fetch immediately if the interval allows.
        queueMicrotask(doRefresh)
      } else {
        abortRef.current?.abort()
        listInFlight.current = false
        detailQueue.current = []
      }
    },
    [doRefresh],
  )

  const now = state.tick
  const msUntilRefresh =
    state.lastAttemptAt === null ? 0 : Math.min(MIN_REFRESH_INTERVAL_MS, Math.max(0, state.lastAttemptAt + MIN_REFRESH_INTERVAL_MS - now))

  const mode: DataMode = useMemo(() => {
    if (state.source === 'fixture') return 'fixture-manual'
    if (state.liveJobs === null) return state.lastError ? 'fixture-auto' : 'loading'
    if (state.lastError) return 'live-stale'
    return 'live'
  }, [state.source, state.liveJobs, state.lastError])

  return {
    source: state.source,
    mode,
    jobs: state.jobs,
    details: state.details,
    inFlight: state.inFlight,
    lastAttemptAt: state.lastAttemptAt,
    lastSuccessAt: state.lastSuccessAt,
    lastError: state.lastError,
    now,
    msUntilRefresh,
    autoRefresh,
    setSource,
    refresh: doRefresh,
    ensureDetails,
    fixtureCapturedAt: fixture.capturedAt,
  }
}
