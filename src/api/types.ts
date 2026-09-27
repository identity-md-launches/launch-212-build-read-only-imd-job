// Shapes observed on https://api.imd.fun on 2026-09-27. Unknown fields are
// tolerated; the normalizer only reads what the dashboard shows.

export interface ApiDelivery {
  repoUrl: string | null
  pullRequestUrl: string | null
  commit: string | null
  deliveredAt: string | null
  media?: unknown
}

export interface ApiJobSummary {
  id: string
  state: string
  template: string | null
  objective: string | null
  originalRequest?: string | null
  blockedReason: string | null
  delivery: ApiDelivery | null
  createdAt: string
  updatedAt: string
  /** Fixture-only marker: true for invented rows, absent on live data. */
  synthetic?: boolean
}

export interface ApiJobList {
  count: number
  jobs: ApiJobSummary[]
}

export interface ApiSeat {
  tokenId: string
  agentId: string
}

export interface ApiVerdict {
  status: string | null
  profile: string | null
  evaluation: string | null
  rejectionCode: string | null
  detail: string | null
  verifierVersion: string | null
  verifiedTreeHash: string | null
  at: string | null
  failedChecks: string[]
}

export interface ApiNode {
  key: string
  role: string
  state: string
  attempt: number
  revisions: number
  dependsOn: string[]
  allowedPaths: string[]
  failureReason: string | null
  dispatchNote: string | null
  dispatchNoteAt: string | null
  updatedAt: string
  verdict: ApiVerdict | null
  seat: ApiSeat | null
}

export interface ApiReviewEntry {
  nodeKey: string
  agentId: string
  value: number
  role: string
}

export interface ApiReview {
  status: string
  chainId: number | null
  txHash: string | null
  blockNumber: number | null
  sentAt: string | null
  entries: ApiReviewEntry[]
}

export interface ApiLaunch {
  requested: boolean
  kind: string | null
  id: string | null
  status: string | null
  chainId: number | null
}

export interface ApiJobDetail {
  id: string
  state: string
  template: string | null
  objective: string | null
  blockedReason: string | null
  createdAt: string
  updatedAt: string
  deliver?: boolean
  host?: boolean
  site?: unknown
  launch?: ApiLaunch | null
  oracleRequestId?: string | null
  delivery: ApiDelivery | null
  nodes: ApiNode[]
  reviews: ApiReview[]
  workflow?: unknown
  planning?: unknown
  synthetic?: boolean
}

/** The five states the dashboard distinguishes, plus a catch-all. */
export type JobState = 'queued' | 'executing' | 'completed' | 'failed' | 'blocked' | 'other'

export interface Fixture {
  kind: 'imd-jobs-fixture'
  source: string
  capturedAt: string
  note: string
  jobs: ApiJobSummary[]
  details: Record<string, ApiJobDetail>
}
