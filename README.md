# Midterm Atlas

An independent, nonpartisan 2026 US midterm research site with interactive congressional scenarios, election evidence, and a governor-race companion.

**Public site:** [midterm-atlas-2026.clock.chatgpt.site](https://midterm-atlas-2026.clock.chatgpt.site)

The evidence snapshot was assembled on **September 4, 2026**. Poll field dates and publisher dates remain attached to the inputs. The site does not update itself.

## What you can explore

- A correlated Monte Carlo Senate projection covering all 35 elections, with selected polling in seven states.
- A 435-seat House simulation on **2024 district boundaries**, with missing and changed-map baselines flagged.
- A separate 2026 House ratings exercise that assigns 21 tossups and calculates paths to 218.
- Searchable race tables, local margin overrides, source drilldowns, scenario URLs, and CSV exports.
- A polling-weight experiment, 23 historical midterm cycles, and a 36-state governor roster with dated expert ratings.
- The complete mathematical specification, assumptions, provenance, and limitations in the site's technical appendix.

## Interpretation

These are conditional scenarios from an original experimental model. They are not historically calibrated election forecasts. More simulated draws reduce numerical noise; they do not validate the data or assumptions.

The House model does not reaggregate 2024 votes onto changed 2026 boundaries. Governor coverage provides factual context and qualitative ratings, with no simulated probabilities. Independent race ratings come from their named publisher and do not enter the congressional simulation.

This project is unaffiliated with parties, campaigns, Nate Silver, Silver Bulletin, FiveThirtyEight, or the source publishers.

## Run locally

Use Node.js 22.18+ (Node 24+ recommended) and npm. Model tests use Node's native TypeScript stripping.

```sh
npm ci
npm run dev
npm run test
npm run typecheck
npm run lint
npm run build
```

The site uses React, Vinext, Vite, and the Sites integration for Cloudflare Workers. No API key, database, or application login is needed. Public access is configured in the hosting service; `.openai/hosting.json` identifies this deployment. A fork should register its own site before publishing.

## Source layout

| Location                      | Purpose                                                           |
| ----------------------------- | ----------------------------------------------------------------- |
| `lib/election/model.ts`       | Seeded simulation, margin math, scenario encoding, histogram bins |
| `lib/election/races.json`     | Compact modeled baselines and poll references                     |
| `components/election/`        | Interactive evidence, charts, methods, and race explorers         |
| `public/data/`                | Downloadable source snapshots and model manifest                  |
| `scripts/build-model-data.py` | Rebuild compact input data from bundled snapshots                 |
| `tests/`                      | Statistical invariants and source reconciliation                  |

The default simulation has 10,000 draws, a national standard deviation of 3 points, a regional standard deviation of 1.5 points, and an independent race component of 5 points. House data-quality adjustments are additive in variance. The public methods explain the mean-adjustment and poll-normalization rules.

## Data and attribution

Election returns are attributed to the FEC, the House Clerk, and MIT Election Data + Science Lab. The MIT House input is its V14 public mirror, with one documented candidate-label correction. Poll snapshots link to each original publisher. Cook ratings are dated, attributed qualitative assessments. Individual Solid/Likely House rows are not reproduced.

The model manifest records input hashes. Source facts retain their original attribution and rights; the source-code license does not relicense third-party publications. No complete polling reports or publisher articles are bundled.

## Corrections and updates

Submit a GitHub issue or pull request with the affected row, the original source URL, the source's publication or field date, and the proposed correction. Keep evidence changes separate from methodological changes. Rebuild compact inputs with `python3 scripts/build-model-data.py`, run the checks, and update the snapshot documentation before publishing.
