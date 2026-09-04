import raw from './races.json';
import pollsRaw from './polls.json';
import type { ModelRace } from './model';
export type Race = ModelRace & {
  stateName: string;
  name: string;
  chamber: 'house' | 'senate';
  historicalMargin: number | null;
  historicalWinner?: string | null;
  changedMap: boolean;
  imputed: boolean;
  sourceUrl: string;
  demVotes: number | null;
  repVotes: number | null;
  status: string;
  currentSenator?: string;
  electionType?: string;
  pollId: string | null;
};
export const DATA = raw;
export const RACES = raw.races as Race[];
export const POLLS = pollsRaw.polls;
export const CHAMBERS = {
  house: {
    label: 'House of Representatives',
    short: 'House',
    total: 435,
    needed: 218,
    fixedDem: 0,
    priorDem: 215,
    contested: 435,
  },
  senate: {
    label: 'Senate',
    short: 'Senate',
    total: 100,
    needed: 51,
    fixedDem: 34,
    priorDem: 47,
    contested: 35,
  },
};
export function raceStatus(r: Race) {
  if (r.chamber === 'house')
    return r.changedMap
      ? 'Changed map'
      : r.imputed
        ? 'Imputed baseline'
        : '2024 baseline';
  if (r.status === 'retiring' || r.status === 'appointed-not-running')
    return 'Open seat';
  if (r.status === 'lost-primary') return 'Incumbent lost primary';
  return r.electionType === 'special' ? 'Special election' : 'Regular election';
}
