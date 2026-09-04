import test from 'node:test';
import assert from 'node:assert/strict';
import raw from '../public/data/live-polls.json' with { type: 'json' };
import { validateBundle, bundleIsNewer } from '../lib/live/schema.ts';
import { raceParameters, DEFAULTS } from '../lib/election/model.ts';
import { canStand, CHARACTERS, ZONES } from '../lib/capitol/layout.ts';
void test('published live edition meets consumer schema', () =>
  assert.equal(validateBundle(raw).revision, raw.revision));
void test('incompatible model edition is rejected', () =>
  assert.throws(() => validateBundle({ ...raw, modelVersion: '2.0' })));
void test('malformed health and future checks cannot poison the cache', () => {
  for (const sources of [[null], [{ ...raw.sources[0], lastSuccess: 123 }]])
    assert.throws(() => validateBundle({ ...raw, sources }));
  assert.throws(() =>
    validateBundle({ ...raw, checkedAt: '2099-01-01T00:00:00Z' }),
  );
  assert.throws(() =>
    validateBundle({ ...raw, changedAt: '2099-01-01T00:00:00Z' }),
  );
});
void test('generic poll cannot enter a Senate selection', () => {
  const p = raw.polls.find((p) => p.chamber === 'generic')!;
  assert.throws(() =>
    validateBundle({ ...raw, senatePollIds: { 'IA-SEN': p.id } }),
  );
});
void test('selected poll must be eligible', () => {
  const b = structuredClone(raw),
    id = b.anchorPollIds[0];
  b.polls.find((p) => p.id === id)!.eligible = false;
  assert.throws(() => validateBundle(b));
});
void test('invalid answer shares are rejected even in unmodeled polls', () => {
  const b = structuredClone(raw);
  b.polls[0].answers[0].pct = NaN;
  assert.throws(() => validateBundle(b));
});
void test('older checks cannot replace newer offline data', () => {
  const b = validateBundle(raw);
  assert.equal(
    bundleIsNewer({ ...b, checkedAt: '2026-08-01T12:00:00Z' }, b),
    false,
  );
});
void test('new anchor does not double-count movement in a polling-informed mean', () => {
  const r = {
    id: 'TEST',
    state: 'IA',
    region: 'Midwest',
    held: 'R' as const,
    baseline: -5,
    extraSigma: 0,
    poll: { margin: 3, se: 2 },
  };
  const p = { ...DEFAULTS, environment: 7, referenceEnvironment: 7 };
  const a = raceParameters(r, p),
    b = raceParameters(r, { ...p, environment: 9, referenceEnvironment: 9 });
  assert.ok(Math.abs(b.mean - a.mean - 2 * (1 - a.pollWeight)) < 1e-9);
  const c = raceParameters(r, { ...p, environment: 9 });
  assert.ok(Math.abs(c.mean - a.mean - 2) < 1e-9);
});
void test('a rotated visible wall is also solid', () => {
  assert.equal(
    canStand(
      13.33265,
      4.04442,
      [
        {
          x: Math.cos(Math.PI / 16) * 14,
          z: Math.sin(Math.PI / 16) * 14,
          w: 2.8,
          d: 0.7,
          angle: -Math.PI / 16 + Math.PI / 2,
        },
      ],
      0,
    ),
    false,
  );
});
void test('characters reference existing rooms and retain independents', () => {
  assert.equal(CHARACTERS.filter((c) => c.party === 'I').length, 2);
  assert.ok(CHARACTERS.every((c) => ZONES.some((z) => z.id === c.zone)));
});
