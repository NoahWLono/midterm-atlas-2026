# Midterm Atlas

An independent, nonpartisan 2026 US midterm research site with interactive congressional scenarios, polling evidence, and a governor-race companion.

**Public site:** [midterm-atlas-2026.clock.chatgpt.site](https://midterm-atlas-2026.clock.chatgpt.site)

The initial research was assembled on **September 4, 2026**. Polling now refreshes autonomously in the cloud about every six hours. The site consumes each validated edition without a redeployment or a running personal computer. Field dates, source checks, and evidence changes have separate timestamps.

## What you can explore

- A correlated Monte Carlo Senate projection for all 35 elections, with polling where a candidate matchup has been independently verified.
- A 435-seat House simulation on **2024 district boundaries**, with missing and changed-map baselines flagged.
- A separate 2026 House ratings exercise that assigns 21 tossups and calculates paths to 218.
- Searchable race tables, local margin overrides, source drilldowns, archived scenario links, and CSV exports.
- A persistent light/dark theme, initialized from the visitor's system preference.
- An interactive 3D jar containing 100 probability balls. Drag to turn it or shake the balls; neither action changes the odds.
- A live polling ledger and weighting experiment, 23 historical midterm cycles, and a 36-state governor roster with dated ratings.
- A technical appendix covering the mathematical specification, assumptions, provenance, and limitations.
- An after-hours Capitol side quest, with first-person exploration, wandering stick figures, scripted conversations, and a bill-to-law lesson. Its entrance is deliberately unobtrusive.
- An original 32-bar period-inspired march with three instrument bands: a piccolo-and-drum parade, a harpsichord salon, and an 8-bit arrangement. Audio begins on entry, with mute, volume, and remembered preferences.

## Automatic polling updates

[Refresh public polling](https://github.com/NoahWLono/midterm-atlas-2026/actions/workflows/refresh-polls.yml) runs at 01:17, 07:17, 13:17, and 19:17 UTC. GitHub may delay scheduled jobs. The workflow retires itself after November 4, 2026, at 12:00 UTC. The final archive stays available.

The updater reads the [NYT public polling CSVs](https://www.nytimes.com/interactive/polls/congressional-vote-2026.html) and [VoteHub API](https://votehub.com/polls/api/). Both publishers license their polling datasets under CC BY 4.0. The code filters and normalizes factual observations, preserves original poll links, and does not use either publisher's model or ratings.

A complete JSON bundle contains the observations, selected inputs, reference environment, revision, and source health. Each changed edition receives an immutable file. Visitors fetch the latest bundle when opening the page and every 15 minutes while it is visible. A source or network failure preserves the last validated data and shows its status. Checks older than 18 hours are flagged during the refresh window. Shared scenario links pin a polling edition; a missing edition is explicitly marked and cannot be exported as a reproduction.

The national anchor takes one unambiguous latest eligible wave per polling firm over 30 days, prefers LV to RV within the same wave, caps sample weights at 1,500, and applies a 14-day recency half-life. The Senate mean adjustment uses the latest unambiguous eligible survey per verified state matchup over 60 days. Multiple questions are retained in the ledger. Partisan/internal surveys, adult samples, and unknown matchups are excluded from the default model by the same rules for both parties. Differences beyond 0.6 percentage points per party from independently checked rounded releases are held for review. Distinct questions within a firm's newest wave are not arbitrarily averaged; unresolved alternatives are withheld. Same-day Senate polls from different firms are ordered by original verification, LV status, publication date, sample size, and stable identifier.

**Updates propagate automatically to the polling ledger, national anchor, eligible Senate means, race probabilities, chamber simulations, and sensitivity curves.** A user's explicit national-margin hypothesis remains in place until they choose "Evidence anchor." House district polls are displayed in the ledger but do not enter a model retaining 2024 boundaries.

Maps, candidate eligibility, historical results, and expert ratings are dated research inputs. The polling feeds cannot independently verify a new nominee or repair changed district geography. Coverage depends on the publishers and can lag a release.

## Interpretation

These are conditional scenarios from an original experimental model. They are not historically calibrated election forecasts. More simulated draws reduce numerical noise; they do not validate the data or assumptions.

The House model does not reaggregate 2024 votes onto changed 2026 boundaries. Governor coverage provides factual context and qualitative ratings, with no simulated probabilities. Independent race ratings do not enter the congressional simulation. Separate chamber probabilities are not a joint forecast.

The Capitol experience uses real senator identities verified September 4, 2026, with clearly fictional dialogue. Abstract voting seats avoid inventing real lawmakers' policy positions. Its 120th Congress composition is hypothetical. Architecture and walking routes are stylized. The procedure lesson separates ordinary passage, legislative cloture, and veto overrides, with explicit quorum checks. Text navigation and conversations work without WebGL; spoken dialogue uses the browser's ordinary voice, without impersonation.

This project is unaffiliated with parties, campaigns, Nate Silver, Silver Bulletin, FiveThirtyEight, or its source publishers.

## Run locally

Use Node.js 22.18+ (Node 24+ recommended), npm, and Python 3.11+. Tests use Node's native TypeScript stripping and Python's standard library.

```sh
npm ci
npm run dev
npm run test
npm run typecheck
npm run lint
npm run build
python3 scripts/refresh-polls.py
```

The site uses React, Vinext, Vite, Three.js, and Sites hosting on Cloudflare Workers. No paid API key, database, or application login is needed. Public access is configured in the hosting service; `.openai/hosting.json` identifies this deployment. A fork should register its own site and update the public data URLs before publishing.

## Source layout

| Location                              | Purpose                                                             |
| ------------------------------------- | ------------------------------------------------------------------- |
| `lib/election/model.ts`               | Seeded simulation, margin math, scenario encoding                   |
| `lib/election/races.json`             | Dated historical baselines                                          |
| `lib/live/`                           | Bundle validation, live and archived edition loading                |
| `scripts/refresh-polls.py`            | Polling ingestion, eligibility, selection, archival publication     |
| `.github/workflows/refresh-polls.yml` | Cloud schedule and publication                                      |
| `components/election/`                | Evidence, charts, methods, race explorers, 3D probability jar       |
| `lib/capitol/`                        | Procedural rules, sourced identities, 3D scene, jar physics         |
| `components/capitol/`                 | Tour, conversations, vote interface, hidden entrance                |
| `public/data/`                        | Downloadable inputs, live edition, archives, initial model manifest |
| `tests/`                              | Statistical, source, ingestion, validation, and procedural checks   |

The default simulation uses 10,000 draws, a national standard deviation of 3 points, a regional standard deviation of 1.5 points, and an independent race component of 5 points. House data-quality adjustments are additive in variance. The public methods explain the mean adjustment and normalization.

## Attribution and corrections

Election returns are attributed to the FEC, House Clerk, and MIT Election Data + Science Lab. The MIT House input is its V14 public mirror with a documented candidate-label correction. Original poll releases retain their source links. Cook ratings are dated, attributed qualitative assessments. The source-code license does not relicense third-party publications. Complete articles and polling reports are not bundled.

Instrument samples are from Versilian Studios' VSCO 2 CE and VCSL, released under CC0. The bundled files are converted to mono 22.05 kHz PCM and played with pitch shifting and envelopes. Exact original URLs, hashes, modifications, and license texts are in `public/audio/capitol/`. The march is an original composition inspired by eighteenth-century instrumentation. Its performance is deliberately playful.

Submit a GitHub issue or pull request with the affected row, original source URL, field or publication date, and proposed correction. Keep evidence changes separate from methodological changes. The live edition archive records polling changes; the initial model manifest records the historical input hashes. To change nominated Senate eligibility, update `public/data/senate-eligibility.json` with independent verification. Alaska ranked-choice and Montana's major independent field are excluded from two-party poll ingestion because this model cannot represent them adequately.
