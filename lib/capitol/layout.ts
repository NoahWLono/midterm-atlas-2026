export type ZoneId =
  | 'grounds'
  | 'rotunda'
  | 'statuary'
  | 'house'
  | 'senate'
  | 'old-senate'
  | 'committee'
  | 'library'
  | 'court';
export type Zone = {
  id: ZoneId;
  name: string;
  x: number;
  z: number;
  radius: number;
  fact: string;
  source: string;
};
export const ZONES: Zone[] = [
  {
    id: 'grounds',
    name: 'West Front & grounds',
    x: -52,
    z: 0,
    radius: 26,
    fact: 'The Capitol anchors the east end of the National Mall. The grounds and distances here are compressed for exploration.',
    source:
      'https://www.aoc.gov/explore-capitol-campus/buildings-grounds/capitol-building',
  },
  {
    id: 'rotunda',
    name: 'The Rotunda',
    x: 0,
    z: 0,
    radius: 14,
    fact: 'The central ceremonial Rotunda is 96 feet across. Its real canopy rises roughly 180 feet above the floor. Legislative votes take place in the wings.',
    source:
      'https://www.aoc.gov/explore-capitol-campus/blog/capitol-rotunda-restoration',
  },
  {
    id: 'statuary',
    name: 'National Statuary Hall',
    x: 0,
    z: 32,
    radius: 13,
    fact: 'This was the House chamber until 1857. Today it is a historic public hall; the present House chamber is farther south.',
    source:
      'https://www.visitthecapitol.gov/education-resource/evolution-capitol',
  },
  {
    id: 'house',
    name: 'House chamber · south wing',
    x: 0,
    z: 69,
    radius: 23,
    fact: 'The present House chamber has a rostrum and galleries. This scene provides 435 abstract voting seats, without claiming a future roster.',
    source:
      'https://history.house.gov/Blog/2019/January/1-24-Education-House-Chamber/',
  },
  {
    id: 'senate',
    name: 'Senate chamber · north wing',
    x: 0,
    z: -66,
    radius: 20,
    fact: 'The Senate chamber occupies the north wing. Senators have individual desks arranged on a semicircular tiered platform facing the rostrum.',
    source:
      'https://www.aoc.gov/explore-capitol-campus/buildings-grounds/capitol-building/senate-wing/senate-chamber',
  },
  {
    id: 'old-senate',
    name: 'Old Senate Chamber',
    x: 30,
    z: -28,
    radius: 11,
    fact: 'The historic Old Senate Chamber lies northeast of the Rotunda. This small room is distinct from the modern Senate chamber.',
    source:
      'https://www.aoc.gov/explore-capitol-campus/buildings-grounds/capitol-building',
  },
  {
    id: 'committee',
    name: 'Committee hearing room',
    x: 30,
    z: 28,
    radius: 11,
    fact: 'Committees can hold hearings, mark up legislation, and report bills. This is a fictional teaching room in a simplified location.',
    source: 'https://www.house.gov/the-house-explained/the-legislative-process',
  },
  {
    id: 'library',
    name: 'Library of Congress exterior',
    x: 94,
    z: 34,
    radius: 18,
    fact: 'The Thomas Jefferson Building of the Library of Congress stands east of the Capitol. This exterior is a simplified landmark.',
    source: 'https://www.loc.gov/visit/',
  },
  {
    id: 'court',
    name: 'Supreme Court exterior',
    x: 94,
    z: -54,
    radius: 18,
    fact: 'The Supreme Court is a separate branch of government. It does not vote on ordinary bills as part of Congress.',
    source: 'https://www.supremecourt.gov/visiting/visiting.aspx',
  },
];
export type Collider = {
  x: number;
  z: number;
  w: number;
  d: number;
  angle?: number;
};
export function canStand(
  x: number,
  z: number,
  walls: Collider[],
  radius = 0.6,
) {
  return (
    x > -135 &&
    x < 140 &&
    z > -145 &&
    z < 145 &&
    !walls.some((w) => {
      const a = w.angle || 0,
        dx = x - w.x,
        dz = z - w.z;
      const localX = Math.cos(a) * dx - Math.sin(a) * dz,
        localZ = Math.sin(a) * dx + Math.cos(a) * dz;
      return (
        Math.abs(localX) < w.w / 2 + radius &&
        Math.abs(localZ) < w.d / 2 + radius
      );
    })
  );
}
export function nearestZone(x: number, z: number) {
  return ZONES.reduce(
    (best, z2) =>
      Math.hypot(x - z2.x, z - z2.z) < Math.hypot(x - best.x, z - best.z)
        ? z2
        : best,
    ZONES[0],
  );
}
export type Character = {
  id: string;
  name: string;
  state: string;
  party: 'D' | 'R' | 'I' | 'staff';
  termEnd: string;
  zone: ZoneId;
  line: string;
  source: string;
  role: string;
};
const class1 = 'https://www.senate.gov/senators/Class_I.htm',
  class3 = 'https://www.senate.gov/senators/Class_III.htm';
