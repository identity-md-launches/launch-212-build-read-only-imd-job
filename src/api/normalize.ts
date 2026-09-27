import type { ApiJobDetail, ApiJobSummary, ApiNode, JobState } from './types'

/**
 * Map the API's free-form state string onto the dashboard's state set.
 * Completion is decided ONLY by this field. A delivery record or repository
 * URL never promotes a job to "completed" (see `deliveryNotice`).
 */
export function normalizeState(raw: string | null | undefined): JobState {
  const s = (raw ?? '').toLowerCase()
  if (s === 'queued' || s === 'pending' || s === 'waiting' || s === 'created') return 'queued'
  if (s === 'executing' || s === 'running' || s === 'working' || s === 'leased') return 'executing'
  if (s === 'completed' || s === 'complete' || s === 'accepted' || s === 'done') return 'completed'
  if (s === 'failed' || s === 'error' || s === 'rejected' || s === 'cancelled' || s === 'canceled') return 'failed'
  if (s === 'blocked') return 'blocked'
  return 'other'
}

export const STATE_ORDER: JobState[] = ['queued', 'executing', 'blocked', 'failed', 'completed', 'other']

export const STATE_LABEL: Record<JobState, string> = {
  queued: 'Queued',
  executing: 'Executing',
  completed: 'Completed',
  failed: 'Failed',
  blocked: 'Blocked',
  other: 'Other',
}

export interface SeatRef {
  nodeKey: string
  tokenId: string
  agentId: string
}

export interface NodeSummary {
  /** Seats assigned to nodes of this job, one entry per node. */
  seats: SeatRef[]
  /** Distinct seats (tokenId + agentId), with the node keys that used each. */
  uniqueSeats: Array<{ tokenId: string; agentId: string; nodeKeys: string[] }>
  /** Highest attempt number across nodes. */
  maxAttempt: number
  /** Sum of attempts across nodes. */
  totalAttempts: number
  /** Sum of revisions across nodes. */
  totalRevisions: number
  nodeCount: number
  nodesByState: Record<string, number>
}

export function summarizeNodes(nodes: ApiNode[] | undefined): NodeSummary {
  const seats: SeatRef[] = []
  let maxAttempt = 0
  let totalAttempts = 0
  let totalRevisions = 0
  const nodesByState: Record<string, number> = {}
  for (const n of nodes ?? []) {
    if (n.seat) seats.push({ nodeKey: n.key, tokenId: n.seat.tokenId, agentId: n.seat.agentId })
    maxAttempt = Math.max(maxAttempt, n.attempt ?? 0)
    totalAttempts += n.attempt ?? 0
    totalRevisions += n.revisions ?? 0
    nodesByState[n.state] = (nodesByState[n.state] ?? 0) + 1
  }
  const uniqueSeats: NodeSummary['uniqueSeats'] = []
  for (const s of seats) {
    const found = uniqueSeats.find((u) => u.tokenId === s.tokenId && u.agentId === s.agentId)
    if (found) found.nodeKeys.push(s.nodeKey)
    else uniqueSeats.push({ tokenId: s.tokenId, agentId: s.agentId, nodeKeys: [s.nodeKey] })
  }
  return { seats, uniqueSeats, maxAttempt, totalAttempts, totalRevisions, nodeCount: nodes?.length ?? 0, nodesByState }
}

/**
 * Text shown next to a delivery record. Makes the "repository URL is not a
 * completion signal" rule explicit in the interface.
 */
export function deliveryNotice(job: Pick<ApiJobSummary | ApiJobDetail, 'state' | 'delivery'>): string | null {
  if (!job.delivery || !job.delivery.repoUrl) return null
  const state = normalizeState(job.state)
  if (state === 'completed') return null
  return `A repository link is recorded, but the job state is ${STATE_LABEL[state]}. Completion is taken from the state only.`
}

export function shortId(id: string): string {
  return id.length > 13 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id
}

/** Is the summary the same version as the detail (nothing changed since)? */
export function detailIsCurrent(summary: ApiJobSummary, detail: ApiJobDetail | undefined): boolean {
  return !!detail && detail.updatedAt === summary.updatedAt && detail.state === summary.state
}
