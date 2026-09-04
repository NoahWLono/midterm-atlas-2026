import {
  ArrowUpRight,
  Download,
  BookOpen,
  Code2,
  CheckCircle2,
} from 'lucide-react';
import { DATA } from '@/lib/election/data';
import {
  REFERENCE_ENVIRONMENT,
  type Scenario,
  type Simulation,
} from '@/lib/election/model';
const AAPOR =
  'https://aapor.org/wp-content/uploads/2025/10/AAPOR-Task-Force-on-2024-Pre-Election-Polling_Report.pdf';
export function Methods({
  scenario,
  result,
}: {
  scenario: Scenario;
  result: Simulation;
}) {
  const v =
    scenario.nationalSigma ** 2 +
    scenario.regionalSigma ** 2 +
    scenario.localSigma ** 2;
  const sources = [
    [
      'Official 2024 presidential results',
      'Federal Election Commission',
      'https://www.fec.gov/resources/cms-content/documents/2024presgeresults.pdf',
    ],
    [
      'House election returns, 1976–2024',
      'MIT Election Data + Science Lab · V14 mirror used',
      'https://doi.org/10.7910/DVN/IG0UN2',
    ],
    [
      '2024 election statistics',
      'Clerk of the U.S. House of Representatives',
      'https://clerk.house.gov/member_info/electionInfo/2024/statistics2024.pdf',
    ],
    [
      '2026 Senate roster',
      'U.S. Senate · Class II',
      'https://www.senate.gov/senators/Class_II.htm',
    ],
    [
      'Senate composition and retirements',
      'U.S. Senate Daily Press Gallery',
      'https://www.dailypress.senate.gov/on-the-floor/senate-facts/',
    ],
    [
      'Changing congressional maps',
      'National Conference of State Legislatures · September 1',
      'https://www.ncsl.org/redistricting-and-census/changing-the-maps-tracking-mid-decade-redistricting?maptype=tile',
    ],
    [
      '2024 pre-election polling report',
      'American Association for Public Opinion Research',
      AAPOR,
    ],
    [
      'Survey best practices',
      'American Association for Public Opinion Research',
      'https://aapor.org/standards-and-ethics/best-practices/',
    ],
    [
      'Vice-presidential tie-breaking rule',
      'National Archives · Article I, Section 3',
      'https://www.archives.gov/founding-docs/constitution-transcript',
    ],
    [
      'Current vice president',
      'White House · JD Vance',
      'https://www.whitehouse.gov/administration/jd-vance/',
    ],
    [
      'Louisiana election procedures',
      'Louisiana Secretary of State',
      'https://www.sos.la.gov/elections-voting/types-of-elections',
    ],
    [
      'House, Senate and gubernatorial race ratings',
      'The Cook Political Report',
      'https://www.cookpolitical.com/ratings',
    ],
  ];
  return (
    <section className="section-block" id="methodology">
      <div className="section-title">
        <div>
          <p className="eyebrow">The technical appendix</p>
          <h2>Every assumption, out in the open.</h2>
        </div>
        <span className="version-label">
          <Code2 size={15} />
          Model v1.1 · versioned polling
        </span>
      </div>
      <div className="methods-layout">
        <aside className="method-aside">
          <BookOpen size={23} />
          <h3>Read the numbers with their conditions attached.</h3>
          <p>
            The model is an original, reproducible research instrument. Its
            probabilities describe simulated outcomes under your settings.
          </p>
          <p>
            It has not been trained or evaluated as a production election
            forecast. Historical calibration and fitted polling-quality grades
            are not claimed. Polling evidence updates on the published schedule.
          </p>
          <a href="/data/model-manifest.json" download className="source-link">
            Download model manifest <Download size={15} />
          </a>
          <a
            href="https://github.com/NoahWLono/midterm-atlas-2026"
            target="_blank"
            rel="noreferrer"
            className="source-link"
          >
            Inspect the public source <ArrowUpRight size={15} />
          </a>
        </aside>
        <div className="method-chapters">
          <details open>
            <summary>What is the model estimating?</summary>
            <div>
              <p>
                Each race has a latent Democratic-minus-Republican two-party
                margin. A positive margin awards the seat to the Democratic
                side; a negative margin awards it to the Republican side. We
                draw one complete chamber at a time and count seats, so
                correlated shocks can change several races together.
              </p>
              <p>
                The target is eventual party or caucus control of a full chamber
                after the cycle’s elections. It is not election-night reporting,
                certification timing, or a prediction of the Speaker vote. House
                simulations use historical 2024 district geography. Senate
                simulations use the verified 2026 set of 35 elections, including
                Florida and Ohio specials.
              </p>
              <p>
                The national slider is a hypothetical two-party environment with
                a one-for-one uniform effect on race margins. It is not an
                internally reconciled prediction of national turnout-weighted
                popular vote. The lab does not model demographic turnout, vote
                choice, campaign spending, economic fundamentals, candidate
                quality, incumbency, or third-party victories as separate
                estimated processes.
              </p>
            </div>
          </details>
          <details>
            <summary>Historical baselines and district comparability</summary>
            <div>
              <p>
                Senate baseline lean equals a state’s 2024 Harris-minus-Trump
                two-party margin minus the national two-party margin (
                {DATA.nationalPresidentialBenchmark.toFixed(4)} points). Add the
                national environment to obtain a race’s initial expected margin.
                This transfers presidential partisanship to a Senate race; that
                is an assumption, not evidence of identical candidate
                coalitions.
              </p>
              <p>
                House baseline lean equals the district’s 2024 D/R margin minus
                the D/R national House benchmark (
                {DATA.nationalHouseBenchmark.toFixed(4)} points), calculated
                from available major-party votes. Ballot availability,
                uncontested races, and turnout weights make this benchmark
                different from an unbiased national preference measure.
              </p>
              <p>
                There are {DATA.houseMissingMargins} House districts without a
                contested D/R baseline. Those receive a substituted margin of 35
                points for the 2024 winning party and an extra 10-point
                independent standard-deviation component. Real one-party
                contests do not imply a 100-point future advantage. Substitution
                is visible in each row and can be stress-tested with a local
                adjustment.
              </p>
              <p>
                {DATA.houseChangedDistricts} districts lie in the ten states
                flagged by the September 1 NCSL tracker: AL, CA, FL, LA, MO, NC,
                OH, TN, TX, UT. These retain 2024 boundaries and receive a
                separate 4-point uncertainty component. A wider interval does
                not reconstruct new districts, remove bias, or license calling
                the result a 2026 map forecast.
              </p>
              <p>
                The MIT V14 public mirror is used, with a correction to the
                NY-05 fusion-line label checked against the Clerk’s report. V15
                metadata was available but its raw download required a guestbook
                response. FL-20 and OK-03 have no tabulated vote count; nulls
                are preserved. Alaska House uses first-round counts; Maine’s 2nd
                District uses the final ranked-choice count. Same-party
                candidates are aggregated by party. These are explicit
                approximation limits.
              </p>
            </div>
          </details>
          <details>
            <summary>
              Polling normalization, selection, and mean adjustment
            </summary>
            <div>
              <p>
                For reported Democratic and Republican shares d and r (on a 0–1
                scale), the two-party margin is u = (d − r)/(d + r). In
                percentage points, m = 100u. The first-order
                simple-random-sample standard error is 100√[(1 − u²)/(n(d +
                r))]. The negative covariance between mutually exclusive vote
                categories is included in this expression.
              </p>
              <div className="equation">
                m = 100(d − r)/(d + r)
                <br />
                SE(m) ≈ 100√[(1 − u²) / (n(d + r))]
              </div>
              <p>
                This sampling approximation does not reproduce each publisher’s
                weighting or nonprobability-sampling uncertainty. We add a
                3-point non-sampling floor in quadrature for the mean
                adjustment. A reported margin of error for one candidate is not
                a margin of error for their difference.
              </p>
              <p>
                Only the latest eligible general-election survey within the
                collected state sample is used. That is seven Senate races.
                Earlier waves, an older Texas survey, and hypothetical New
                Hampshire alternatives remain visible but do not enter the
                default model. This is not a comprehensive average. Selecting an
                RV survey instead of an LV survey may change the estimand; the
                ledger preserves that distinction.
              </p>
              <p>
                At the reference environment g₀ ={' '}
                {(
                  scenario.referenceEnvironment ?? REFERENCE_ENVIRONMENT
                ).toFixed(6)}
                , combine the baseline mean with the selected poll using weight
                w = 7² / (7² + SE² + 3²). The poll-informed mean is baseline + w
                × (poll − baseline). The 7-point prior scale is analyst-chosen.
                The predictive error scales remain unchanged; this is a
                precision-weighted mean adjustment, not a coherent fitted
                Bayesian posterior predictive distribution.
              </p>
              <p>
                Your subsequent national slider change is added after that
                adjustment. We do not recondition the poll weight or refit a
                latent preference trajectory when you change the scenario. No
                retrospective partisan correction, pollster grades, house
                effects, or trend smoothing is applied.
              </p>
            </div>
          </details>
          <details open>
            <summary>Correlated errors and the simulation equation</summary>
            <div>
              <div className="equation">
                Mᵢˢ = μᵢ + Nˢ + Gᵣ⁽ⁱ⁾ˢ + Eᵢˢ
                <br />N ∼ Normal(0, σ²ₙ), Gᵣ ∼ Normal(0, σ²ᵣ)
                <br />
                Eᵢ ∼ Normal(0, σ²ₗ + q²ᵢ)
              </div>
              <p>
                One national shock is shared by every race in a chamber. One
                regional shock is shared by races in each of the four Census
                regions. Independent residual shocks complete the margin. All
                components are mutually independent before they are shared
                across races. qᵢ holds the extra uncertainty for changed-map and
                imputed House baselines.
              </p>
              <p>
                Default standard deviations are 3 points nationally, 1.5
                regionally, and 5 locally. At those settings, an ordinary race
                has standard deviation √36.25 ≈ 6.02 points. Two ordinary races
                in the same region have margin-error correlation (9 +
                2.25)/36.25 ≈ 0.31; races in different regions have correlation
                9/36.25 ≈ 0.25.
              </p>
              <p>
                These broad factors capture one kind of dependence. They omit
                state-specific, demographic, media-market, candidate, and
                district-neighbor correlations. Gaussian tails are a modeling
                choice, not a finding about election errors. Latent margins are
                not clipped to ±100 because they determine a binary winner; do
                not interpret extreme simulated margins as feasible vote shares.
              </p>
              <p>
                Democratic race win probability is Φ(μᵢ/σᵢ), evaluated
                analytically. Chamber probabilities come from 10,000 complete
                simulated outcomes. Small discrepancies between a displayed
                analytic race probability and finite simulated frequencies are
                expected.
              </p>
            </div>
          </details>
          <details>
            <summary>
              Control, caucuses, ties, and special election rules
            </summary>
            <div>
              <p>
                The House threshold is 218 of 435 seats. The Senate carries
                forward 34 seats in the Democratic caucus and 31 Republican
                seats. Of the 35 seats contested, 13 are D-held and 22 R-held.
                Democrats need 17 of the contested seats to reach 51, a net gain
                of four from the starting caucus count of 47.
              </p>
              <p>
                The two current independents are counted with the Democratic
                caucus in the carryover total. A 50–50 Senate is assigned to
                Republican control under the current Republican vice-president
                assumption. The vice president breaks ties; that does not create
                a 101st Senate seat. Caucus changes, vacancies, and
                organizational agreements can change actual chamber operation.
              </p>
              <p>
                All seats in the simulation are ultimately assigned D or R. It
                omits a separate probability of an independent or third-party
                victory. Alaska ranked choice and Louisiana multi-round contests
                are approximated as binary eventual party outcomes; no transfer
                or runoff model is fitted. An exact simulated zero margin goes
                to R as a measure-zero numerical convention, not a legal
                tie-resolution rule.
              </p>
              <p>
                November 3 is the national election date. Under Louisiana’s 2026
                House rules, a candidate may win its November 3 open primary
                with a majority; otherwise a December 12 open general election
                is needed. Other state procedures and certification schedules
                may also delay a definitive national count.
              </p>
            </div>
          </details>
          <details>
            <summary>Sensitivity curves and tipping-seat frequency</summary>
            <div>
              <p>
                All race means respond equally to a national margin shift.
                Within each simulated world, sort race margins and find the
                order statistic that crosses the chamber’s seat threshold. Its
                negative displacement defines the national environment at which
                control would change.
              </p>
              <p>
                The sensitivity curve evaluates these saved thresholds across
                national scenarios. It reuses the same errors instead of
                rerunning independent noisy simulations at every point. Local
                adjustments, poll toggles, and uncertainty settings regenerate
                the thresholds.
              </p>
              <p>
                A race’s tipping frequency is the fraction of draws in which it
                occupies that decisive rank. It does not mean that reversing
                only this race would flip control at the current environment.
                Because a national shift moves every race equally, this ranking
                is unchanged by the national mean or national error component
                alone. Local and regional changes can alter it.
              </p>
            </div>
          </details>
          <details>
            <summary>Reproducibility and numerical uncertainty</summary>
            <div>
              <p>
                The simulation uses a seeded 32-bit Mulberry32 generator and
                Box–Muller normal draws, with an explicit seed shown in the
                controls. This is ordinary Monte Carlo, not an MCMC chain.
                Repeating the same inputs and seed produces the same draws.
                Changing the seed reveals numerical noise.
              </p>
              <p>
                The standard error of an estimated control probability is
                approximately √[p(1 − p)/10,000], at most 0.5 percentage points.
                This quantifies finite-draw noise only. It says nothing about
                whether assumptions or inputs are right. A run with zero
                simulated losses cannot establish certainty; tiny tails need
                more draws or a different estimator. The display uses “&lt;1%”
                and “&gt;99%” instead of certainty claims.
              </p>
              <p>
                The central 80% interval is the 10th through 90th percentile of
                simulated seat counts. The wider 95% interval is the 2.5th
                through 97.5th percentile. Quantiles use linear interpolation,
                so an occasional fractional endpoint is possible even though
                every simulated count is integer.
              </p>
              <p>
                Separate House and Senate runs are marginal simulations. Sharing
                a seed does not align the two chambers’ national shocks across
                iterations. We therefore do not report the probability of
                unified or split control by multiplying marginal probabilities
                or pairing unaligned draws.
              </p>
            </div>
          </details>
          <details>
            <summary>Validation, calibration, and known omissions</summary>
            <div>
              <p>
                Automated checks cover reproducibility, uniform-shift
                monotonicity, majority and tie arithmetic, normalized poll
                margins, approximate normal sampling, wider tails from common
                error, source totals, seat rosters, category totals, and
                missing-data flags. Those checks verify computation and data
                handling.
              </p>
              <p>
                No rolling-origin backtest has been performed. Proper forecast
                evaluation would freeze all information available at each
                historical cutoff, re-create contemporary boundaries and
                candidate sets, and evaluate held-out cycles. Probability
                metrics would include Brier score, log score with justified
                floors, reliability plots, and interval coverage. Correlated
                errors require election-level uncertainty when comparing models.
              </p>
              <p>
                Do not confuse a successful software test with calibration. No
                Brier score or historical coverage percentage is invented here.
                The historical midterm chart is descriptive context only. The
                model has no fit to presidential approval, economics,
                incumbency, candidate spending, state-specific swing elasticity,
                or future polling.
              </p>
            </div>
          </details>
          <details>
            <summary>Nonpartisanship and publication policy</summary>
            <div>
              <p>
                Party labels use the same rules, error distributions, evidence
                thresholds, displays, and mathematical transformations. For
                D-minus-R margins, positive favors D and negative favors R. In
                the history chart, signs instead mean gains or losses for the
                president’s party. No adjustments are chosen to achieve a
                preferred partisan result. A nonpartisan method can yield
                asymmetric probabilities because the electoral map and evidence
                are asymmetric.
              </p>
              <p>
                This project is independent of candidates, parties, Nate Silver,
                Silver Bulletin, FiveThirtyEight, and the source publishers. It
                uses an original design and model. Published ratings remain
                attributed to their publisher; they do not enter the simulation.
              </p>
              <p>
                The initial research was assembled September 4, 2026. Polling
                refreshes every six hours through November 3 using GitHub
                Actions; open pages check for a new edition every 15 minutes.
                The national anchor uses the latest eligible wave per firm over
                30 days, capped sample-size weights and a 14-day half-life.
                Senate means use the latest eligible verified candidate matchup
                over 60 days. Partisan/internal and adult-only surveys are
                excluded by the same rule for both parties. Unknown matchups are
                held for verification. A source failure retains its last
                validated records and displays its status. Ratings, maps,
                candidate eligibility and historical data retain their own
                research dates. Each changed polling edition is archived; shared
                scenarios link to that edition.
              </p>
              <p>
                No account, individual voter profile, or personally targeted
                political message is needed. Scenario settings are encoded in a
                shareable URL only when you choose to share them. The model runs
                in the visitor’s browser.
              </p>
            </div>
          </details>
        </div>
      </div>
      <div className="diagnostics panel">
        <div className="section-top">
          <h3>Inspect your current uncertainty settings</h3>
          <span className="small-meta">
            Ordinary race · no extra data-quality component
          </span>
        </div>
        <div className="variance-bar">
          <span
            style={{ width: `${(scenario.nationalSigma ** 2 / v) * 100}%` }}
          >
            National
          </span>
          <span
            style={{ width: `${(scenario.regionalSigma ** 2 / v) * 100}%` }}
          >
            Regional
          </span>
          <span style={{ width: `${(scenario.localSigma ** 2 / v) * 100}%` }}>
            Local
          </span>
        </div>
        <div className="diagnostic-stats">
          <div>
            <strong>{Math.sqrt(v).toFixed(2)} pp</strong>
            <span>Margin standard deviation</span>
          </div>
          <div>
            <strong>
              {(
                (scenario.nationalSigma ** 2 + scenario.regionalSigma ** 2) /
                v
              ).toFixed(3)}
            </strong>
            <span>Same-region error correlation</span>
          </div>
          <div>
            <strong>{(scenario.nationalSigma ** 2 / v).toFixed(3)}</strong>
            <span>Different-region error correlation</span>
          </div>
          <div>
            <strong>≤ 0.50 pp</strong>
            <span>Worst-case simulation standard error</span>
          </div>
        </div>
        <p className="footnote">
          Current-run plug-in Monte Carlo standard error:{' '}
          {(result.monteCarloSE * 100).toFixed(3)} percentage points. Near
          sampled 0% or 100%, this formula understates tail uncertainty. These
          quantities describe the chosen model, not observed forecast accuracy.
        </p>
      </div>
      <div id="data" className="sources-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Sourcebook & reproducibility</p>
            <h2>Take the data with you.</h2>
          </div>
          <span className="small-meta">
            Public inputs · no account required
          </span>
        </div>
        <div className="downloads">
          {[
            [
              'house-2024-baseline.csv',
              '435 historical House baselines',
              'CSV',
            ],
            ['presidential-2024.csv', '2024 state presidential results', 'CSV'],
            ['senate-roster.json', '35-seat Senate roster', 'JSON'],
            ['senate-polls.json', 'Senate survey evidence', 'JSON'],
            [
              'generic-ballot-polls.json',
              'National generic ballot polls',
              'JSON',
            ],
            [
              'cook-house-competitive-ratings.json',
              '2026 House ratings snapshot',
              'JSON',
            ],
            [
              'senate-ratings-cook.json',
              '2026 Senate ratings snapshot',
              'JSON',
            ],
            [
              'model-manifest.json',
              'Parameters, provenance & limitations',
              'JSON',
            ],
          ].map(([file, label, kind]) => (
            <a key={file} href={`/data/${file}`} download>
              <Download size={18} />
              <span>
                {label}
                <small>{kind}</small>
              </span>
            </a>
          ))}
        </div>
        <div className="source-grid">
          {sources.map(([title, org, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              <span>
                {title}
                <small>{org}</small>
              </span>
              <ArrowUpRight size={16} />
            </a>
          ))}
        </div>
        <div className="integrity-note">
          <CheckCircle2 size={18} />
          <p>
            Sources carry their own dates. Retrieved September 4, 2026. The
            downloadable input manifest records file hashes; the source
            repository contains the transformations and tests.
          </p>
        </div>
      </div>
    </section>
  );
}
