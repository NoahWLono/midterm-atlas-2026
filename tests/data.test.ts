import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULTS,
  simulate,
  raceParameters,
  scenarioQuery,
  parseScenario,
  controlAt,
  type ModelRace,
} from '../lib/election/model.ts';
import data from '../lib/election/races.json' with { type: 'json' };
import house from '../public/data/house-2024-baseline.json' with { type: 'json' };
import sen from '../public/data/senate-roster.json' with { type: 'json' };
import pres from '../public/data/presidential-2024.json' with { type: 'json' };
import sr from '../public/data/senate-ratings-cook.json' with { type: 'json' };
import hr from '../public/data/cook-house-competitive-ratings.json' with { type: 'json' };
import gov from '../public/data/governors.json' with { type: 'json' };
const races = data.races as (ModelRace & {
  chamber: string;
  imputed: boolean;
  historicalMargin: number | null;
  pollId: string | null;
})[];
void test('House has 435 unique seats and official 2024 split', () => {
  assert.equal(house.districts.length, 435);
  assert.equal(new Set(house.districts.map((r) => r.id)).size, 435);
  assert.equal(
    house.districts.filter((r) => r.winnerParty === 'D').length,
    215,
  );
  assert.equal(
    house.districts.filter((r) => r.winnerParty === 'R').length,
    220,
  );
});
void test('Senate roster exactly accounts for all 100 seats', () => {
  assert.equal(sen.races.length, 35);
  assert.equal(sen.races.filter((r) => r.heldParty === 'D').length, 13);
  assert.equal(sen.races.filter((r) => r.heldParty === 'R').length, 22);
  assert.equal(sen.races.filter((r) => r.electionType === 'special').length, 2);
  assert.equal(34 + 31 + sen.races.length, 100);
});
void test('every source national presidential vote total reconciles', () => {
  assert.equal(pres.states.length, 51);
  for (const k of ['harrisVotes', 'trumpVotes', 'totalVotes'] as const)
    assert.equal(
      pres.states.reduce((s: number, r) => s + r[k], 0),
      pres.national[k],
    );
});
void test('missing House contests remain explicit, with no sentinel counts', () => {
  assert.equal(
    house.districts.filter((r) => r.twoPartyMarginD === null).length,
    37,
  );
  assert.equal(races.filter((r) => r.imputed).length, 37);
  for (const r of house.districts)
    for (const k of ['demVotes', 'repVotes'] as const)
      assert.ok(r[k] === null || r[k] >= 0);
});
void test('all model identities and margins are valid', () => {
  assert.equal(races.length, 470);
  assert.equal(new Set(races.map((r) => r.id)).size, 470);
  assert.equal(races.filter((r) => r.pollId).length, 7);
  for (const r of races) {
    assert.ok(Number.isFinite(r.baseline));
    assert.ok(Number.isFinite(r.extraSigma));
    assert.ok(['Northeast', 'Midwest', 'South', 'West'].includes(r.region));
    assert.ok(['D', 'R'].includes(r.held));
  }
});
void test('dated ratings count every category exactly', () => {
  assert.equal(sr.ratings.length, 35);
  assert.equal(new Set(sr.ratings.map((r) => r.state)).size, 35);
  assert.equal(
    Object.values(hr.summary).reduce((s: number, v) => s + v, 0),
    435,
  );
  assert.equal(hr.races.length, 37);
  assert.equal(new Set(hr.races.map((r) => r.id)).size, 37);
  assert.equal(hr.races.filter((r) => r.rating === 'Toss Up').length, 21);
});
void test('governor roster reconciles state election and party counts', () => {
  assert.equal(gov.races.length, 36);
  assert.equal(new Set(gov.races.map((r) => r.state)).size, 36);
  assert.equal(gov.races.filter((r) => r.heldParty === 'D').length, 18);
  assert.equal(gov.races.filter((r) => r.openSeat).length, 18);
});
void test('shared scenarios round-trip local adjustments without data loss', () => {
  const p = {
    ...DEFAULTS,
    environment: -3.25,
    usePolls: false,
    overrides: { 'TX-S2-2026': 5, 'AK-AL': -3 },
  };
  assert.deepEqual(parseScenario(scenarioQuery(p, 'senate')), p);
});
void test('local override changes only the specified race mean', () => {
  const a = races[0],
    b = races[1],
    p = { ...DEFAULTS, overrides: { [a.id]: 8 } };
  assert.ok(
    Math.abs(raceParameters(a, p).mean - raceParameters(a, DEFAULTS).mean - 8) <
      1e-12,
  );
  assert.equal(raceParameters(b, p).mean, raceParameters(b, DEFAULTS).mean);
});
void test('complete chamber outputs conserve probability and seats', () => {
  for (const chamber of ['house', 'senate']) {
    const rr = races.filter((r) => r.chamber === chamber);
    const r = simulate(
      rr,
      DEFAULTS,
      chamber === 'house' ? 0 : 34,
      chamber === 'house' ? 435 : 100,
      chamber === 'house' ? 218 : 51,
      3000,
    );
    assert.equal(
      r.histogram.reduce((a, b) => a + b, 0),
      3000,
    );
    assert.ok(
      r.draws.every(
        (x) =>
          Number.isInteger(x) && x >= r.fixedDem && x <= r.fixedDem + rr.length,
      ),
    );
    assert.equal(r.demControl + r.repControl, 1);
    assert.equal(controlAt(r, DEFAULTS.environment), r.demControl);
    assert.ok(
      Math.abs(
        r.races.reduce((a, x) => a + x.probability, 0) + r.fixedDem - r.demMean,
      ) < 0.7,
    );
    assert.ok(Math.abs(r.races.reduce((a, x) => a + x.pivotal, 0) - 1) < 1e-12);
  }
});
