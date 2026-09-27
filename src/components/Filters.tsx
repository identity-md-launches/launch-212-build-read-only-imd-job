import { useId } from 'react'
import { STATE_LABEL, STATE_ORDER } from '../api/normalize'
import type { JobState } from '../api/types'
import { hasActiveFilters, PAGE_SIZES, type FilterState, type SortKey } from '../lib/filters'

interface Props {
  filters: FilterState
  counts: Record<JobState, number>
  templates: string[]
  total: number
  matched: number
  onChange: (next: FilterState) => void
}

export function Filters({ filters, counts, templates, total, matched, onChange }: Props) {
  const searchId = useId()
  const templateId = useId()
  const sortId = useId()
  const sizeId = useId()

  const set = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch, page: 1 })

  const toggleState = (s: JobState) => {
    const states = filters.states.includes(s) ? filters.states.filter((x) => x !== s) : [...filters.states, s]
    set({ states })
  }

  const visibleStates = STATE_ORDER.filter((s) => s !== 'other' || counts.other > 0)

  return (
    <form className="filters card" role="search" aria-label="Search and filter jobs" onSubmit={(e) => e.preventDefault()}>
      <div className="field">
        <label className="field__label" htmlFor={searchId}>
          Search
        </label>
        <input
          id={searchId}
          className="input"
          type="search"
          name="q"
          autoComplete="off"
          placeholder="Job id, template or words from the objective"
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor={templateId}>
          Template
        </label>
        <select id={templateId} className="select" value={filters.template} onChange={(e) => set({ template: e.target.value })}>
          <option value="">All templates</option>
          {templates.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field__label" htmlFor={sortId}>
          Sort by
        </label>
        <select id={sortId} className="select" value={filters.sort} onChange={(e) => set({ sort: e.target.value as SortKey })}>
          <option value="updated">Last update, newest first</option>
          <option value="created">Created, newest first</option>
          <option value="state">State, then last update</option>
        </select>
      </div>

      <fieldset className="fieldset filters__states">
        <legend className="fieldset__legend">State</legend>
        <div className="chips">
          {visibleStates.map((s) => (
            <label key={s} className="chip">
              <input type="checkbox" name="state" value={s} checked={filters.states.includes(s)} onChange={() => toggleState(s)} />
              <span>{STATE_LABEL[s]}</span>
              <span className="chip__count" aria-hidden="true">
                {counts[s]}
              </span>
              <span className="visually-hidden">, {counts[s]} loaded</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="filters__actions">
        <p className="result-count" role="status" aria-live="polite">
          {matched === total ? `Showing all ${total} loaded jobs` : `${matched} of ${total} loaded jobs match`}
        </p>
        <div className="banner__controls">
          <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-2)' }}>
            <label className="field__label" htmlFor={sizeId}>
              Rows per page
            </label>
            <select id={sizeId} className="select" style={{ width: 'auto' }} value={filters.size} onChange={(e) => set({ size: Number(e.target.value) })}>
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="button button--link"
            onClick={() => onChange({ ...filters, q: '', states: [], template: '', page: 1 })}
            disabled={!hasActiveFilters(filters)}
          >
            Clear filters
          </button>
        </div>
      </div>
    </form>
  )
}
