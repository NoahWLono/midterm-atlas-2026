/** Educational rules for ordinary federal legislation, under stated assumptions. */
export type Chamber = 'house' | 'senate';
export type Vote = {
  yea: number;
  nay: number;
  present: number;
  absent: number;
};
export type VoteRule = 'passage' | 'cloture' | 'override';
export function assessVote(
  chamber: Chamber,
  rule: VoteRule,
  vote: Vote,
  vpYea = false,
) {
  if (chamber === 'house' && rule === 'cloture')
    throw new Error('Senate cloture does not apply in the House');
  const total = chamber === 'house' ? 435 : 100;
  if (
    Object.values(vote).some((n) => !Number.isInteger(n) || n < 0) ||
    Object.values(vote).reduce((a, b) => a + b, 0) !== total
  )
    throw new Error('Vote counts must match a full chamber');
  const voting = vote.yea + vote.nay,
    attending = voting + vote.present;
  const quorum = attending >= Math.floor(total / 2) + 1;
  const required =
    rule === 'cloture'
      ? 60
      : rule === 'override'
        ? Math.ceil((voting * 2) / 3)
        : Math.floor(voting / 2) + 1;
  const tieBreak =
    quorum &&
    rule === 'passage' &&
    chamber === 'senate' &&
    voting > 0 &&
    vote.yea === vote.nay &&
    vpYea;
  return {
    quorum,
    required,
    tieBreak,
    passed: quorum && voting > 0 && (vote.yea >= required || tieBreak),
    voting,
    attending,
  };
}
export type RollCall = {
  party: 'D' | 'R';
  choice: 'yea' | 'nay' | 'present' | 'absent';
  seat: number;
};
export function makeRollCall(
  chamber: Chamber,
  demSeats: number,
  demSupport: number,
  repSupport: number,
  attendance: number,
  seed: number,
  presentRate = 0,
) {
  const total = chamber === 'house' ? 435 : 100;
  if (
    !Number.isInteger(demSeats) ||
    demSeats < 0 ||
    demSeats > total ||
    [demSupport, repSupport, attendance, presentRate].some(
      (n) => !Number.isFinite(n) || n < 0 || n > 100,
    )
  )
    throw new Error('Invalid chamber or vote assumptions');
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const rows: RollCall[] = Array.from({ length: total }, (_, seat) => {
    const party = seat < demSeats ? 'D' : 'R';
    const choice =
      random() * 100 >= attendance
        ? 'absent'
        : random() * 100 < presentRate
          ? 'present'
          : random() * 100 < (party === 'D' ? demSupport : repSupport)
            ? 'yea'
            : 'nay';
    return { party, choice, seat: seat + 1 };
  });
  const counts: Vote = { yea: 0, nay: 0, present: 0, absent: 0 };
  rows.forEach((r) => counts[r.choice]++);
  return { rows, counts };
}
export const BILLS = [
  {
    id: 'access',
    title: 'Federal Building Accessibility Act',
    number: 'DEMO-01',
    summary:
      'A fictional program to audit accessibility in federally owned public buildings and publish a five-year improvement plan.',
    amendment:
      'Add a public cost estimate and phased implementation timetable.',
    debate:
      'How should Congress balance accessibility, cost estimates, and implementation capacity?',
  },
  {
    id: 'records',
    title: 'Public Records Modernization Act',
    number: 'DEMO-02',
    summary:
      'A fictional program to improve preservation, search, and public access to nonclassified federal historical records.',
    amendment:
      'Add an annual audit of privacy protections and preservation costs.',
    debate:
      'What belongs in public access standards, and how should agencies protect personal information?',
  },
  {
    id: 'bridges',
    title: 'Bridge Inspection Coordination Act',
    number: 'DEMO-03',
    summary:
      'A fictional requirement for federal agencies to coordinate bridge inspection reporting and publish comparable maintenance data.',
    amendment:
      'Add a pilot period and an independent evaluation before expansion.',
    debate:
      'Which reporting standards help decision makers without duplicating existing work?',
  },
] as const;
export const STAGES = [
  [
    'committee',
    'Committee hearing',
    'A committee considers the proposal, hears testimony, and may amend and report a bill. This tour compresses referral, hearings, markup, and reporting.',
  ],
  [
    'house',
    'House passage',
    'An ordinary bill needs a majority of members present and voting, with a quorum present. Representatives may vote yea, nay, or present.',
  ],
  [
    'cloture',
    'Senate debate / cloture',
    'For most legislation, ending debate under Rule XXII requires three-fifths of senators duly chosen and sworn: 60 in this full 100-seat scenario. Invoking cloture does not pass the bill.',
  ],
  [
    'senate',
    'Senate passage',
    'After debate, ordinary passage needs a majority of senators voting, with a quorum present. The vice president may break a tie.',
  ],
  [
    'president',
    'Presentment',
    'Both chambers must approve identical text before enrollment and presentment. This simulation assumes identical text after the committee amendment.',
  ],
  [
    'override-house',
    'House veto override',
    'After a veto, the House may reconsider. Overriding requires two-thirds of members present and voting, with a quorum present.',
  ],
  [
    'override-senate',
    'Senate veto override',
    'Both chambers must override by two-thirds of those voting, with a quorum present. The vice president cannot supply a two-thirds vote.',
  ],
  [
    'complete',
    'Disposition',
    'This outcome is a procedural demonstration under your assumptions, not a predicted vote by real lawmakers.',
  ],
] as const;
export const PROCEDURE_SOURCES = [
  [
    'Constitution: Congress and lawmaking',
    'https://constitution.congress.gov/browse/article-1/',
  ],
  ['Senate voting', 'https://www.senate.gov/legislative/votes_new.htm'],
  [
    'Senate cloture rule',
    'https://www.senate.gov/about/powers-procedures/filibusters-cloture/overview.htm',
  ],
  [
    'House: the legislative process',
    'https://www.house.gov/the-house-explained/the-legislative-process',
  ],
  [
    '120th Congress: constitutional term dates',
    'https://constitution.congress.gov/constitution/amendment-20/',
  ],
];
