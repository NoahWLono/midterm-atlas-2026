'use client';
import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';
import {
  Search,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Download,
} from 'lucide-react';
import { RACES, POLLS, type Race, raceStatus } from '@/lib/election/data';
import ratings from '@/lib/election/senate-ratings.json';
import {
  marginLabel,
  probabilityLabel,
  REFERENCE_ENVIRONMENT,
  type Simulation,
  type Scenario,
} from '@/lib/election/model';
import { MarginInterval, StateGrid } from './charts';
import { Parameter } from './controls';
export type ViewRace = Simulation['races'][number] & Race;
export function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => v !== null && onChange(v)}>
      <SelectTrigger aria-label={label} className="choice">
        <SelectValue>
          {options.find((o) => o.value === value)?.label || label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function RaceExplorer({
  result,
  chamber,
  scenario,
  onChange,
  onExport,
}: {
  result: Simulation;
  chamber: 'house' | 'senate';
  scenario: Scenario;
  onChange: (p: Scenario) => void;
  onExport: () => void;
}) {
  const [search, setSearch] = useState(''),
    [state, setState] = useState('all'),
    [filter, setFilter] = useState('all'),
    [sort, setSort] = useState('close'),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<string | null>(null);
  const records = useMemo(
    () =>
      result.races.map((r) => ({ ...RACES.find((a) => a.id === r.id)!, ...r })),
    [result],
  );
  const filtered = useMemo(
    () =>
      records
        .filter(
          (r) =>
            (state === 'all' || r.state === state) &&
            `${r.name} ${r.stateName} ${r.id} ${r.historicalWinner || ''} ${r.currentSenator || ''}`
              .toLowerCase()
              .includes(search.toLowerCase()) &&
            (filter === 'all' ||
              (filter === 'close' &&
                r.probability > 0.1 &&
                r.probability < 0.9) ||
              (filter === 'polls' && !!r.poll) ||
              (filter === 'changed' && r.changedMap) ||
              (filter === 'imputed' && r.imputed)),
        )
        .sort((a, b) =>
          sort === 'close'
            ? Math.abs(a.probability - 0.5) - Math.abs(b.probability - 0.5)
            : sort === 'pivotal'
              ? b.pivotal - a.pivotal
              : sort === 'dem'
                ? b.probability - a.probability
                : sort === 'rep'
                  ? a.probability - b.probability
                  : a.id.localeCompare(b.id),
        ),
    [records, state, search, filter, sort],
  );
  const mapValues = useMemo(() => {
    const x: Record<string, { p: number; count: number; label: string }> = {};
    for (const r of records) {
      if (!x[r.state]) x[r.state] = { p: 0, count: 0, label: '' };
      x[r.state].p += r.probability;
      x[r.state].count++;
    }
    for (const s of Object.keys(x)) {
      x[s].p /= x[s].count;
      x[s].label =
        chamber === 'house'
          ? `${(100 * x[s].p).toFixed(0)}% expected D share of ${x[s].count} seats on 2024 map`
          : `${probabilityLabel(x[s].p)} D win probability`;
    }
    return x;
  }, [records, chamber]);
  const current = records.find((r) => r.id === selected) || null;
  const pages = Math.max(1, Math.ceil(filtered.length / 20)),
    safePage = Math.min(page, pages - 1);
  const choose = (setter: (s: string) => void) => (v: string) => {
    setter(v);
    setPage(0);
  };
  return (
    <section id="races" className="section-block">
      <div className="section-title">
        <div>
          <p className="eyebrow">Inside the map</p>
          <h2>
            {chamber === 'senate'
              ? '35 races, 35 different stories.'
              : 'Explore every historical House district.'}
          </h2>
        </div>
        <button className="outline-button" onClick={onExport}>
          <Download size={15} />
          Export race estimates
        </button>
      </div>
      <div className="race-overview">
        <div className="panel map-panel">
          <div className="section-top">
            <h3>
              {chamber === 'house'
                ? '2024 district map, summarized by state'
                : 'Senate races by state'}
            </h3>
            <span className="small-meta">Select a state to filter</span>
          </div>
          <StateGrid
            values={mapValues}
            selected={state}
            onSelect={choose(setState)}
          />
          <div className="map-legend">
            <span>
              <i className="rep-dot" />
              Republican
            </span>
            <span>← more likely · less likely →</span>
            <span>
              <i className="dem-dot" />
              Democratic
            </span>
          </div>
          <p className="footnote">
            Schematic grid, not geographic boundaries.{' '}
            {chamber === 'house'
              ? 'Color shows expected Democratic seat share under the scenario.'
              : 'Grey states have no Senate election in this model.'}
          </p>
        </div>
        <div className="panel tipping-panel">
          <h3>Uniform-swing tipping seats</h3>
          <p className="muted">
            How often a race occupies the decisive rank when a common national
            shift brings the chamber to a majority.
          </p>
          {[...records]
            .sort((a, b) => b.pivotal - a.pivotal)
            .slice(0, 5)
            .map((r, i) => (
              <button
                key={r.id}
                className="tipping-row"
                onClick={() => setSelected(r.id)}
              >
                <span className="rank">{i + 1}</span>
                <span>
                  {r.name}
                  <small>
                    {r.stateName}
                    {chamber === 'senate' ? ` · ${r.held}-held` : ''}
                  </small>
                </span>
                <strong>{(r.pivotal * 100).toFixed(1)}%</strong>
              </button>
            ))}
          <p className="footnote">
            A ranking statistic, not the probability that changing only this
            race flips control.
          </p>
        </div>
      </div>
      <div className="panel table-panel">
        <div className="table-toolbar">
          <label className="search-input">
            <Search size={16} />
            <input
              aria-label="Search races, states, or historical winners"
              placeholder="Search a state, race, or name…"
              value={search}
              onChange={(e) => choose(setSearch)(e.target.value)}
            />
          </label>
          <Choice
            label="Filter by state"
            value={state}
            onChange={choose(setState)}
            options={[
              { value: 'all', label: 'All states' },
              ...[...new Set(records.map((r) => r.state))]
                .sort()
                .map((s) => ({ value: s, label: s })),
            ]}
          />
          <Choice
            label="Filter race evidence"
            value={filter}
            onChange={choose(setFilter)}
            options={[
              { value: 'all', label: 'All races' },
              { value: 'close', label: 'Competitive in model' },
              ...(chamber === 'senate'
                ? [{ value: 'polls', label: 'With available polls' }]
                : [
                    { value: 'changed', label: 'Changed-map states' },
                    { value: 'imputed', label: 'Imputed baseline' },
                  ]),
            ]}
          />
          <Choice
            label="Sort races"
            value={sort}
            onChange={choose(setSort)}
            options={[
              { value: 'close', label: 'Closest first' },
              { value: 'pivotal', label: 'Tipping frequency' },
              { value: 'dem', label: 'Most Democratic' },
              { value: 'rep', label: 'Most Republican' },
              { value: 'name', label: 'Alphabetical' },
            ]}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Race / evidence</TableHead>
              <TableHead>
                {chamber === 'house' ? '2024 winner' : 'Seat held by'}
              </TableHead>
              <TableHead>Scenario margin</TableHead>
              <TableHead>D win probability</TableHead>
              <TableHead>
                {chamber === 'senate' ? 'Cook · Aug 20' : '2024 D/R margin'}
              </TableHead>
              <TableHead>Tipping frequency</TableHead>
              <TableHead>
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(safePage * 20, (safePage + 1) * 20).map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <button
                    className="race-name"
                    onClick={() => setSelected(r.id)}
                  >
                    {r.name}
                  </button>
                  <small className="row-meta">
                    {r.chamber === 'senate'
                      ? r.poll && scenario.usePolls
                        ? 'Selected poll + state baseline'
                        : r.poll
                          ? 'Poll available; switched off'
                          : 'State baseline only'
                      : raceStatus(r)}
                  </small>
                </TableCell>
                <TableCell>
                  <span
                    className={`party-token ${r.held === 'D' ? 'dem-token' : 'rep-token'}`}
                  >
                    {r.held}
                  </span>
                  {chamber === 'house' && (
                    <small className="winner-name">{r.historicalWinner}</small>
                  )}
                </TableCell>
                <TableCell className={r.mean >= 0 ? 'dem-text' : 'rep-text'}>
                  {marginLabel(r.mean)}
                </TableCell>
                <TableCell>
                  <div className="mini-prob">
                    <span style={{ width: `${r.probability * 100}%` }} />
                  </div>
                  <strong className="prob-number">
                    {probabilityLabel(r.probability)}
                  </strong>
                </TableCell>
                <TableCell>
                  {chamber === 'senate'
                    ? ratings.ratings.find((x) => x.state === r.state)
                        ?.rating || 'Not loaded'
                    : r.historicalMargin === null
                      ? 'No D/R contest'
                      : marginLabel(r.historicalMargin)}
                </TableCell>
                <TableCell>{(r.pivotal * 100).toFixed(1)}%</TableCell>
                <TableCell>
                  <button
                    className="icon-button"
                    onClick={() => setSelected(r.id)}
                    aria-label={`Open ${r.name} details`}
                  >
                    <ArrowUpRight size={17} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!filtered.length && (
          <div className="empty-state">
            <Search size={25} />
            <h3>No races match these filters.</h3>
            <button
              className="outline-button"
              onClick={() => {
                setSearch('');
                setState('all');
                setFilter('all');
              }}
            >
              Clear filters
            </button>
          </div>
        )}
        <div className="table-bottom">
          <span>
            {filtered.length
              ? `${safePage * 20 + 1}–${Math.min(filtered.length, (safePage + 1) * 20)}`
              : '0'}{' '}
            of {filtered.length} races
          </span>
          <Pagination className="race-pagination">
            <PaginationContent>
              <PaginationItem>
                <button
                  aria-label="Previous race page"
                  disabled={safePage === 0}
                  onClick={() => setPage(safePage - 1)}
                >
                  <ChevronLeft size={17} />
                </button>
              </PaginationItem>
              <PaginationItem>
                <span>
                  Page {safePage + 1} / {pages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <button
                  aria-label="Next race page"
                  disabled={safePage >= pages - 1}
                  onClick={() => setPage(safePage + 1)}
                >
                  <ChevronRight size={17} />
                </button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
        <p className="footnote">
          Scenario probabilities are conditional on the model, not published
          expert ratings.{' '}
          {chamber === 'senate' ? (
            <>
              <a href={ratings.sourceUrl} target="_blank" rel="noreferrer">
                Cook ratings
              </a>{' '}
              are a separate, dated assessment and do not enter the simulation.
            </>
          ) : (
            'Historical winners are from 2024; they are not a verified 2026 candidate list.'
          )}
        </p>
      </div>
      <Sheet
        open={!!current}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <SheetContent className="race-sheet">
          <SheetHeader>
            <SheetDescription>
              {current?.chamber === 'house'
                ? 'Historical House district'
                : '2026 Senate race'}
            </SheetDescription>
            <SheetTitle>{current?.name}</SheetTitle>
          </SheetHeader>
          {current && (
            <RaceDetails
              race={current}
              scenario={scenario}
              onChange={onChange}
            />
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
function RaceDetails({
  race: r,
  scenario,
  onChange,
}: {
  race: ViewRace;
  scenario: Scenario;
  onChange: (p: Scenario) => void;
}) {
  const poll = POLLS.find((p) => p.id === r.pollId);
  const base = r.baseline + REFERENCE_ENVIRONMENT;
  const pollAdj =
    r.mean -
    (r.baseline + scenario.environment + (scenario.overrides[r.id] || 0));
  return (
    <div className="race-detail">
      <div className="detail-score">
        <div>
          <span>D win probability</span>
          <strong className="dem-text">
            {probabilityLabel(r.probability)}
          </strong>
        </div>
        <div>
          <span>R win probability</span>
          <strong className="rep-text">
            {probabilityLabel(1 - r.probability)}
          </strong>
        </div>
      </div>
      <h3>Expected margin: {marginLabel(r.mean)}</h3>
      <MarginInterval mean={r.mean} sd={r.sd} />
      <p className="footnote">
        Dark band: central 80%; light band: central 90%. Gaussian latent margin;
        not a bounded vote-share distribution. Chart clips at ±40 points.
      </p>
      <dl className="detail-list">
        <div>
          <dt>
            {r.chamber === 'house'
              ? '2024 elected candidate'
              : 'Current officeholder in roster'}
          </dt>
          <dd>
            {r.chamber === 'house' ? r.historicalWinner : r.currentSenator} (
            {r.held})
          </dd>
        </div>
        <div>
          <dt>
            Historical {r.chamber === 'house' ? 'House' : 'presidential'} D/R
            margin
          </dt>
          <dd>
            {r.historicalMargin === null
              ? 'Unavailable'
              : marginLabel(r.historicalMargin)}
          </dd>
        </div>
        <div>
          <dt>Standard deviation</dt>
          <dd>{r.sd.toFixed(2)} points</dd>
        </div>
        <div>
          <dt>Included polling</dt>
          <dd>
            {poll && scenario.usePolls
              ? poll.pollster
              : 'Historical baseline only'}
          </dd>
        </div>
        <div>
          <dt>Uniform-swing tipping frequency</dt>
          <dd>{(100 * r.pivotal).toFixed(2)}%</dd>
        </div>
      </dl>
      <h3>How this mean is constructed</h3>
      <div className="equation small-equation">
        {base.toFixed(2)} + {pollAdj.toFixed(2)} +{' '}
        {(scenario.environment - REFERENCE_ENVIRONMENT).toFixed(2)} +{' '}
        {(scenario.overrides[r.id] || 0).toFixed(2)} = {r.mean.toFixed(2)}
      </div>
      <p className="footnote">
        Reference-environment baseline + poll adjustment + national scenario
        shift + your local adjustment. Positive is Democratic.
      </p>
      <div className="local-adjustment">
        <h3>
          <SlidersHorizontal size={17} />
          Your local hypothesis
        </h3>
        <Parameter
          label="Race-specific margin adjustment"
          min={-30}
          max={30}
          value={scenario.overrides[r.id] || 0}
          onChange={(v) =>
            onChange({
              ...scenario,
              overrides: { ...scenario.overrides, [r.id]: v },
            })
          }
          description="An explicit user assumption. It is not an estimated candidate or incumbency effect."
        />
        <button
          className="text-button"
          onClick={() => {
            const o = { ...scenario.overrides };
            delete o[r.id];
            onChange({ ...scenario, overrides: o });
          }}
        >
          Remove local adjustment
        </button>
      </div>
      {r.changedMap && (
        <p className="data-alert">
          This state changed congressional maps. This row retains 2024
          boundaries. The extra 4-point uncertainty component does not re-map
          votes or correct a boundary mismatch.
        </p>
      )}
      {r.imputed && (
        <p className="data-alert">
          No contested D/R baseline exists. The model substitutes a 35-point
          margin for the 2024 winning party and adds 10 points of independent
          uncertainty in quadrature. Test this assumption with the adjustment
          above.
        </p>
      )}
      {poll && (
        <div className="detail-poll">
          <h3>Included public survey</h3>
          <p>
            {poll.democraticCandidate} <b>{poll.democraticPercent}%</b> ·{' '}
            {poll.republicanCandidate} <b>{poll.republicanPercent}%</b>
          </p>
          <p className="muted">
            {poll.pollster} · {poll.fieldStart} to {poll.fieldEnd} ·{' '}
            {poll.sampleSize.toLocaleString()} {poll.population}
          </p>
          <p className="footnote">
            {scenario.usePolls
              ? `Mean-adjustment weight: ${(r.pollWeight * 100).toFixed(1)}%.`
              : 'Polling is turned off in this scenario.'}{' '}
            Only the latest eligible survey in the collected state sample is
            used. Coverage is not exhaustive.
          </p>
          <a
            className="source-link"
            href={poll.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Read the original survey <ArrowUpRight size={14} />
          </a>
        </div>
      )}
      <a
        className="source-link"
        href={r.sourceUrl}
        target="_blank"
        rel="noreferrer"
      >
        {r.chamber === 'house'
          ? 'Historical returns and provenance'
          : 'Senate seat roster'}{' '}
        <ArrowUpRight size={14} />
      </a>
    </div>
  );
}
