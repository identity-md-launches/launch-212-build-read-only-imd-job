import { useEffect } from 'react'
import { deliveryNotice, normalizeState, STATE_LABEL, summarizeNodes } from '../api/normalize'
import type { ApiJobDetail, ApiJobSummary } from '../api/types'
import type { JobsStore } from '../data/useJobs'
import { formatAbsolute, formatRelative } from '../lib/time'
import { StateBadge } from './StateBadge'

interface Props {
  id: string
  store: JobsStore
  backHash: string
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Stamp({ iso, now }: { iso: string | null | undefined; now: number }) {
  if (!iso) return <span className="cell-muted">Unknown</span>
  return (
    <>
      <time dateTime={iso}>{formatRelative(iso, now)}</time> <span className="cell-muted">({formatAbsolute(iso)})</span>
    </>
  )
}

export function JobDetail({ id, store, backHash }: Props) {
  const summary: ApiJobSummary | undefined = store.jobs.find((j) => j.id === id)
  const status = store.details[id]

  useEffect(() => {
    store.ensureDetails([id])
  }, [id, store.ensureDetails, store.jobs, store.source]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.getElementById('detail-heading')?.focus()
  }, [id])

  const detail: ApiJobDetail | undefined = status?.status === 'ready' ? status.detail : undefined
  const base = detail ?? summary
  const now = store.now

