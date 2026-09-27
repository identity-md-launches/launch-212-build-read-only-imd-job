import { useEffect, useMemo } from 'react'
import { LIST_LIMIT } from './api/client'
import { Filters } from './components/Filters'
import { JobDetail } from './components/JobDetail'
import { JobTable } from './components/JobTable'
import { Pagination } from './components/Pagination'
import { SourceBanner } from './components/SourceBanner'
import { useJobs, type SourceChoice } from './data/useJobs'
import { applyFilters, countByState, filtersFromParams, hasActiveFilters, paginate, paramsFromFilters, templatesOf, type FilterState } from './lib/filters'
import { buildHash, useHashRoute } from './lib/router'

interface AppProps {
  autoRefresh?: boolean
  initialSource?: SourceChoice
}

export default function App({ autoRefresh = true, initialSource }: AppProps = {}) {
  const [route, navigate] = useHashRoute()
  const store = useJobs({ autoRefresh, initialSource: initialSource ?? (route.params.get('source') === 'fixture' ? 'fixture' : 'live') })

  const detailMatch = route.path.match(/^\/jobs\/([^/]+)$/)

  const filters = useMemo(() => filtersFromParams(route.params), [route.params])
  const matched = useMemo(() => applyFilters(store.jobs, filters), [store.jobs, filters])
  const slice = useMemo(() => paginate(matched, filters.page, filters.size), [matched, filters.page, filters.size])
  const counts = useMemo(() => countByState(store.jobs), [store.jobs])
  const templates = useMemo(() => templatesOf(store.jobs), [store.jobs])

  const setFilters = (next: FilterState) => {
    navigate(buildHash('/', paramsFromFilters(next)), true)
  }

  // Load seats/attempts only for the rows on screen (bounded detail fetches).
  const visibleIds = slice.items.map((j) => j.id).join(',')
  useEffect(() => {
    if (detailMatch) return
    if (visibleIds) store.ensureDetails(visibleIds.split(','))
  }, [visibleIds, store.ensureDetails, store.jobs, detailMatch, store.source]) // eslint-disable-line react-hooks/exhaustive-deps

  const listHash = buildHash('/', paramsFromFilters(filters))

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="page">
        <header className="site-header">
          <div className="site-header__title">
            <a href="#/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span style={{ fontSize: 'var(--text-xl)', fontWeight: 650, letterSpacing: '-0.01em' }}>IMD job dashboard</span>
            </a>
            <span className="site-header__subtitle">Read-only view of jobs from api.imd.fun</span>
          </div>
          <a href="https://api.imd.fun/jobs?limit=25" rel="noopener noreferrer">
            Open the raw jobs feed
          </a>
        </header>

        <main id="main" className="stack" tabIndex={-1}>
          <SourceBanner store={store} />

          {detailMatch ? (
            <JobDetail id={decodeURIComponent(detailMatch[1])} store={store} backHash={route.params.get('from') ?? '#/'} />
          ) : (
            <>
              <h1 className="visually-hidden">Jobs</h1>
              <Filters filters={filters} counts={counts} templates={templates} total={store.jobs.length} matched={matched.length} onChange={setFilters} />

              {store.mode === 'loading' && store.jobs.length === 0 ? (
                <div className="card loading-row" role="status">
                  Loading jobs from the live API…
                </div>
              ) : store.jobs.length === 0 ? (
                <div className="card empty">
                  <p className="empty__title">No jobs loaded</p>
                  <p className="empty__body">The API returned an empty list. Refresh later or switch the data source to the offline snapshot.</p>
                </div>
              ) : matched.length === 0 ? (
                <div className="card empty">
                  <p className="empty__title">No jobs match {filters.q ? `“${filters.q}”` : 'these filters'}</p>
                  <p className="empty__body">Try fewer words, another state or another template.</p>
                  {hasActiveFilters(filters) ? (
                    <button type="button" className="button" onClick={() => setFilters({ ...filters, q: '', states: [], template: '', page: 1 })}>
                      Clear filters
                    </button>
                  ) : null}
                </div>
              ) : (
                <>
                  <JobTable jobs={slice.items} details={store.details} now={store.now} caption={`Jobs, page ${slice.page} of ${slice.pageCount}`} listHash={listHash} />
                  <Pagination slice={slice} loadedLimit={LIST_LIMIT} onPage={(p) => setFilters({ ...filters, page: p })} />
                </>
              )}
            </>
          )}
        </main>

        <footer className="site-footer">
          <p>
            States come from each job's <code>state</code> field only; a repository link never counts as completion. This page reads public data and never asks for a wallet
            signature or sends a transaction.
          </p>
        </footer>
      </div>
    </>
  )
}
