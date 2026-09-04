'use client';
import { useState } from 'react';
import { RefreshCw, Radio, ArrowUpRight, Download } from 'lucide-react';
import { useElectionData } from '@/lib/live/context';
import { EDITION_URL } from '@/lib/live/schema';
export function LiveStatus() {
  const { bundle, error, loading, pinned, editionReady, now, refresh } =
    useElectionData();
  const stale = Date.parse(now) - Date.parse(bundle.checkedAt) > 18 * 3600000;
  const ended = Date.parse(now) >= Date.parse(bundle.refreshEndsAt);
  const bad = bundle.sources.filter((s) => s.status === 'error');
  const stamp = (s: string) => s.replace('T', ' ').replace('Z', ' UTC');
  return (
    <section
      className={`live-status ${error || stale || bad.length ? 'live-warning' : ''}`}
      aria-label="Polling update status"
    >
      <div className="live-status-top">
        <Radio size={18} />
        <div>
          <strong>
            {pinned && !editionReady
              ? 'Requested archive unavailable · fallback preview'
              : pinned
                ? 'Archived polling edition'
                : ended
                  ? 'Election polling archive'
                  : loading
                    ? 'Connecting to latest polling…'
                    : error || stale || bad.length
                      ? 'Polling available · update needs attention'
                      : 'Autonomous polling updates'}
          </strong>
          <p>
            {pinned && !editionReady
              ? 'The requested edition has not loaded. Displayed results are a fallback preview, not a reproduction; sharing and export are disabled.'
              : pinned
                ? 'This shared scenario uses a fixed polling edition.'
                : `Cloud checks every six hours through November 3. Open pages refresh every 15 minutes.`}
          </p>
        </div>
        <button
          onClick={refresh}
          className="icon-button"
          aria-label="Check for newer polling now"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="live-clocks">
        <span>
          Sources checked <b>{stamp(bundle.checkedAt)}</b>
        </span>
        <span>
          Evidence changed <b>{stamp(bundle.changedAt)}</b>
        </span>
        <span>
          Newest fieldwork <b>{bundle.latestFieldEnd}</b>
        </span>
      </div>
      {error && (
        <p className="footnote">
          {error}. The last validated edition remains in use.
        </p>
      )}
      {!bundle.anchorPollIds.length && (
        <p className="footnote">
          No eligible national wave remains in the 30-day window. The last
          national anchor is retained; it is not a fresh polling average.
        </p>
      )}
      {stale && !ended && !pinned && (
        <p className="footnote">
          No successful published check in more than 18 hours. Treat this
          edition as stale.
        </p>
      )}
      <details className="plain-details">
        <summary>Inspect update health, coverage, and archived data</summary>
        <p>
          Automatic updates cover polling evidence and the national model
          anchor. District maps, candidate eligibility, qualitative ratings,
          historical returns, and the model specification are dated research
          inputs. A new poll is not a new election result.
        </p>
        <div className="source-health">
          {bundle.sources.map((s) => (
            <div key={s.name}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.name} <ArrowUpRight size={12} />
              </a>
              <span>
                {s.status === 'ok' ? 'Checked' : 'Retaining previous records'} ·{' '}
                {s.count} observations
              </span>
              <small>
                Last success: {s.lastSuccess ? stamp(s.lastSuccess) : 'not yet'}{' '}
                · latest fieldwork: {s.latestFieldEnd || 'unavailable'}
              </small>
              {s.error && <small>{s.error}</small>}
            </div>
          ))}
        </div>
        <p>
          Edition <code>{bundle.revision}</code>. Source outages retain their
          previous validated records. Unknown matchups, adult samples,
          partisan/internal polls, and incompatible House geography are labelled
          and excluded from the default simulation. Provider coverage can lag a
          poll’s release; “checked” does not mean exhaustive or independently
          reverified.
        </p>
        <div className="live-links">
          <a
            href="/data/senate-eligibility.json"
            target="_blank"
            rel="noreferrer"
          >
            Candidate eligibility registry ↗
          </a>
          <a
            href={`${EDITION_URL}${bundle.revision}.json`}
            target="_blank"
            rel="noreferrer"
          >
            <Download size={14} /> This complete data edition
          </a>
          <a
            href="https://github.com/NoahWLono/midterm-atlas-2026/actions/workflows/refresh-polls.yml"
            target="_blank"
            rel="noreferrer"
          >
            Public update history <ArrowUpRight size={14} />
          </a>
          <a
            href="https://votehub.com/polls/api/"
            target="_blank"
            rel="noreferrer"
          >
            VoteHub
          </a>
          <a
            href="https://www.nytimes.com/interactive/polls/congressional-vote-2026.html"
            target="_blank"
            rel="noreferrer"
          >
            NYT polling database
          </a>
        </div>
        <p className="footnote">
          NYT and VoteHub data: CC BY 4.0. This project filters and normalizes
          factual observations; original poll links are retained. Schedules can
          be delayed by the hosting provider.
        </p>
      </details>
    </section>
  );
}
export function AllPolls() {
  const { bundle } = useElectionData();
  const [query, setQuery] = useState(''),
    [office, setOffice] = useState('all'),
    [limit, setLimit] = useState(30);
  const rows = bundle.polls.filter(
    (p) =>
      (office === 'all' || p.chamber === office) &&
      `${p.firm} ${p.state} ${p.raceId} ${p.demName} ${p.repName}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <section className="panel full-ledger">
      <details>
        <summary>
          Open the complete live polling ledger · {bundle.polls.length}{' '}
          observations
        </summary>
        <p>
          Includes unmodeled and excluded polls. Candidate party coding is
          supplied by the source unless independently checked. Alternative
          questions from one survey are not independent polls.
        </p>
        <div className="ledger-tools">
          <input
            aria-label="Search all polling evidence"
            placeholder="State, district, pollster, candidate…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(30);
            }}
          />
          <select
            aria-label="Polling office"
            value={office}
            onChange={(e) => {
              setOffice(e.target.value);
              setLimit(30);
            }}
          >
            <option value="all">All offices</option>
            <option value="generic">National</option>
            <option value="senate">Senate</option>
            <option value="house">House districts</option>
          </select>
        </div>
        <div className="ledger-scroll">
          <table>
            <thead>
              <tr>
                <th>Contest / fieldwork</th>
                <th>Survey</th>
                <th>Reported answers</th>
                <th>Treatment</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>
                      {p.chamber === 'generic'
                        ? 'National generic ballot'
                        : p.raceId || p.state}
                    </b>
                    <small>
                      {p.start} – {p.end}
                    </small>
                  </td>
                  <td>
                    <a href={p.source} target="_blank" rel="noreferrer">
                      {p.firm} ↗
                    </a>
                    <small>
                      n={p.sample.toLocaleString()} {p.population} · via{' '}
                      {p.provider}
                    </small>
                  </td>
                  <td>
                    {p.answers.map((a) => `${a.name}: ${a.pct}%`).join(' · ')}
                  </td>
                  <td>
                    {bundle.anchorPollIds.includes(p.id) ||
                    Object.values(bundle.senatePollIds).includes(p.id)
                      ? 'Active model input'
                      : p.eligible
                        ? 'Eligible; not selected'
                        : p.reason}
                    <small>
                      {p.primaryVerified
                        ? 'Original release checked'
                        : 'Provider-transcribed; not independently rechecked'}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <p>No matching observations.</p>}
        {rows.length > limit && (
          <button
            className="outline-button"
            onClick={() => setLimit((n) => n + 50)}
          >
            Show 50 more ({rows.length - limit} remaining)
          </button>
        )}
      </details>
    </section>
  );
}
