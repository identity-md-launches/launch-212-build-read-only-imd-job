import type { PageSlice } from '../lib/filters'

interface Props {
  slice: PageSlice<unknown>
  loadedLimit: number
  onPage: (page: number) => void
}

export function Pagination({ slice, loadedLimit, onPage }: Props) {
  const { page, pageCount, from, to, total } = slice
  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="pagination__status">
        {total === 0 ? 'No rows' : `Rows ${from}–${to} of ${total}`}
        <span className="cell-muted"> · at most {loadedLimit} newest jobs are loaded</span>
      </p>
      <div className="pagination__nav">
        <button type="button" className="button" onClick={() => onPage(page - 1)} disabled={page <= 1}>
          Previous
        </button>
        <span className="num" aria-current="page">
          Page {page} of {pageCount}
        </span>
        <button type="button" className="button" onClick={() => onPage(page + 1)} disabled={page >= pageCount}>
          Next
        </button>
      </div>
    </nav>
  )
}
