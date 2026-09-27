import { useCallback, useEffect, useState } from 'react'

/**
 * Minimal hash router: "#/", "#/?q=abc&state=queued,failed" and "#/jobs/<id>".
 * Hash routing needs no server rewrites, so the export works on any static host.
 */
export interface Route {
  path: string
  params: URLSearchParams
}

export function parseHash(hash: string): Route {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const [pathPart, query = ''] = raw.split('?', 2)
  const path = pathPart === '' ? '/' : pathPart
  return { path, params: new URLSearchParams(query) }
}

export function buildHash(path: string, params?: URLSearchParams | Record<string, string>): string {
  const sp = params instanceof URLSearchParams ? params : new URLSearchParams(params ?? {})
  const q = sp.toString()
  return `#${path}${q ? `?${q}` : ''}`
}

export function useHashRoute(): [Route, (hash: string, replace?: boolean) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  const navigate = useCallback((hash: string, replace = false) => {
    if (replace) {
      const url = `${window.location.pathname}${window.location.search}${hash}`
      window.history.replaceState(null, '', url)
      setRoute(parseHash(hash))
    } else {
      window.location.hash = hash
    }
  }, [])
  return [route, navigate]
}
