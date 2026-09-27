import type { ApiJobDetail, ApiJobList } from './types'

/** Public API base. Override at build time with VITE_IMD_API_BASE for local proxies. */
export const API_BASE: string = (import.meta.env.VITE_IMD_API_BASE as string | undefined) ?? 'https://api.imd.fun'

/** Upper bound on rows requested from /jobs in one call (bounded pagination). */
export const LIST_LIMIT = 200

const REQUEST_TIMEOUT_MS = 15_000

export type ApiErrorKind = 'network' | 'http' | 'parse' | 'timeout'

export class ApiError extends Error {
  kind: ApiErrorKind
  status?: number
  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

/** Human explanation with a next step, used by the offline banner. */
export function describeApiError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.kind) {
      case 'network':
        return 'Unable to reach the live API. The browser blocked the request (often missing CORS headers) or the network is offline.'
      case 'timeout':
        return 'The live API did not answer within 15 seconds.'
      case 'http':
        return `The live API answered with HTTP ${err.status ?? 'error'}.`
      case 'parse':
        return 'The live API answered with data the dashboard could not read.'
    }
  }
  return 'Unable to load live data.'
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const onOuterAbort = () => controller.abort()
  signal?.addEventListener('abort', onOuterAbort)
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      // Read-only dashboard: never send credentials.
      credentials: 'omit',
    })
  } catch (e) {
    if (signal?.aborted) throw new ApiError('network', 'Request cancelled')
    if (controller.signal.aborted) throw new ApiError('timeout', 'Request timed out')
    throw new ApiError('network', e instanceof Error ? e.message : 'Network error')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onOuterAbort)
  }
  if (!res.ok) throw new ApiError('http', `HTTP ${res.status}`, res.status)
  try {
    return (await res.json()) as T
  } catch {
    throw new ApiError('parse', 'Invalid JSON')
  }
}

export async function fetchJobList(signal?: AbortSignal, limit: number = LIST_LIMIT): Promise<ApiJobList> {
  const data = await getJson<ApiJobList>(`/jobs?limit=${limit}`, signal)
  if (!data || !Array.isArray(data.jobs)) throw new ApiError('parse', 'Missing jobs array')
  return data
}

export async function fetchJobDetail(id: string, signal?: AbortSignal): Promise<ApiJobDetail> {
  const data = await getJson<ApiJobDetail>(`/jobs/${encodeURIComponent(id)}`, signal)
  if (!data || typeof data.id !== 'string') throw new ApiError('parse', 'Missing job id')
  return data
}
