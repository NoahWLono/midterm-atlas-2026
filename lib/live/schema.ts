export type LivePoll = {
  id: string;
  provider: string;
  firm: string;
  sponsor: string;
  chamber: 'generic' | 'senate' | 'house';
  raceId: string | null;
  state: string;
  start: string;
  end: string;
  published: string;
  population: 'LV' | 'RV' | 'A';
  sample: number;
  dem: number | null;
  rep: number | null;
  demName: string;
  repName: string;
  answers: { name: string; pct: number }[];
  source: string;
  eligible: boolean;
  reason: string;
  partisan: boolean;
  primaryVerified: boolean;
  sampleNote: string;
};
export type LiveBundle = {
  schemaVersion: 1;
  modelVersion: string;
  revision: string;
  checkedAt: string;
  changedAt: string;
  latestFieldEnd: string;
  refreshEndsAt: string;
  referenceEnvironment: number;
  anchorPollIds: string[];
  senatePollIds: Record<string, string>;
  polls: LivePoll[];
  sources: {
    name: string;
    url: string;
    status: 'ok' | 'error';
    lastAttempt: string;
    lastSuccess: string | null;
    latestFieldEnd?: string | null;
    count: number;
    error?: string;
  }[];
};
export const LIVE_URL =
  'https://raw.githubusercontent.com/NoahWLono/midterm-atlas-2026/main/public/data/live-polls.json';
export const EDITION_URL =
  'https://raw.githubusercontent.com/NoahWLono/midterm-atlas-2026/main/public/data/editions/';
export function validateBundle(value: unknown): LiveBundle {
  if (!value || typeof value !== 'object')
    throw new Error('Missing polling bundle');
  const b = value as LiveBundle;
  const timestamp = (v: unknown): v is string =>
    typeof v === 'string' && Number.isFinite(Date.parse(v));
  const day = (v: unknown): v is string =>
    timestamp(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (
    b.schemaVersion !== 1 ||
    b.modelVersion !== '1.1' ||
    !/^[a-f0-9]{16}$/.test(b.revision) ||
    !Number.isFinite(b.referenceEnvironment) ||
    Math.abs(b.referenceEnvironment) > 100 ||
    !timestamp(b.checkedAt) ||
    !timestamp(b.changedAt) ||
    Date.parse(b.checkedAt) > Date.now() + 10 * 60_000 ||
    Date.parse(b.changedAt) > Date.parse(b.checkedAt) ||
    !day(b.latestFieldEnd) ||
    !timestamp(b.refreshEndsAt) ||
    !Array.isArray(b.polls) ||
    !b.polls.length ||
    b.polls.length > 10000 ||
    !Array.isArray(b.sources) ||
    !Array.isArray(b.anchorPollIds) ||
    !b.senatePollIds
  )
    throw new Error('Polling schema changed');
  for (const s of b.sources) {
    if (
      !s ||
      typeof s.name !== 'string' ||
      typeof s.url !== 'string' ||
      !s.url.startsWith('https://') ||
      !['ok', 'error'].includes(s.status) ||
      !timestamp(s.lastAttempt) ||
      Date.parse(s.lastAttempt) > Date.parse(b.checkedAt) ||
      (s.lastSuccess !== null &&
        (!timestamp(s.lastSuccess) ||
          Date.parse(s.lastSuccess) > Date.parse(s.lastAttempt))) ||
      (s.latestFieldEnd != null && !day(s.latestFieldEnd)) ||
      !Number.isInteger(s.count) ||
      s.count < 0 ||
      (s.error !== undefined && typeof s.error !== 'string')
    )
      throw new Error('Invalid source health');
  }
  const ids = new Set<string>();
  for (const p of b.polls) {
    if (
      !p.id ||
      ids.has(p.id) ||
      !['generic', 'senate', 'house'].includes(p.chamber) ||
      !['LV', 'RV', 'A'].includes(p.population) ||
      !Number.isFinite(p.sample) ||
      p.sample < 50 ||
      p.start > p.end ||
      !Number.isFinite(Date.parse(p.end)) ||
      !p.source.startsWith('https://') ||
      !Array.isArray(p.answers) ||
      typeof p.eligible !== 'boolean'
    )
      throw new Error('Invalid polling observation');
    if (
      p.dem !== null &&
      (p.rep === null ||
        !Number.isFinite(p.dem + p.rep) ||
        Math.min(p.dem, p.rep) < 0 ||
        p.dem + p.rep > 100 ||
        p.dem + p.rep <= 0)
    )
      throw new Error('Invalid polling shares');
    if (
      p.answers.some((a) => !Number.isFinite(a.pct) || a.pct < 0 || a.pct > 100)
    )
      throw new Error('Invalid answer shares');
    ids.add(p.id);
  }
  if (
    [...b.anchorPollIds, ...Object.values(b.senatePollIds)].some(
      (id) => !ids.has(id),
    )
  )
    throw new Error('Missing selected poll');
  const selected = (id: string) => b.polls.find((p) => p.id === id)!;
  for (const id of b.anchorPollIds) {
    const p = selected(id);
    if (
      p.chamber !== 'generic' ||
      !p.eligible ||
      p.partisan ||
      p.population === 'A' ||
      p.dem === null ||
      p.rep === null
    )
      throw new Error('Invalid national selection');
  }
  for (const [race, id] of Object.entries(b.senatePollIds)) {
    const p = selected(id);
    if (
      p.chamber !== 'senate' ||
      p.raceId !== race ||
      !p.eligible ||
      p.partisan ||
      p.population === 'A' ||
      p.dem === null ||
      p.rep === null
    )
      throw new Error('Invalid Senate selection');
  }
  return b;
}
export function bundleIsNewer(candidate: LiveBundle, current: LiveBundle) {
  return Date.parse(candidate.checkedAt) >= Date.parse(current.checkedAt);
}