export const CHARACTERS: Character[] = [
  {
    id: 'thune',
    name: 'John Thune',
    state: 'South Dakota',
    party: 'R',
    termEnd: '2029-01-03',
    zone: 'senate',
    line: 'This panel separates the vote to limit debate from the vote on the bill.',
    source: class3,
    role: 'U.S. senator',
  },
  {
    id: 'murkowski',
    name: 'Lisa Murkowski',
    state: 'Alaska',
    party: 'R',
    termEnd: '2029-01-03',
    zone: 'old-senate',
    line: 'Try changing attendance and watch the quorum indicator.',
    source: class3,
    role: 'U.S. senator',
  },
  {
    id: 'curtis',
    name: 'John Curtis',
    state: 'Utah',
    party: 'R',
    termEnd: '2031-01-03',
    zone: 'rotunda',
    line: 'Each state has two Senate seats. That is why the Senate map behaves differently from the House.',
    source: class1,
    role: 'U.S. senator',
  },
  {
    id: 'britt',
    name: 'Katie Britt',
    state: 'Alabama',
    party: 'R',
    termEnd: '2029-01-03',
    zone: 'senate',
    line: 'The clerk records each senator’s answer during a roll-call vote.',
    source: class3,
    role: 'U.S. senator',
  },
  {
    id: 'scott',
    name: 'Tim Scott',
    state: 'South Carolina',
    party: 'R',
    termEnd: '2029-01-03',
    zone: 'committee',
    line: 'Both chambers need to approve the same text before it reaches the president.',
    source: class3,
    role: 'U.S. senator',
  },
  {
    id: 'schumer',
    name: 'Chuck Schumer',
    state: 'New York',
    party: 'D',
    termEnd: '2029-01-03',
    zone: 'senate',
    line: 'A bill can have enough votes to pass and still face a separate cloture hurdle.',
    source: class3,
    role: 'U.S. senator',
  },
  {
    id: 'murray',
    name: 'Patty Murray',
    state: 'Washington',
    party: 'D',
    termEnd: '2029-01-03',
    zone: 'committee',
    line: 'A presidential veto sends the bill back for Congress to reconsider.',
    source: class3,
    role: 'U.S. senator',
  },
  {
    id: 'warnock',
    name: 'Raphael Warnock',
    state: 'Georgia',
    party: 'D',
    termEnd: '2029-01-03',
    zone: 'rotunda',
    line: 'A tie in the Senate may be decided by the vice president. The House has no equivalent tie-breaking officer.',
    source: class3,
    role: 'U.S. senator',
  },
  {
    id: 'baldwin',
    name: 'Tammy Baldwin',
    state: 'Wisconsin',
    party: 'D',
    termEnd: '2031-01-03',
    zone: 'statuary',
    line: 'The Rotunda is a ceremonial room. The modern chambers are in the wings: Senate north, House south.',
    source: class1,
    role: 'U.S. senator',
  },
  {
    id: 'gallego',
    name: 'Ruben Gallego',
    state: 'Arizona',
    party: 'D',
    termEnd: '2031-01-03',
    zone: 'grounds',
    line: 'These numbers are your scenario. They are not anyone’s announced vote.',
    source: class1,
    role: 'U.S. senator',
  },
  {
    id: 'king',
    name: 'Angus King',
    state: 'Maine',
    party: 'I',
    termEnd: '2031-01-03',
    zone: 'old-senate',
    line: 'Party affiliation and a caucus arrangement are separate facts. Keep both labels clear.',
    source: class1,
    role: 'U.S. senator',
  },
  {
    id: 'sanders',
    name: 'Bernie Sanders',
    state: 'Vermont',
    party: 'I',
    termEnd: '2031-01-03',
    zone: 'statuary',
    line: 'Try an abstention. Presence and a yes-or-no vote affect different calculations.',
    source: class1,
    role: 'U.S. senator',
  },
  {
    id: 'guide',
    name: 'Alex · visitor guide',
    state: 'Fictional staff character',
    party: 'staff',
    termEnd: '',
    zone: 'grounds',
    line: 'Welcome to the Capitol. The dome marks the Rotunda. Walk east through the portico, then north for the Senate or south for the House.',
    source: 'https://www.visitthecapitol.gov/us-capitol-visitor-guide',
    role: 'Fictional visitor guide',
  },
  {
    id: 'house-clerk',
    name: 'Morgan · House clerk',
    state: 'Fictional staff character',
    party: 'staff',
    termEnd: '',
    zone: 'house',
    line: 'Ordinary passage requires more yeas than nays, with a quorum present. The number 218 is not the denominator for every kind of vote.',
    source: 'https://www.house.gov/the-house-explained/the-legislative-process',
    role: 'Fictional House clerk',
  },
  {
    id: 'senate-clerk',
    name: 'Sam · Senate clerk',
    state: 'Fictional staff character',
    party: 'staff',
    termEnd: '',
    zone: 'senate',
    line: 'We record cloture and final passage separately. Sixty votes to end debate do not enact a law.',
    source: 'https://www.senate.gov/about/powers-procedures/voting.htm',
    role: 'Fictional Senate clerk',
  },
  {
    id: 'archivist',
    name: 'Robin · archivist',
    state: 'Fictional staff character',
    party: 'staff',
    termEnd: '',
    zone: 'library',
    line: 'Congress creates a public record of legislation, debates, and votes. Our little tour has an exportable session journal too.',
    source: 'https://www.loc.gov/visit/',
    role: 'Fictional archivist',
  },
];
export function dialogue(character: Character, topic: string) {
  const q = topic.toLowerCase();
  if (/hello|hi\b|introduc|who are/.test(q)) return character.line;
  if (/cloture|filibuster|60|debate/.test(q))
    return 'For most legislation, Senate cloture requires three-fifths of senators duly chosen and sworn: 60 in this 100-member scenario. That limits debate; final passage is a separate vote. Nominations and reconciliation follow different procedures.';
  if (/quorum|attendance|absen|present|abst/.test(q))
    return 'A quorum is a majority of the chamber’s qualifying membership: 218 in a full House or 51 in a full Senate. An absence does not lower that membership. A present abstention counts toward attendance but not toward yes-or-no votes.';
  if (/veto|presiden|sign|law/.test(q))
    return 'Both chambers must approve identical text before presentment. A signature makes the bill law. A regular veto can be overridden only by two-thirds of those voting in each chamber, with a quorum present. This game omits the ten-day and pocket-veto branches.';
  if (/vote|bill|support|policy|party/.test(q))
    return 'The bill and every generated vote here are fictional. Party support sliders apply your assumptions symmetrically; they do not encode any real lawmaker’s views. Try the same support percentage for both parties and compare it with a polarized scenario.';
  if (/120|2027|2029|term|future|election/.test(q))
    return 'The 120th Congress’s term runs from noon January 3, 2027, to noon January 3, 2029. The 2026 elections have not yet settled its full membership or leadership. This scene uses a hypothetical chamber balance.';
  if (/rotunda|hall|where|north|south|tour|capitol/.test(q))
    return 'The Senate is in the north wing, the House in the south wing, and the Rotunda is central. National Statuary Hall is the old House chamber. Our distances, doors, and paths are stylized; this is not an actual visitor route.';
  if (/committee|amend|hearing/.test(q))
    return 'A committee may hear testimony, debate changes, and report a bill. We compress that process into a hearing and optional amendment. Changing the amendment in this demonstration changes your assumed support, not a documented position.';
  if (/real|quote|fiction|ai|script/.test(q))
    return 'These are scripted fictional conversations. Real senator identities and scheduled terms were checked on September 4, 2026. None of these lines are quotations or statements of their personal views.';
  return 'I can explain the tour, the 120th Congress, committee hearings, voting, cloture, quorum, or vetoes. Choose a topic below or ask using those words. This is a scripted civics conversation, not a live AI or a real lawmaker.';
}
