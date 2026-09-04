/** All margins and uncertainty scales are D-minus-R two-party percentage points. */
export type Scenario = {
  environment: number;
  referenceEnvironment?: number;
  nationalSigma: number;
  regionalSigma: number;
  localSigma: number;
  usePolls: boolean;
  seed: number;
  overrides: Record<string, number>;
};
export type ModelRace = {
  id: string;
  state: string;
  region: string;
  baseline: number;
  held: 'D' | 'R';
  extraSigma: number;
  poll?: { margin: number; se: number };
};
export const REFERENCE_ENVIRONMENT = 6.976744186;
export const DEFAULTS: Scenario = {
  environment: REFERENCE_ENVIRONMENT,
  nationalSigma: 3,
  regionalSigma: 1.5,
  localSigma: 5,
  usePolls: true,
  seed: 20261103,
  overrides: {},
};
export const REGIONS = ['Northeast', 'Midwest', 'South', 'West'];
export function randomNormal(seed: number) {
  let a = seed >>> 0,
    spare: number | undefined;
  const uniform = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => {
    if (spare !== undefined) {
      const x = spare;
      spare = undefined;
      return x;
    }
    const r = Math.sqrt(-2 * Math.log(Math.max(uniform(), 1e-15)));
    const t = 2 * Math.PI * uniform();
    spare = r * Math.sin(t);
    return r * Math.cos(t);
  };
}
export function normalCDF(x: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const p =
    1 -
    d *
      t *
      (0.31938153 +
        t *
          (-0.356563782 +
            t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? p : 1 - p;
}
export function quantile(sorted: number[], q: number) {
  if (!sorted.length) return NaN;
  const p = (sorted.length - 1) * q;
  const lo = Math.floor(p);
  return sorted[lo] + (sorted[Math.ceil(p)] - sorted[lo]) * (p - lo);
}
export function pollTwoParty(d: number, r: number, n: number) {
  if (
    !Number.isFinite(d + r + n) ||
    d < 0 ||
    r < 0 ||
    d + r <= 0 ||
    d + r > 100 ||
    n <= 0
  )
    throw new Error('Invalid poll shares or sample');
  const s = (d + r) / 100;
  const u = (d - r) / (d + r);
  return { margin: 100 * u, se: 100 * Math.sqrt((1 - u * u) / (n * s)) };
}
export function posterior(
  priorMean: number,
  priorSd: number,
  pollMean: number,
  pollSd: number,
) {
  const pv = priorSd ** 2,
    qv = pollSd ** 2;
  const w = pv / (pv + qv);
  return {
    mean: priorMean + w * (pollMean - priorMean),
    sd: Math.sqrt((pv * qv) / (pv + qv)),
    weight: w,
  };
}
export function raceParameters(r: ModelRace, p: Scenario) {
  const reference = p.referenceEnvironment ?? REFERENCE_ENVIRONMENT;
  let mean = r.baseline + reference,
    weight = 0;
  if (p.usePolls && r.poll) {
    const post = posterior(
      mean,
      7,
      r.poll.margin,
      Math.sqrt(r.poll.se ** 2 + 3 ** 2),
    );
    mean = post.mean;
    weight = post.weight;
  }
  mean += p.environment - reference + (p.overrides[r.id] || 0);
  const local = Math.sqrt(p.localSigma ** 2 + r.extraSigma ** 2);
  const sd = Math.sqrt(
    p.nationalSigma ** 2 + p.regionalSigma ** 2 + local ** 2,
  );
  return {
    mean,
    sd,
    local,
    pollWeight: weight,
    probability: sd ? normalCDF(mean / sd) : mean > 0 ? 1 : 0,
  };
}
function selectK(values: number[], k: number) {
  let lo = 0,
    hi = values.length - 1;
  while (lo < hi) {
    const pivot = values[(lo + hi) >> 1];
    let i = lo,
      j = hi;
    while (i <= j) {
      while (values[i] < pivot) i++;
      while (values[j] > pivot) j--;
      if (i <= j) {
        [values[i], values[j]] = [values[j], values[i]];
        i++;
        j--;
      }
    }
    if (k <= j) hi = j;
    else if (k >= i) lo = i;
    else break;
  }
  return values[k];
}
export function simulate(
  races: ModelRace[],
  p: Scenario,
  fixedDem: number,
  total: number,
  demNeeded: number,
  iterations = 10000,
) {
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 100000)
    throw new Error('Invalid simulation count');
  if (
    !races.length ||
    !Number.isFinite(
      p.environment + p.nationalSigma + p.regionalSigma + p.localSigma,
    ) ||
    Math.min(p.nationalSigma, p.regionalSigma, p.localSigma) < 0
  )
    throw new Error('Invalid model inputs');
  const pars = races.map((r) => raceParameters(r, p));
  const rng = randomNormal(p.seed);
  const histogram = Array(total + 1).fill(0) as number[];
  const draws: number[] = [];
  const thresholds: number[] = [];
  const pivotal = Array(races.length).fill(0) as number[];
  const regionNames = [...new Set([...REGIONS, ...races.map((r) => r.region)])];
  const regionIndex = races.map((r) => regionNames.indexOf(r.region));
  const margins = Array(races.length).fill(0) as number[];
  const k = races.length - (demNeeded - fixedDem);
  let demWins = 0,
    sum = 0;
  for (let n = 0; n < iterations; n++) {
    const national = rng() * p.nationalSigma;
    const regions = regionNames.map(() => rng() * p.regionalSigma);
    let seats = fixedDem;
    for (let i = 0; i < races.length; i++) {
      const m =
        pars[i].mean +
        national +
        regions[regionIndex[i]] +
        rng() * pars[i].local;
      margins[i] = m;
      if (m > 0) seats++;
    }
    draws.push(seats);
    histogram[seats]++;
    sum += seats;
    if (seats >= demNeeded) demWins++;
    if (k >= 0 && k < races.length) {
      const critical = selectK([...margins], k);
      thresholds.push(p.environment - critical);
      pivotal[margins.indexOf(critical)]++;
    } else thresholds.push(k < 0 ? Infinity : -Infinity);
  }
  const sorted = [...draws].sort((a, b) => a - b);
  thresholds.sort((a, b) => a - b);
  const demControl = demWins / iterations;
  return {
    iterations,
    draws,
    histogram,
    thresholds,
    demControl,
    repControl: 1 - demControl,
    demMean: sum / iterations,
    demMedian: quantile(sorted, 0.5),
    demLow: quantile(sorted, 0.1),
    demHigh: quantile(sorted, 0.9),
    dem95Low: quantile(sorted, 0.025),
    dem95High: quantile(sorted, 0.975),
    monteCarloSE: Math.sqrt((demControl * (1 - demControl)) / iterations),
    races: races.map((r, i) => ({
      ...r,
      ...pars[i],
      pivotal: pivotal[i] / iterations,
    })),
    total,
    demNeeded,
    fixedDem,
  };
}
export type Simulation = ReturnType<typeof simulate>;
export function controlAt(result: Simulation, environment: number) {
  let lo = 0,
    hi = result.thresholds.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (result.thresholds[mid] < environment) lo = mid + 1;
    else hi = mid;
  }
  return lo / result.iterations;
}
export function probabilityLabel(p: number) {
  if (p < 0.01) return '<1%';
  if (p > 0.99) return '>99%';
  return `${Math.round(100 * p)}%`;
}
export function marginLabel(m: number, digits = 1) {
  return Math.abs(m) < 0.05
    ? 'Even'
    : `${m > 0 ? 'D' : 'R'} +${Math.abs(m).toFixed(digits)}`;
}
export function parseScenario(search: string): Scenario {
  const q = new URLSearchParams(search);
  const num = (key: string, def: number, min: number, max: number) => {
    const raw = q.get(key);
    if (raw === null || raw.trim() === '') return def;
    const v = Number(raw);
    return Number.isFinite(v) && v >= min && v <= max ? v : def;
  };
  const overrides: Record<string, number> = {};
  try {
    const o = JSON.parse(q.get('overrides') || '{}');
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      for (const [key, val] of Object.entries(o)) {
        if (
          /^[A-Z0-9-]{2,25}$/.test(key) &&
          typeof val === 'number' &&
          Number.isFinite(val) &&
          Math.abs(val) <= 30
        )
          overrides[key] = val;
      }
    }
  } catch {
    /* Invalid shared overrides are ignored. */
  }
  return {
    environment: num('env', DEFAULTS.environment, -15, 15),
    nationalSigma: num('national', DEFAULTS.nationalSigma, 0, 8),
    regionalSigma: num('regional', DEFAULTS.regionalSigma, 0, 6),
    localSigma: num('local', DEFAULTS.localSigma, 1, 12),
    seed: Math.round(num('seed', DEFAULTS.seed, 0, 4294967295)),
    usePolls: q.get('polls') !== 'no',
    overrides,
  };
}
export function scenarioQuery(p: Scenario, chamber: string) {
  const q = new URLSearchParams({
    chamber,
    env: String(p.environment),
    national: String(p.nationalSigma),
    regional: String(p.regionalSigma),
    local: String(p.localSigma),
    seed: String(p.seed),
    polls: p.usePolls ? 'yes' : 'no',
  });
  if (Object.keys(p.overrides).length)
    q.set('overrides', JSON.stringify(p.overrides));
  return q.toString();
}
export function histogramBins(
  histogram: number[],
  from: number,
  to: number,
  step: number,
  threshold: number,
) {
  const bins: { seat: number; end: number; count: number }[] = [];
  for (let start = from; start <= to;) {
    let end = Math.min(to, start + step - 1);
    if (start < threshold && end >= threshold) end = threshold - 1;
    bins.push({
      seat: start,
      end,
      count: histogram.slice(start, end + 1).reduce((a, b) => a + b, 0),
    });
    start = end + 1;
  }
  return bins;
}
