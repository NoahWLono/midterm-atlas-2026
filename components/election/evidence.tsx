'use client';
import { useState } from 'react';
import { ArrowUpRight, Download } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useElectionData } from '@/lib/live/context';
import context from '@/lib/election/context.json';

import { marginLabel, pollTwoParty } from '@/lib/election/model';
import { Choice } from './races';
import { Parameter } from './controls';
export function PollingLab({ onUseMean }: { onUseMean: (v: number) => void }) {
  const { bundle, races: RACES } = useElectionData();
  const generic = {
    polls: bundle.polls
      .filter(
        (p) =>
          p.chamber === 'generic' &&
          p.eligible &&
          p.dem !== null &&
          p.rep !== null &&
          (Date.parse(bundle.checkedAt) - Date.parse(p.end)) / 86400000 <= 30,
      )
      .map((p) => ({
        id: p.id,
        pollster: p.firm,
        sponsor: p.sponsor,
        startDate: p.start,
        endDate: p.end,
        populationCode: p.population,
        sampleSize: p.sample,
        dem: p.dem!,
        rep: p.rep!,
        source: p.source,
      })),
  };
  const POLLS = bundle.polls
    .filter((p) => p.chamber === 'senate' && p.dem !== null && p.rep !== null)
    .map((p) => ({
      id: p.id,
      state: p.state,
      pollster: p.firm,
      fieldStart: p.start,
      fieldEnd: p.end,
      sampleSize: p.sample,
      population: p.population,
      democraticCandidate: p.demName,
      republicanCandidate: p.repName,
      democraticPercent: p.dem!,
      republicanPercent: p.rep!,
      sourceUrl: p.source,
      electionType: p.eligible ? 'general' : 'hypothetical-general',
      reason: p.reason,
    }));
  const [metric, setMetric] = useState('raw'),
    [selected, setSelected] = useState(
      bundle.anchorPollIds.filter((id) =>
        generic.polls.some((p) => p.id === id),
      ),
    ),
    [halfLife, setHalfLife] = useState(14);
  const [target, setTarget] = useState('all');
  const incl = generic.polls.filter((p) => selected.includes(p.id));
  const weighted = incl.map((p) => {
    const age =
      (Date.parse(bundle.checkedAt.slice(0, 10)) - Date.parse(p.endDate)) /
      86400000;
    const firm = incl.filter((x) => x.pollster === p.pollster).length;
    return {
      ...p,
      weight:
        (Math.min(1500, p.sampleSize) * Math.pow(2, -age / halfLife)) / firm,
    };
  });
  const weightSum = weighted.reduce((s, p) => s + p.weight, 0);
  const mean =
    weighted.reduce(
      (s, p) => s + p.weight * pollTwoParty(p.dem, p.rep, p.sampleSize).margin,
      0,
    ) / (weightSum || 1);
  const effective =
    weightSum ** 2 / (weighted.reduce((s, p) => s + p.weight ** 2, 0) || 1);
  const senate = POLLS.filter((p) => target === 'all' || p.state === target);
  return (
    <section className="section-block" id="polling">
      <div className="section-title">
        <div>
          <p className="eyebrow">The evidence desk</p>
          <h2>What the polls actually measure.</h2>
        </div>
        <a
          className="outline-button"
          href={`https://raw.githubusercontent.com/NoahWLono/midterm-atlas-2026/main/public/data/editions/${bundle.revision}.json`}
          download
        >
          <Download size={15} />
          Download polling data
        </a>
      </div>
      <p className="section-dek">
        Public surveys refresh from licensed polling feeds. Original research
        checks remain identified in the full ledger. Coverage is selective;
        field dates, populations, and source links travel with every number.
      </p>
      <div className="evidence-grid">
        <div className="panel">
          <div className="section-top">
            <h3>National generic ballot</h3>
            <Tabs value={metric} onValueChange={(v) => setMetric(String(v))}>
              <TabsList className="compact-tabs">
                <TabsTrigger value="raw">Reported</TabsTrigger>
                <TabsTrigger value="normalized">D/R normalized</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="poll-axis">
            <span>Survey / fieldwork</span>
            <div>
              <span>R +10</span>
              <span>Even</span>
              <span>D +20</span>
            </div>
            <i />
          </div>
          {generic.polls.map((p) => {
            const m =
              metric === 'raw'
                ? p.dem - p.rep
                : pollTwoParty(p.dem, p.rep, p.sampleSize).margin;
            return (
              <div className="national-poll" key={p.id}>
                <div className="poll-firm">
                  <strong>
                    {p.sponsor} / {p.pollster}
                  </strong>
                  <small>
                    {p.startDate.slice(5)} – {p.endDate.slice(5)} ·{' '}
                    {p.populationCode} · n={p.sampleSize.toLocaleString()}
                  </small>
                </div>
                <div className="poll-position">
                  <div className="poll-zero" />
                  <i style={{ left: `${((m + 10) / 30) * 100}%` }} />
                  <span
                    style={{
                      left: `${Math.min(85, ((m + 10) / 30) * 100 + 3)}%`,
                    }}
                  >
                    {marginLabel(m)}
                  </span>
                </div>
                <a
                  href={p.source}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Original ${p.sponsor} ${p.pollster} survey ending ${p.endDate}`}
                >
                  <ArrowUpRight size={16} />
                </a>
              </div>
            );
          })}
          <div className="chart-caption">
            <span>Point estimates only; x-axis runs R +10 to D +20.</span>
          </div>
          <p className="footnote">
            Normalization divides D − R by D + R. It redistributes neither
            undecided respondents nor third-party voters using any empirical
            turnout model.
          </p>
        </div>
        <div className="panel synthesis-panel">
          <span className="tag">Aggregation experiment</span>
          <h3>Build a selected-poll mean</h3>
          <p className="muted">
            This sandbox does not alter the published evidence anchor until you
            apply it.
          </p>
          {generic.polls.map((p) => (
            <label className="poll-check" key={p.id}>
              <Checkbox
                checked={selected.includes(p.id)}
                onCheckedChange={(v) =>
                  setSelected((a) =>
                    v ? [...a, p.id] : a.filter((id) => id !== p.id),
                  )
                }
              />
              <span>
                {p.pollster}
                <small>
                  {p.endDate} · {p.populationCode}
                </small>
              </span>
              <b>
                {marginLabel(p.dem - p.rep)}
                <small>reported margin</small>
              </b>
            </label>
          ))}
          <Parameter
            label="Recency half-life"
            min={3}
            max={40}
            step={1}
            value={halfLife}
            format={(v) => `${v} days`}
            onChange={setHalfLife}
          />
          <div className="synthesis-result">
            <span>Weighted D/R margin</span>
            <strong>
              {incl.length ? marginLabel(mean) : 'No polls selected'}
            </strong>
          </div>
          <button
            className="primary-button"
            disabled={!incl.length}
            onClick={() => onUseMean(mean)}
          >
            Apply mean to national scenario
          </button>
          <details className="plain-details">
            <summary>Inspect the weighting rule</summary>
            <p>
              Weight = min(n, 1,500) × 2<sup>−age / half-life</sup> ÷ selected
              waves from that pollster. Age is measured at{' '}
              {bundle.checkedAt.slice(0, 10)}. Margins are D/R normalized before
              weighting.
            </p>
            <p>
              Effective poll count, (Σw)² / Σw²: <b>{effective.toFixed(2)}</b>.
              This measures concentration of weights, not survey sample size or
              independent evidence. It does not correct design effects, shared
              bias, population differences, or selection of which polls are
              available here.
            </p>
          </details>
        </div>
      </div>
      <div className="panel table-panel">
        <div className="section-top">
          <div>
            <h3>Senate polling ledger</h3>
            <p className="muted">
              {POLLS.length} D/R observations across{' '}
              {new Set(POLLS.map((p) => p.state)).size} states. Alternative
              matchups and excluded surveys remain visible.
            </p>
          </div>
          <Choice
            label="Filter Senate polls by state"
            value={target}
            onChange={setTarget}
            options={[
              { value: 'all', label: 'All states' },
              ...[...new Set(POLLS.map((p) => p.state))]
                .sort()
                .map((s) => ({ value: s, label: s })),
            ]}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>State / pollster</TableHead>
              <TableHead>Field dates / sample</TableHead>
              <TableHead>Democratic candidate</TableHead>
              <TableHead>Republican candidate</TableHead>
              <TableHead>Raw margin</TableHead>
              <TableHead>Model treatment</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {senate.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <strong>{p.state}</strong>
                  <small className="row-meta">{p.pollster}</small>
                </TableCell>
                <TableCell>
                  {p.fieldStart.slice(5)} – {p.fieldEnd.slice(5)}
                  <small className="row-meta">
                    {p.sampleSize.toLocaleString()} {p.population}
                  </small>
                </TableCell>
                <TableCell>
                  {p.democraticCandidate}
                  <b className="poll-share dem-text">{p.democraticPercent}%</b>
                </TableCell>
                <TableCell>
                  {p.republicanCandidate}
                  <b className="poll-share rep-text">{p.republicanPercent}%</b>
                </TableCell>
                <TableCell>
                  {marginLabel(p.democraticPercent - p.republicanPercent)}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      RACES.some((r) => r.pollId === p.id)
                        ? 'included-label'
                        : 'excluded-label'
                    }
                  >
                    {RACES.some((r) => r.pollId === p.id)
                      ? 'Included in mean'
                      : p.electionType === 'hypothetical-general'
                        ? p.reason
                        : 'Superseded in sample'}
                  </span>
                </TableCell>
                <TableCell>
                  <a
                    className="source-link"
                    href={p.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Source for ${p.id}`}
                  >
                    <ArrowUpRight size={16} />
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="footnote">
          Latest eligible survey per state in the past 60 days. Candidate pairs
          must pass independent verification. “Included” applies when the Senate
          polling toggle is on. RV = registered voters; LV = likely voters. New
          Hampshire alternatives share respondents and are not independent. The
          complete live ledger and immutable edition are linked above. Initial
          research notes are in the{' '}
          <a href="/data/senate-polls.json" download>
            source data
          </a>
          .
        </p>
      </div>
    </section>
  );
}
export function HistoricalContext() {
  const [office, setOffice] = useState('house'),
    [party, setParty] = useState('all'),
    [since, setSince] = useState('1934');
  const rows = context.midtermHistory.rows.filter(
    (r) => (party === 'all' || r.party === party) && r.year >= Number(since),
  );
  const values = rows.map((r) =>
    office === 'house' ? r.houseChange : r.senateChange,
  );
  const mean = values.reduce((s, v) => s + v, 0) / (values.length || 1);
  const losses = values.filter((v) => v < 0).length;
  const max = Math.max(...values.map(Math.abs), 1);
  return (
    <section id="history" className="section-block">
      <div className="section-title">
        <div>
          <p className="eyebrow">The historical record</p>
          <h2>The midterm penalty is a pattern, not a law.</h2>
        </div>
        <div className="history-controls">
          <Choice
            label="Historical chamber"
            value={office}
            onChange={setOffice}
            options={[
              { value: 'house', label: 'House' },
              { value: 'senate', label: 'Senate' },
            ]}
          />
          <Choice
            label="President party"
            value={party}
            onChange={setParty}
            options={[
              { value: 'all', label: 'All presidents' },
              { value: 'D', label: 'Democratic presidents' },
              { value: 'R', label: 'Republican presidents' },
            ]}
          />
          <Choice
            label="Historical period start"
            value={since}
            onChange={setSince}
            options={[
              { value: '1934', label: 'Since 1934' },
              { value: '1970', label: 'Since 1970' },
              { value: '1994', label: 'Since 1994' },
            ]}
          />
        </div>
      </div>
      <div className="panel">
        <div className="history-summary">
          <div>
            <strong>{mean.toFixed(1)}</strong>
            <span>Mean seat change</span>
          </div>
          <div>
            <strong>
              {losses} / {rows.length}
            </strong>
            <span>Cycles with a seat loss</span>
          </div>
          <p>
            Seat change for the president’s party. These are descriptive
            comparisons; this sample does not fit or validate the 2026 model.
          </p>
        </div>
        <div className="history-chart">
          {rows.map((r, i) => {
            const v = values[i];
            return (
              <div
                className="history-column"
                key={r.year}
                title={`${r.year} · ${r.president} (${r.party}) · ${v > 0 ? '+' : ''}${v} ${office} seats`}
              >
                <div className="history-bar-track">
                  <span
                    className={r.party === 'D' ? 'dem-dot' : 'rep-dot'}
                    style={{
                      height: `${(Math.abs(v) / max) * 140}px`,
                      bottom:
                        v < 0
                          ? `${155 - (Math.abs(v) / max) * 140}px`
                          : '155px',
                    }}
                  />
                  <b
                    style={{
                      bottom:
                        v < 0
                          ? `${135 - (Math.abs(v) / max) * 140}px`
                          : `${160 + (Math.abs(v) / max) * 140}px`,
                    }}
                  >
                    {v > 0 ? '+' : ''}
                    {v}
                  </b>
                </div>
                <span>{String(r.year).slice(2)}</span>
              </div>
            );
          })}
        </div>
        <p className="footnote">
          Years shown as two digits, 1934–2022. Bars below zero are losses;
          party colors refer to the president. Source:{' '}
          <a
            href={context.midtermHistory.source}
            target="_blank"
            rel="noreferrer"
          >
            American Presidency Project
          </a>
          , based on congressional party-division records, updated July 13,
          2026. Caucus conventions may differ from election-night net gains.
        </p>
      </div>
    </section>
  );
}
