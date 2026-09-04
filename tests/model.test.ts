import test from 'node:test';
import assert from 'node:assert/strict';
import {
  simulate,
  DEFAULTS,
  normalCDF,
  pollTwoParty,
  posterior,
  quantile,
  randomNormal,
  parseScenario,
  histogramBins,
} from '../lib/election/model.ts';
const race = (id: string, mean = 0, region = 'South') => ({
  id,
  state: id,
  region,
  baseline: mean,
  held: 'D' as const,
  extraSigma: 0,
});
void test('symmetric single race has equal odds', () => {
  const x = simulate(
    [race('A')],
    {
      ...DEFAULTS,
      environment: 0,
      nationalSigma: 0,
      regionalSigma: 0,
      localSigma: 4,
    },
    0,
    1,
    1,
    30000,
  );
  assert.ok(Math.abs(x.demControl - 0.5) < 0.012);
});
void test('same seed reproduces every draw', () => {
  const p = { ...DEFAULTS, environment: 0 };
  assert.deepEqual(
    simulate([race('A')], p, 0, 1, 1, 200),
    simulate([race('A')], p, 0, 1, 1, 200),
  );
});
void test('majority arithmetic includes seats not up for election', () => {
  const x = simulate(
    [race('A', 100)],
    { ...DEFAULTS, environment: 0 },
    50,
    52,
    51,
    1000,
  );
  assert.equal(x.demControl, 1);
  assert.equal(x.demMedian, 51);
  assert.equal(x.repControl, 0);
});
void test('a fifty-fifty Senate belongs to Republicans under VP tie rule', () => {
  const x = simulate(
    [race('A', -100)],
    { ...DEFAULTS, environment: 0 },
    50,
    100,
    51,
    100,
  );
  assert.equal(x.demControl, 0);
  assert.equal(x.repControl, 1);
});
void test('a Democratic uniform shift cannot lower any simulated seat count', () => {
  const races = [race('A', -2), race('B', 2)];
  const low = simulate(races, { ...DEFAULTS, environment: -5 }, 0, 2, 2, 1000);
  const high = simulate(races, { ...DEFAULTS, environment: 5 }, 0, 2, 2, 1000);
  assert.ok(high.draws.every((v, i) => v >= low.draws[i]));
});
void test('shared shocks produce wider seat tails than independent equal marginal error', () => {
  const races = Array.from({ length: 30 }, (_, i) => race(String(i)));
  const shared = simulate(
    races,
    {
      ...DEFAULTS,
      environment: 0,
      nationalSigma: 4,
      regionalSigma: 0,
      localSigma: 1,
    },
    0,
    30,
    16,
    10000,
  );
  const independent = simulate(
    races,
    {
      ...DEFAULTS,
      environment: 0,
      nationalSigma: 0,
      regionalSigma: 0,
      localSigma: Math.sqrt(17),
    },
    0,
    30,
    16,
    10000,
  );
  assert.ok(
    shared.demHigh - shared.demLow >
      2 * (independent.demHigh - independent.demLow),
  );
});
void test('poll normalization and precision are not confused with raw margins', () => {
  const x = pollTwoParty(46, 40, 1000);
  assert.ok(Math.abs(x.margin - 6.976744) < 0.00001);
  assert.ok(x.se > 3);
  assert.throws(() => pollTwoParty(0, 0, 1000));
});
void test('posterior shrinks toward poll without exceeding either input', () => {
  const x = posterior(-8, 7, 4, 4);
  assert.ok(x.mean > -8 && x.mean < 4);
  assert.ok(x.sd < 7);
  assert.ok(x.weight > 0 && x.weight < 1);
});
void test('CDF and quantiles obey numerical boundaries', () => {
  assert.ok(Math.abs(normalCDF(0) - 0.5) < 1e-6);
  assert.ok(normalCDF(-9) < 1e-10);
  assert.equal(quantile([1, 2, 3, 4], 0.5), 2.5);
});
void test('random normal samples have correct variance', () => {
  const rng = randomNormal(42);
  const a = Array.from({ length: 50000 }, () => rng());
  const mean = a.reduce((s, v) => s + v, 0) / a.length;
  const v = a.reduce((s, v) => s + (v - mean) ** 2, 0) / a.length;
  assert.ok(Math.abs(mean) < 0.025);
  assert.ok(Math.abs(v - 1) < 0.04);
});
void test('scenario URL validation rejects nonfinite and out-of-range inputs', () => {
  const x = parseScenario(
    '?env=Infinity&national=-4&local=999&seed=abc&polls=no',
  );
  assert.equal(x.environment, DEFAULTS.environment);
  assert.equal(x.nationalSigma, DEFAULTS.nationalSigma);
  assert.equal(x.localSigma, DEFAULTS.localSigma);
  assert.equal(x.seed, DEFAULTS.seed);
  assert.equal(x.usePolls, false);
});
void test('seeded generator remains 32-bit beyond five million normal draws', () => {
  const rng = randomNormal(42);
  let last = 0;
  for (let i = 0; i < 5100000; i++) last = rng();
  assert.ok(Math.abs(last - 1.5413242020294586) < 1e-12);
});

void test('histogram bins split at a control boundary without losing mass', () => {
  const h = Array(436).fill(0);
  h[217] = 3;
  h[218] = 24;
  h[219] = 7;
  const bins = histogramBins(h, 216, 222, 3, 218);
  assert.ok(bins.every((b) => !(b.seat < 218 && b.end >= 218)));
  assert.equal(
    bins.filter((b) => b.seat >= 218).reduce((s, b) => s + b.count, 0),
    31,
  );
  assert.equal(
    bins.reduce((s, b) => s + b.count, 0),
    34,
  );
});
