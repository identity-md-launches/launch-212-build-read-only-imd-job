import { deliveryNotice, shortId, summarizeNodes } from '../api/normalize'
import type { ApiJobSummary } from '../api/types'
import type { DetailStatus } from '../data/useJobs'
import { buildHash } from '../lib/router'
import { formatAbsolute, formatRelative } from '../lib/time'
import { StateBadge } from './StateBadge'

interface Props {
  jobs: ApiJobSummary[]
  details: Record<string, DetailStatus>
  now: number
  caption: string
  listHash: string
}

function SeatsCell({ status }: { status: DetailStatus | undefined }) {
  if (!status || status.status === 'idle' || status.status === 'loading') return <span className="cell-muted">Loading…</span>
  if (status.status === 'missing') return <span className="cell-muted">Not in snapshot</span>
  if (status.status === 'error') return <span className="cell-muted">Unavailable</span>
  const { uniqueSeats } = summarizeNodes(status.detail.nodes)
  if (uniqueSeats.length === 0) return <span className="cell-muted">None assigned</span>
  return (
    <div className="seats">
      {uniqueSeats.map((s) => (
        <span key={`${s.tokenId}-${s.agentId}`} className="mono">
          seat {s.tokenId} · agent {s.agentId}
          {s.nodeKeys.length > 1 ? <span className="cell-muted"> ×{s.nodeKeys.length}</span> : null}
        </span>
      ))}
    </div>
  )
}

function AttemptsCell({ status }: { status: DetailStatus | undefined }) {
  if (!status || status.status === 'idle' || status.status === 'loading') return <span className="cell-muted">Loading…</span>
  if (status.status === 'missing') return <span className="cell-muted">Not in snapshot</span>
  if (status.status === 'error') return <span className="cell-muted">Unavailable</span>
  const { maxAttempt, totalRevisions, nodeCount } = summarizeNodes(status.detail.nodes)
  const nodesText = nodeCount === 1 ? '1 node' : `${nodeCount} nodes`
  const revText = totalRevisions === 0 ? '' : totalRevisions === 1 ? ', 1 revision' : `, ${totalRevisions} revisions`
  return (
    <span className="num attempts">
      {maxAttempt}
      <span className="cell-muted">
        {' '}
        ({nodesText}
        {revText})
      </span>
    </span>
  )
}

export function JobTable({ jobs, details, now, caption, listHash }: Props) {
  return (
    <div className="table-wrap">
      <table className="jobs-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Job</th>
            <th scope="col">State</th>
            <th scope="col">Seats</th>
            <th scope="col">Attempts</th>
            <th scope="col">Last update</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const notice = deliveryNotice(job)
            const href = buildHash(`/jobs/${job.id}`, listHash ? { from: listHash } : undefined)
            return (
              <tr key={job.id}>
                <td data-label="Job">
                  <div className="job-cell">
                    <span className="job-cell__id">
                      <a href={href} className="mono" aria-label={`Open job ${job.id}`}>
                        {shortId(job.id)}
                      </a>
                      {job.synthetic ? <span className="tag tag--mock">Mock</span> : null}
                    </span>
                    <span className="job-cell__template">{job.template ?? 'No template'}</span>
                    <p className="job-cell__objective">{job.objective ?? 'No objective recorded.'}</p>
                    {job.blockedReason ? <span className="job-cell__note">Reason: {job.blockedReason}</span> : null}
                    {notice ? <span className="job-cell__note">{notice}</span> : null}
                  </div>
                </td>
                <td data-label="State" className="td--state">
                  <StateBadge state={job.state} showRaw />
                </td>
                <td data-label="Seats" className="td--compact">
                  <SeatsCell status={details[job.id]} />
                </td>
                <td data-label="Attempts" className="td--compact">
                  <AttemptsCell status={details[job.id]} />
                </td>
                <td data-label="Last update">
                  <div className="time">
                    <time dateTime={job.updatedAt}>{formatRelative(job.updatedAt, now)}</time>
                    <span className="time__abs">{formatAbsolute(job.updatedAt)}</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