  return (
    <article className="stack" aria-labelledby="detail-heading">
      <p>
        <a href={backHash}>← Back to all jobs</a>
      </p>

      {!base ? (
        <section className="card empty" aria-live="polite">
          {store.mode === 'loading' || status?.status === 'loading' ? (
            <p className="empty__title" id="detail-heading" tabIndex={-1}>
              Loading job…
            </p>
          ) : (
            <>
              <h1 className="empty__title" id="detail-heading" tabIndex={-1}>
                Job not found
              </h1>
              <p className="empty__body">
                No job with id <code>{id}</code> is in the {store.source === 'fixture' ? 'offline snapshot' : 'loaded list (newest 200 jobs)'}.
                {status?.status === 'error' ? ` ${status.message}` : ''}
              </p>
              <a href={backHash}>Return to the job list</a>
            </>
          )}
        </section>
      ) : (
        <>
          <header className="detail-header">
            <h1 id="detail-heading" tabIndex={-1} className="mono">
              {base.id}
            </h1>
            <StateBadge state={base.state} showRaw />
            {base.synthetic ? <span className="tag tag--mock">Mock data</span> : null}
          </header>

          {store.source === 'fixture' || store.mode === 'fixture-auto' ? (
            <p className="notice">Offline snapshot: this record was captured {formatRelative(store.fixtureCapturedAt, now)} and may be out of date.</p>
          ) : null}
          {status?.status === 'loading' ? <p className="cell-muted">Loading seats, attempts and nodes…</p> : null}
          {status?.status === 'error' ? <p className="notice notice--error">Unable to load seats and attempts. {status.message} The dashboard will retry on the next refresh.</p> : null}
          {status?.status === 'missing' ? <p className="notice">The offline snapshot has no node details (seats, attempts) for this job.</p> : null}

          <section className="card stack" aria-labelledby="summary-heading">
            <h2 id="summary-heading">Summary</h2>
            <dl className="meta-grid">
              <Meta label="State">
                {STATE_LABEL[normalizeState(base.state)]}
                {base.state.toLowerCase() !== normalizeState(base.state) ? <span className="cell-muted"> (API value: {base.state})</span> : null}
              </Meta>
              <Meta label="Template">{base.template ?? 'None'}</Meta>
              <Meta label="Created">
                <Stamp iso={base.createdAt} now={now} />
              </Meta>
              <Meta label="Last update">
                <Stamp iso={base.updatedAt} now={now} />
              </Meta>
              {detail ? (
                <>
                  <Meta label="Seats assigned">
                    {(() => {
                      const { uniqueSeats } = summarizeNodes(detail.nodes)
                      return uniqueSeats.length === 0 ? (
                        <span className="cell-muted">None assigned</span>
                      ) : (
                        <span className="seats">
                          {uniqueSeats.map((s) => (
                            <span key={`${s.tokenId}-${s.agentId}`} className="mono">
                              seat {s.tokenId} · agent {s.agentId} ({s.nodeKeys.join(', ')})
                            </span>
                          ))}
                        </span>
                      )
                    })()}
                  </Meta>
                  <Meta label="Attempts">
                    {(() => {
                      const s = summarizeNodes(detail.nodes)
                      return (
                        <span className="num">
                          {s.maxAttempt} highest · {s.totalAttempts} total across {s.nodeCount === 1 ? '1 node' : `${s.nodeCount} nodes`} · {s.totalRevisions} revisions
                        </span>
                      )
                    })()}
                  </Meta>
                </>
              ) : null}
              {base.blockedReason ? <Meta label="Blocked reason">{base.blockedReason}</Meta> : null}
              {detail?.launch?.requested ? (
                <Meta label="Launch">
                  {detail.launch.kind ?? 'requested'}
                  {detail.launch.status ? ` · ${detail.launch.status}` : ''}
                  {detail.launch.chainId ? ` · chain ${detail.launch.chainId}` : ''}
                </Meta>
              ) : null}
            </dl>
          </section>

          <section className="card stack stack--tight" aria-labelledby="objective-heading">
            <h2 id="objective-heading">Objective</h2>
            <p className="objective">{base.objective ?? 'No objective recorded.'}</p>
            {!detail && summary?.objective?.endsWith('…') ? <p className="cell-muted">The list endpoint truncates objectives; the full text loads with the job detail.</p> : null}
          </section>

          <section className="card stack stack--tight" aria-labelledby="delivery-heading">
            <h2 id="delivery-heading">Delivery</h2>
            {base.delivery ? (
              <>
                {deliveryNotice(base) ? <p className="notice">{deliveryNotice(base)}</p> : null}
                <dl className="meta-grid">
                  <Meta label="Repository">
                    {base.delivery.repoUrl ? (
                      <a href={base.delivery.repoUrl} rel="noopener noreferrer" target="_blank">
                        {base.delivery.repoUrl.replace(/^https?:\/\//, '')} (opens in a new tab)
                      </a>
                    ) : (
                      <span className="cell-muted">None</span>
                    )}
                  </Meta>
                  <Meta label="Pull request">
                    {base.delivery.pullRequestUrl ? (
                      <a href={base.delivery.pullRequestUrl} rel="noopener noreferrer" target="_blank">
                        {base.delivery.pullRequestUrl.replace(/^https?:\/\//, '')} (opens in a new tab)
                      </a>
                    ) : (
                      <span className="cell-muted">None</span>
                    )}
                  </Meta>
                  <Meta label="Commit">{base.delivery.commit ? <code>{base.delivery.commit}</code> : <span className="cell-muted">None</span>}</Meta>
                  <Meta label="Delivered">
                    <Stamp iso={base.delivery.deliveredAt} now={now} />
                  </Meta>
                </dl>
              </>
            ) : (
              <p className="cell-muted">No delivery recorded. Completion is decided by the job state above, not by delivery links.</p>
            )}
          </section>

          {detail ? (
            <section className="card stack stack--tight" aria-labelledby="nodes-heading">
              <h2 id="nodes-heading">Nodes</h2>
              {detail.nodes.length === 0 ? (
                <p className="cell-muted">This job has no nodes.</p>
              ) : (
                <>
                <p className="cell-muted table-scroll__hint">Scroll the table sideways to see every column.</p>
                <div className="table-scroll">
                  <table className="nodes-table">
                    <caption className="visually-hidden">Workflow nodes with state, attempts and seat</caption>
                    <thead>
                      <tr>
                        <th scope="col">Node</th>
                        <th scope="col">Role</th>
                        <th scope="col">State</th>
                        <th scope="col">Attempt</th>
                        <th scope="col">Revisions</th>
                        <th scope="col">Seat</th>
                        <th scope="col">Verdict</th>
                        <th scope="col">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.nodes.map((n) => (
                        <tr key={n.key}>
                          <th scope="row" className="mono">
                            {n.key}
                          </th>
                          <td>{n.role}</td>
                          <td>
                            {n.state}
                            {n.failureReason ? <div className="job-cell__note">Failure: {n.failureReason}</div> : null}
                          </td>
                          <td className="num">{n.attempt}</td>
                          <td className="num">{n.revisions}</td>
                          <td className="mono">{n.seat ? `seat ${n.seat.tokenId} · agent ${n.seat.agentId}` : <span className="cell-muted">None</span>}</td>
                          <td>
                            {n.verdict ? (
                              <>
                                {n.verdict.status ?? 'unknown'}
                                {n.verdict.detail ? <div className="cell-muted">{n.verdict.detail}</div> : null}
                                {n.verdict.failedChecks?.length ? <div className="job-cell__note">Failed checks: {n.verdict.failedChecks.join(', ')}</div> : null}
                              </>
                            ) : (
                              <span className="cell-muted">None</span>
                            )}
                          </td>
                          <td>
                            <Stamp iso={n.updatedAt} now={now} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </section>
          ) : null}

          {detail ? (
            <section className="card stack stack--tight" aria-labelledby="reviews-heading">
              <h2 id="reviews-heading">Reviews</h2>
              {detail.reviews.length === 0 ? (
                <p className="cell-muted">No reviews recorded.</p>
              ) : (
                <ul className="stack stack--tight" style={{ margin: 0, paddingInlineStart: '1.25rem' }}>
                  {detail.reviews.map((r, i) => (
                    <li key={i}>
                      <span>
                        {r.status}
                        {r.chainId ? ` · chain ${r.chainId}` : ''}
                        {r.txHash ? (
                          <>
                            {' · tx '}
                            <code>{r.txHash}</code>
                          </>
                        ) : ''}
                      </span>
                      {r.entries.length ? (
                        <ul style={{ paddingInlineStart: '1.25rem' }}>
                          {r.entries.map((e, j) => (
                            <li key={j} className="cell-muted">
                              {e.nodeKey}: agent {e.agentId}, {e.role}, value {e.value}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          <details className="raw">
            <summary>Raw API record</summary>
            <pre>{JSON.stringify(detail ?? summary, null, 2)}</pre>
          </details>
        </>
      )}
    </article>
  )
}
