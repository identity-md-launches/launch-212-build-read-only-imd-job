import { describe, expect, it } from 'vitest'
import { deliveryNotice, normalizeState, summarizeNodes } from './normalize'
import type { ApiNode } from './types'

describe('normalizeState', () => {
  it('maps API values onto the dashboard states', () => {
    expect(normalizeState('queued')).toBe('queued')
    expect(normalizeState('executing')).toBe('executing')
    expect(normalizeState('completed')).toBe('completed')
    expect(normalizeState('failed')).toBe('failed')
    expect(normalizeState('blocked')).toBe('blocked')
    expect(normalizeState('something-new')).toBe('other')
    expect(normalizeState(null)).toBe('other')
  })
})

describe('deliveryNotice', () => {
  const delivery = { repoUrl: 'https://github.com/x/y', pullRequestUrl: null, commit: null, deliveredAt: null }
  it('never treats a repository URL as completion', () => {
    expect(deliveryNotice({ state: 'executing', delivery })).toMatch(/job state is Executing/)
    expect(deliveryNotice({ state: 'failed', delivery })).toMatch(/job state is Failed/)
    expect(deliveryNotice({ state: 'completed', delivery })).toBeNull()
    expect(deliveryNotice({ state: 'executing', delivery: null })).toBeNull()
  })
})

describe('summarizeNodes', () => {
  const node = (over: Partial<ApiNode>): ApiNode => ({
    key: 'k',
    role: 'implement',
    state: 'working',
    attempt: 0,
    revisions: 0,
    dependsOn: [],
    allowedPaths: [],
    failureReason: null,
    dispatchNote: null,
    dispatchNoteAt: null,
    updatedAt: '2026-09-27T00:00:00.000Z',
    verdict: null,
    seat: null,
    ...over,
  })
  it('collects seats and attempt counts', () => {
    const s = summarizeNodes([
      node({ key: 'a', attempt: 3, revisions: 1, seat: { tokenId: '1', agentId: '9' } }),
      node({ key: 'b', attempt: 1, state: 'waiting' }),
    ])
    expect(s.seats).toEqual([{ nodeKey: 'a', tokenId: '1', agentId: '9' }])
    expect(s.maxAttempt).toBe(3)
    expect(s.totalAttempts).toBe(4)
    expect(s.totalRevisions).toBe(1)
    expect(s.nodeCount).toBe(2)
    expect(s.nodesByState).toEqual({ working: 1, waiting: 1 })
  })
})
