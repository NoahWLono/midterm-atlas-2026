import test from 'node:test';
import assert from 'node:assert/strict';
import { assessVote, makeRollCall } from '../lib/capitol/procedure.ts';
void test('House ordinary passage is majority voting with quorum', () => {
  assert.equal(
    assessVote('house', 'passage', {
      yea: 200,
      nay: 199,
      present: 1,
      absent: 35,
    }).passed,
    true,
  );
  assert.equal(
    assessVote('house', 'passage', {
      yea: 100,
      nay: 0,
      present: 0,
      absent: 335,
    }).passed,
    false,
  );
});
void test('a House tie loses', () =>
  assert.equal(
    assessVote('house', 'passage', {
      yea: 210,
      nay: 210,
      present: 15,
      absent: 0,
    }).passed,
    false,
  ));
void test('legislative cloture requires 60 under full membership', () => {
  assert.equal(
    assessVote('senate', 'cloture', {
      yea: 59,
      nay: 31,
      present: 0,
      absent: 10,
    }).passed,
    false,
  );
  assert.equal(
    assessVote('senate', 'cloture', {
      yea: 60,
      nay: 30,
      present: 0,
      absent: 10,
    }).passed,
    true,
  );
});
void test('VP can break an ordinary Senate tie, never cloture or override', () => {
  const v = { yea: 50, nay: 50, present: 0, absent: 0 };
  assert.equal(assessVote('senate', 'passage', v, true).passed, true);
  assert.equal(assessVote('senate', 'cloture', v, true).passed, false);
  assert.equal(assessVote('senate', 'override', v, true).passed, false);
});
void test('override uses those voting, not fixed 290/67', () => {
  assert.equal(
    assessVote('house', 'override', {
      yea: 200,
      nay: 100,
      present: 0,
      absent: 135,
    }).passed,
    true,
  );
  assert.equal(
    assessVote('senate', 'override', {
      yea: 60,
      nay: 30,
      present: 0,
      absent: 10,
    }).passed,
    true,
  );
});
void test('roll calls are reproducible and conserve membership', () => {
  const a = makeRollCall('house', 220, 70, 30, 90, 42);
  assert.deepEqual(a, makeRollCall('house', 220, 70, 30, 90, 42));
  assert.equal(a.rows.length, 435);
  assert.equal(a.rows.filter((r) => r.party === 'D').length, 220);
  assert.equal(
    Object.values(a.counts).reduce((a, b) => a + b, 0),
    435,
  );
});
void test('extreme support and attendance behave exactly', () => {
  assert.equal(makeRollCall('senate', 51, 100, 0, 100, 42).counts.yea, 51);
  assert.equal(makeRollCall('house', 218, 100, 100, 0, 42).counts.absent, 435);
});
void test('invalid membership fails', () =>
  assert.throws(() =>
    assessVote('senate', 'passage', {
      yea: 100,
      nay: 1,
      present: 0,
      absent: 0,
    }),
  ));
