'use client';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme/toggle';
import { useEffect, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowDown,
  ArrowUpRight,
  ChartNoAxesCombined,
  FlaskConical,
  Info,
  GitBranch,
} from 'lucide-react';
import { ProbabilityJar } from '@/components/election/probability-jar';
import { SecretDoor } from '@/components/capitol/secret-door';
import { Controls } from '@/components/election/controls';
import { Distribution, Sensitivity } from '@/components/election/charts';
import { RaceExplorer } from '@/components/election/races';
import { PollingLab, HistoricalContext } from '@/components/election/evidence';
import { Methods } from '@/components/election/methods';
import { Governors } from '@/components/election/governors';
import { HousePaths } from '@/components/election/house-paths';
import { CHAMBERS, DATA } from '@/lib/election/data';
import {
  DEFAULTS,
  marginLabel,
  parseScenario,
  probabilityLabel,
  scenarioQuery,
  simulate,
  type Scenario,
} from '@/lib/election/model';
import {
  ElectionDataProvider,
  useElectionData,
  FALLBACK,
} from '@/lib/live/context';
import { LiveStatus, AllPolls } from '@/components/live/status';
function download(name: string, body: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Home() {
  return (
    <ElectionDataProvider>
      <ElectionHome />
    </ElectionDataProvider>
  );
}
function ElectionHome() {
  const { bundle, races: RACES, now, editionReady } = useElectionData();
  const followAnchor = useRef(true);
  const [chamber, setChamber] = useState<'house' | 'senate'>('senate');
  const [scenario, setScenario] = useState<Scenario>({
    ...DEFAULTS,
    environment: FALLBACK.referenceEnvironment,
    referenceEnvironment: FALLBACK.referenceEnvironment,
    overrides: {},
  });
  const [calculation, setCalculation] = useState(() => ({
    result: simulate(
      RACES.filter((r) => r.chamber === 'senate'),
      scenario,
      34,
      100,
      51,
    ),
    scenario,
    chamber: 'senate' as 'house' | 'senate',
    revision: bundle.revision,
  }));
  const { result } = calculation;
  const busy =
    calculation.scenario !== scenario ||
    calculation.chamber !== chamber ||
    calculation.revision !== bundle.revision ||
    !editionReady;
  const [message, setMessage] = useState('');
  const [plot, setPlot] = useState('distribution');
  useEffect(() => {
    const timer = setTimeout(() => {
      const q = new URLSearchParams(window.location.search);
      const parsed = parseScenario(window.location.search);
      followAnchor.current = !q.has('env');
      if (!q.has('env')) parsed.environment = FALLBACK.referenceEnvironment;
      parsed.referenceEnvironment = FALLBACK.referenceEnvironment;
      setScenario(parsed);
      setChamber(q.get('chamber') === 'house' ? 'house' : 'senate');
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setScenario((old) => ({
          ...old,
          environment: followAnchor.current
            ? bundle.referenceEnvironment
            : old.environment,
          referenceEnvironment: bundle.referenceEnvironment,
        })),
      0,
    );
    return () => clearTimeout(timer);
  }, [bundle.referenceEnvironment]);
  useEffect(() => {
    const timer = setTimeout(() => {
      const c = CHAMBERS[chamber];
      setCalculation({
        result: simulate(
          RACES.filter((r) => r.chamber === chamber),
          scenario,
          c.fixedDem,
          c.total,
          c.needed,
        ),
        scenario,
        chamber,
        revision: bundle.revision,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [scenario, chamber, RACES, bundle.revision]);
  const c = CHAMBERS[chamber],
    matches = result.total === c.total;
  const d = result.demControl;
  const leader = d >= 0.5 ? 'Democrats' : 'Republicans';
  const leadChance = Math.max(d, 1 - d);
  const m =
    chamber === 'house'
      ? 'Historical-map scenario'
      : 'Experimental Senate projection';
  const changeScenario = (next: Scenario) => {
    if (next.environment !== scenario.environment) followAnchor.current = false;
    setScenario(next);
  };
  const followEvidence = () => {
    followAnchor.current = true;
    setScenario((old) => ({
      ...old,
      environment: bundle.referenceEnvironment,
      referenceEnvironment: bundle.referenceEnvironment,
    }));
  };
  const share = async () => {
    if (!editionReady) {
      setMessage(
        'The requested archived edition is unavailable; sharing and export are paused.',
      );
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}?${scenarioQuery(scenario, chamber)}&edition=${bundle.revision}`;

    try {
      await navigator.clipboard.writeText(url);
      setMessage(
        'Scenario link copied. It includes your assumptions, local adjustments, and archived polling edition.',
      );
    } catch {
      setMessage(`Copy this scenario URL: ${url}`);
    }
  };
  const exportRaces = () => {
    if (busy) {
      setMessage('Wait for the current simulation to finish before exporting.');
      return;
    }
    const settings = calculation.scenario;
    const header = [
      'race',
      'state',
      'chamber',
      'mean_D_minus_R_pp',
      'D_win_probability',
      'tipping_frequency',
      'baseline_lean_pp',
      'poll_weight',
      'changed_map',
      'imputed',
      'snapshot',
      'model',
      'seed',
      'environment_pp',
      'national_sigma',
      'regional_sigma',
      'local_sigma',
      'polls_enabled',
      'local_adjustments_json',
      'reference_environment_pp',
      'polling_edition_url',
      'model_scope',
    ];
    const rows = result.races.map((r) => {
      const x = RACES.find((a) => a.id === r.id)!;
      return [
        r.id,
        r.state,
        calculation.chamber,
        r.mean.toFixed(6),
        r.probability.toFixed(8),
        r.pivotal.toFixed(8),
        r.baseline.toFixed(6),
        r.pollWeight.toFixed(6),
        x.changedMap,
        x.imputed,
        bundle.revision,
        '1.1',
        settings.seed,
        settings.environment,
        settings.nationalSigma,
        settings.regionalSigma,
        settings.localSigma,
        settings.usePolls,
        JSON.stringify(settings.overrides),
        settings.referenceEnvironment,
        `https://raw.githubusercontent.com/NoahWLono/midterm-atlas-2026/main/public/data/editions/${bundle.revision}.json`,
        calculation.chamber === 'house'
          ? '2024-map counterfactual'
          : 'experimental Senate projection',
      ];
    });
    const csv = [header, ...rows]
      .map((row) =>
        row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','),
      )
      .join('\n');
    download(
      `midterm-atlas-${calculation.chamber}-scenario.csv`,
      csv,
      'text/csv',
    );
  };

  const applyMean = (environment: number) => {
    followAnchor.current = false;
    changeScenario({ ...scenario, environment });
    setMessage(
      `National scenario set to ${marginLabel(environment)} using your selected-poll experiment.`,
    );
    document.getElementById('forecast')?.scrollIntoView({ behavior: 'smooth' });
  };
  const panel = (
    <>
      <div
        className={`workspace-grid ${busy ? 'is-updating' : ''}`}
        aria-busy={busy}
      >
        <div className="results-stack">
          {matches ? (
            <section className="panel forecast-panel">
              <div className="section-top">
                <span className="model-kicker">{m}</span>
                <span className="small-meta">
                  {scenario.seed === DEFAULTS.seed
                    ? 'Baseline seed'
                    : `Seed ${scenario.seed}`}
                </span>
              </div>
              <div className="forecast-verdict">
                <h2>
                  {leadChance < 0.55
                    ? 'Control is close under these assumptions.'
                    : `${leader} lead in this scenario.`}
                </h2>
                <p>Share of model worlds with chamber control</p>
              </div>
              <div className="probability-headline">
                <div className="dem-text">
                  <span>Democratic</span>
                  <strong>{probabilityLabel(d)}</strong>
                </div>
                <div className="probability-divider">vs.</div>
                <div className="rep-text right">
                  <span>Republican</span>
                  <strong>{probabilityLabel(1 - d)}</strong>
                </div>
              </div>
              <div
                className="control-probability"
                aria-label={`Democratic control ${probabilityLabel(d)}; Republican control ${probabilityLabel(1 - d)}`}
              >
                <span style={{ width: `${d * 100}%` }} />
                <span style={{ width: `${(1 - d) * 100}%` }} />
              </div>
              <div className="forecast-stats">
                <div>
                  <span>Median D seats</span>
                  <strong>
                    {result.demMedian}
                    <small> / {c.total}</small>
                  </strong>
                </div>
                <div>
                  <span>Central 80% range</span>
                  <strong>
                    {result.demLow}–{result.demHigh}
                  </strong>
                </div>
                <div>
                  <span>
                    D gain vs.{' '}
                    {chamber === 'house' ? '2024' : 'starting caucus'}
                  </span>
                  <strong>
                    {result.demMedian - c.priorDem >= 0 ? '+' : ''}
                    {result.demMedian - c.priorDem}
                  </strong>
                </div>
              </div>
              <div className="plot-heading">
                <h3>
                  {plot === 'distribution'
                    ? 'A distribution, not a single outcome.'
                    : 'How much would the environment need to change?'}
                </h3>
                <Tabs value={plot} onValueChange={(v) => setPlot(String(v))}>
                  <TabsList className="compact-tabs">
                    <TabsTrigger value="distribution">
                      Seat distribution
                    </TabsTrigger>
                    <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
                  </TabsList>
                  <TabsContent value="distribution">
                    <Distribution result={result} />
                  </TabsContent>
                  <TabsContent value="sensitivity">
                    <Sensitivity
                      result={result}
                      environment={scenario.environment}
                      onChange={(environment) =>
                        changeScenario({ ...scenario, environment })
                      }
                    />
                  </TabsContent>
                </Tabs>
              </div>
              <p className="forecast-caveat">
                <Info size={15} />
                <span>
                  These are conditional model probabilities, not a historically
                  calibrated forecast.{' '}
                  {chamber === 'house'
                    ? 'This simulation retains 2024 district boundaries.'
                    : `Polling is included for ${Object.keys(bundle.senatePollIds).length} of 35 races when enabled; the rest rely on state partisanship.`}
                </span>
              </p>
            </section>
          ) : (
            <output className="panel model-loading">
              <ChartNoAxesCombined size={28} />
              <h2>Calculating the {c.short} scenario…</h2>
            </output>
          )}
          <div className="election-structure">
            <div>
              <GitBranch size={20} />
              <h3>
                {chamber === 'senate'
                  ? 'The starting line matters.'
                  : 'Geography shapes the result.'}
              </h3>
            </div>
            <p>
              {chamber === 'senate' ? (
                <>
                  The Democratic caucus carries forward <b>34</b> seats;
                  Republicans carry forward <b>31</b>. With <b>35</b> elections,
                  Democrats need <b>17 wins</b> to reach 51. A 50–50 split goes
                  to Republican control under the current VP assumption.
                </>
              ) : (
                <>
                  All <b>435</b> House seats are contested; <b>218</b> makes a
                  majority. The historical data include{' '}
                  <b>{DATA.houseMissingMargins}</b> imputed baselines and{' '}
                  <b>{DATA.houseChangedDistricts}</b> districts in states with
                  changed maps. Explore the dated 2026 ratings path separately
                  above.
                </>
              )}
            </p>
          </div>
        </div>
        <Controls
          scenario={scenario}
          onChange={changeScenario}
          onShare={share}
          onAnchor={followEvidence}
          busy={busy}
        />
      </div>
      {matches && (
        <div className="meaning-row">
          <div>
            <h3>Imagine 100 possible elections.</h3>
            <p>
              Each ball represents about 1% of the model’s probability mass. A
              less likely outcome is still an outcome.
            </p>
          </div>
          <ProbabilityJar p={d} />
          <div>
            <strong>{probabilityLabel(d)}</strong>
            <p>
              Democratic control
              <br />
              <span className="dem-dot legend-square" /> D{' '}
              <span className="rep-dot legend-square" /> R
            </p>
          </div>
          <a href="#methodology">
            Understand the model <ArrowDown size={15} />
          </a>
        </div>
      )}
    </>
  );
  return (
    <>
      <a className="skip-link" href="#forecast">
        Skip to election model
      </a>
      <header className="masthead">
        <Link className="brand" href="/">
          <span className="brand-symbol">26</span>
          <span>
            Midterm <b>Atlas</b>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#forecast" className="active">
            Election lab
          </a>
          <a href="#races">Races</a>
          <a href="#polling">Polling</a>
          <a href="#governors">Governors</a>
          <a href="#methodology">Methods & data</a>
        </nav>
        <a
          className="independent"
          href="https://github.com/NoahWLono/midterm-atlas-2026"
          target="_blank"
          rel="noreferrer"
        >
          <span />
          Independent & open source <ArrowUpRight size={13} />
        </a>
        <ThemeToggle />
      </header>
      <div className="edition-bar">
        <span>United States · 2026 midterm elections</span>
        <span>Polling edition: {bundle.changedAt.slice(0, 10)}</span>
      </div>
      <main>
        <div className="page-heading">
          <div>
            <p className="eyebrow">The balance of power</p>
            <h1>
              The 2026 midterms,
              <br />
              with uncertainty included.
            </h1>
            <p className="dek">
              Explore the races. Interrogate the evidence. Change the
              assumptions.
            </p>
          </div>
          <div className="date-stamp">
            <span className="countdown">
              {Math.max(
                0,
                Math.ceil(
                  (Date.parse('2026-11-03T00:00:00-05:00') - Date.parse(now)) /
                    86400000,
                ),
              )}
              <span>days</span>
            </span>
            <strong>Until November 3</strong>
            <span>Election day · 2026</span>
            <a href="#history">
              Put this cycle in context <ArrowDown size={12} />
            </a>
          </div>
        </div>
        <div className="snapshot-note">
          <FlaskConical size={17} />
          <p>
            <strong>A public election research lab.</strong> Original,
            nonpartisan analysis with dated evidence and reproducible
            simulations. Experimental probabilities; no claim of historical
            calibration. Polling updates automatically, with source checks every
            six hours. Map and rating inputs retain their own dates.
          </p>
          <a href="#data">
            Inspect the sources <ArrowUpRight size={14} />
          </a>
        </div>
        <LiveStatus />
        <div id="forecast" className="anchor-target">
          <Tabs
            value={chamber}
            onValueChange={(v) => {
              setChamber(v as 'house' | 'senate');
              setPlot('distribution');
            }}
          >
            <TabsList className="chamber-tabs">
              <TabsTrigger value="senate">
                Senate <span>35 elections</span>
              </TabsTrigger>
              <TabsTrigger value="house">
                House of Representatives <span>435 seats</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="senate">
              {chamber === 'senate' && panel}
            </TabsContent>
            <TabsContent value="house">
              {chamber === 'house' && (
                <>
                  <HousePaths />
                  <div className="historical-model-title">
                    <h2>Now stress-test a historical-map scenario.</h2>
                    <p>
                      2024 districts, hypothetical national environment. Keep
                      the changed-map limitations in view.
                    </p>
                  </div>
                  {panel}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
        {message && (
          <output className="action-message">
            <span>{message}</span>
            <button
              onClick={() => setMessage('')}
              aria-label="Dismiss status message"
            >
              ×
            </button>
          </output>
        )}
        {matches && (
          <RaceExplorer
            key={chamber}
            result={result}
            chamber={chamber}
            scenario={scenario}
            onChange={changeScenario}
            onExport={exportRaces}
          />
        )}
        <PollingLab key={bundle.revision} onUseMean={applyMean} />
        <AllPolls />
        <section className="analysis-notes section-block" id="analysis">
          <div>
            <p className="eyebrow">Reading the landscape</p>
            <h2>Three questions behind the headline.</h2>
          </div>
          <article>
            <h3>Can a national advantage translate into seats?</h3>
            <p>
              The national surveys measure party preference under different
              questions and sampling designs. Their target populations and
              undecided shares differ. A lead in that question does not
              determine which districts change hands: the location of marginal
              voters, baseline partisanship, turnout, and candidate differences
              govern the translation.
            </p>
            <p>
              The House ratings exercise fixes non-tossups to show the
              arithmetic. The historical simulation instead moves old district
              margins uniformly. Neither identifies the current 2026 turnout
              distribution. Agreement between them would not be independent
              validation.
            </p>
            <a href="#polling">
              Compare the original survey evidence <ArrowUpRight size={14} />
            </a>
          </article>
          <article>
            <h3>Why does the Senate have its own logic?</h3>
            <p>
              Only 35 of 100 seats are on the ballot. Democrats defend 13
              contested seats and Republicans defend 22, but starting control
              gives Democrats a four-seat net-gain requirement. Favorable
              national conditions matter only insofar as enough individual state
              contests move.
            </p>
            <p>
              The model shows where historical state partisanship and selected
              race polls disagree. Large gaps are a reason to inspect
              candidate-specific evidence, not proof that either source is
              wrong. Seats without collected polling remain unusually sensitive
              to the baseline assumption.
            </p>
            <a href="#races">
              Inspect individual race assumptions <ArrowUpRight size={14} />
            </a>
          </article>
          <article>
            <h3>What could make these scenarios miss?</h3>
            <p>
              A shared survey error, differential turnout, state-specific
              coalitions, or a candidate effect can shift many races together.
              Redistricting creates a further House risk that a wider Gaussian
              band cannot repair. Third-party and multi-round outcomes are also
              simplified.
            </p>
            <p>
              Change national and regional uncertainty separately. If a headline
              probability moves sharply, it depends strongly on those
              assumptions. That is useful information about the model even
              before it tells us anything about election day.
            </p>
            <a href="#methodology">
              Read the full statistical specification <ArrowUpRight size={14} />
            </a>
          </article>
        </section>
        <Governors />
        <HistoricalContext />
        <Methods scenario={scenario} result={result} />
        <section className="publication-notes">
          <div>
            <strong>Election calendar</strong>
            <p>
              November 3, 2026: national election day. Louisiana House races may
              require a December 12 runoff. The site does not predict when every
              winner will be known.
            </p>
          </div>
          <div>
            <strong>Built for scrutiny</strong>
            <p>
              Input files, transformation code, tests, and a model manifest are
              public. Polling editions are archived as evidence changes.
              Contributions should include an original source and a clear
              account of any changed assumption.
            </p>
          </div>
        </section>
      </main>
      <footer>
        <Link className="brand" href="/">
          <span className="brand-symbol">26</span>
          <span>
            Midterm <b>Atlas</b>
          </span>
        </Link>
        <SecretDoor scenario={scenario} />
        <p>
          Independent. Nonpartisan. Reproducible.
          <br />
          Unaffiliated with any party, campaign, Nate Silver, Silver Bulletin,
          or FiveThirtyEight.
        </p>
        <a
          href="https://github.com/NoahWLono/midterm-atlas-2026"
          target="_blank"
          rel="noreferrer"
        >
          Source & corrections <ArrowUpRight size={15} />
        </a>
      </footer>
    </>
  );
}
