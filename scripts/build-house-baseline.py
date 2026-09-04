import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'public' / 'data'
rows = [r for r in csv.DictReader((ROOT / 'mit-house-2024-v14-rows.csv').open())
        if r['year'] == '2024' and r['state_po'] != 'DC']
dem_parties = {'DEMOCRAT', 'DEMOCRATIC-FARMER-LABOR', 'DEMOCRATIC-NONPARTISAN LEAGUE'}
rep_parties = {'REPUBLICAN', 'REPUBLICAN, LIBERTARIAN'}
changed = {'AL', 'CA', 'FL', 'LA', 'MO', 'NC', 'OH', 'TN', 'TX', 'UT'}
groups = defaultdict(list)
corrections = []
for r in rows:
    if r['state_po'] == 'NY' and r['district'] == '5' and r['candidate'] == 'CONSERVATIVE':
        corrections.append({'district': 'NY-05', 'originalCandidate': r['candidate'],
                            'originalParty': r['party'], 'correctCandidate': 'PAUL KING',
                            'correctParty': 'CONSERVATIVE, COMMON SENSE', 'votes': 5840,
                            'basis': 'Clerk PDF printed page 50: continuation ballot line below Paul King'})
        r['candidate'] = 'PAUL KING'
        r['party'] = 'CONSERVATIVE, COMMON SENSE'
    groups[r['state_po'], int(r['district'])].append(r)

districts = []
for (state, district), rs in sorted(groups.items()):
    candidates = defaultdict(lambda: {'votes': 0, 'party': 'O', 'ballotParties': []})
    noncandidate = {'BLANK', 'BLANK VOTES', 'OVER VOTES', 'VOID', 'EXHAUSTED BALLOTS'}
    excluded = 0
    for r in rs:
        if r['candidate'] in noncandidate:
            excluded += int(r['candidatevotes'])
            continue
        c = candidates[r['candidate']]
        c['votes'] += int(r['candidatevotes'])
        c['ballotParties'].append(r['party'])
        if r['party'] in dem_parties:
            c['party'] = 'D'
        elif r['party'] in rep_parties:
            c['party'] = 'R'
    cs = sorted((dict(sourceName=name, name=name.title(), **c) for name, c in candidates.items()), key=lambda c: -c['votes'])
    winner = cs[0]
    dv = sum(c['votes'] for c in cs if c['party'] == 'D')
    rv = sum(c['votes'] for c in cs if c['party'] == 'R')
    ov = sum(c['votes'] for c in cs if c['party'] == 'O')
    source_total = int(rs[0]['totalvotes'])
    untallied = source_total < 0
    flags = []
    if untallied:
        flags.append('unopposed_no_vote_tally')
    if not dv or not rv:
        flags.append('no_contested_democratic_republican_baseline')
    if any(len(c['ballotParties']) > 1 for c in cs):
        flags.append('fusion_votes_combined_by_candidate')
    if state in changed:
        flags.append('state_changed_congressional_map_for_2026')
    if state == 'AK':
        flags.append('ranked_choice_first_round_in_source')
    if state == 'ME' and district == 2:
        flags.append('ranked_choice_final_round_in_source')
    if state == 'LA':
        flags.append('2024_all_candidate_open_primary')
    if max(Counter(c['party'] for c in cs if c['party'] in {'D', 'R'}).values(), default=0) > 1:
        flags.append('multiple_candidates_same_major_party')
    for c in cs:
        if untallied:
            c['votes'] = None
    districts.append({
        'id': f'{state}-{district:02}' if district else f'{state}-AL',
        'state': rs[0]['state'].title(), 'stateAbbr': state, 'stateFips': rs[0]['state_fips'],
        'district': district, 'year': 2024,
        'winner': winner['name'], 'winnerParty': winner['party'],
        'demVotes': None if untallied else dv, 'repVotes': None if untallied else rv,
        'otherVotes': None if untallied else ov,
        'sourceTotalVotes': None if untallied else source_total,
        'validCandidateAndWriteInVotes': None if untallied else dv + rv + ov,
        'twoPartyMarginD': round(100 * (dv-rv)/(dv+rv), 6) if dv and rv and not untallied else None,
        'allVoteMarginD': round(100 * (dv-rv)/(dv+rv+ov), 6) if dv and rv and not untallied else None,
        'geographyChanged2026': state in changed,
        'sourceVersion': '20250910 (MIT V14 mirror)',
        'candidates': cs, 'flags': flags,
    })

assert len(districts) == 435
assert len({d['id'] for d in districts}) == 435
assert Counter(d['winnerParty'] for d in districts) == {'R': 220, 'D': 215}
assert sum(d['twoPartyMarginD'] is None for d in districts) == 37
assert sum(d['demVotes'] is None for d in districts) == 2

packet = {
    'asOf': '2026-09-04', 'electionDate': '2024-11-05', 'geography': '2024 congressional districts',
    'label': 'Historical 2024 House baseline, not a 2026 district forecast',
    'districtCount': 435, 'winnerCounts': dict(Counter(d['winnerParty'] for d in districts)),
    'sources': [
        {'title': 'MIT Election Data and Science Lab, U.S. House 1976–2024',
         'url': 'https://doi.org/10.7910/DVN/IG0UN2', 'versionUsed': 14,
         'license': 'CC0 1.0', 'downloadUrl': 'https://crproject.org/data/jsoncsv/mit-1976-2024-house.csv',
         'note': 'V14 public mirror. Original metadata verified. Current V15 (March 9, 2026) requires guestbook response for file downloads and was not downloaded.'},
        {'title': 'U.S. House Clerk, Statistics of the November 5, 2024 Election',
         'url': 'https://clerk.house.gov/member_info/electionInfo/2024/statistics2024.pdf',
         'published': '2025-03-10', 'role': 'Official reference and correction source'},
        {'title': 'NCSL mid-decade redistricting tracker',
         'url': 'https://www.ncsl.org/redistricting-and-census/changing-the-maps-tracking-mid-decade-redistricting?maptype=tile',
         'updated': '2026-09-01', 'role': 'State-level 2026 geography warning'}],
    'methodology': [
        '2024 general election rows, mode TOTAL, special FALSE; DC excluded to retain 435 voting districts.',
        'Democratic state affiliates mapped to D. Republican/Libertarian Vermont nominee mapped to R. Fusion ballot lines combined by identical candidate within district.',
        'D/R vote values are sums over candidates affiliated with each major party. They are not always the top two candidate totals; Louisiana and Alaska may contain multiple candidates from one party.',
        'twoPartyMarginD = 100 * (D-R)/(D+R), positive Democratic; allVoteMarginD uses candidate and generic write-in votes as denominator.',
        '37 districts without a contested D/R baseline have null margins. FL-20 and OK-03 were elected unopposed without a tabulated vote count; raw sentinel 1/-1 is converted to null.',
        'Alaska contains first-round counts; Maine 2 contains the final ranked-choice count. No new ranked-choice reconstruction is applied.',
        'Ten changed-map states are flagged wholesale; this is conservative state-level tracking, not a district boundary crosswalk.',
        'Each raw 2024 candidate vote value was found in the Clerk PDF text. The 435-seat winner split reproduces the official 220 R / 215 D result. No claim is made of full row-by-row name reconciliation to the PDF.',
        'The baseline contains no 2026 district polling or incumbent updates. Winner names refer to 2024 elected candidates, not current officeholders.'
    ],
    'corrections': corrections, 'districts': districts,
}
(ROOT / 'house-2024-baseline.json').write_text(json.dumps(packet, indent=2, ensure_ascii=False))
keys = ['id','state','stateAbbr','district','winner','winnerParty','demVotes','repVotes','otherVotes','sourceTotalVotes','validCandidateAndWriteInVotes','twoPartyMarginD','allVoteMarginD','geographyChanged2026']
with (ROOT / 'house-2024-baseline.csv').open('w') as f:
    writer = csv.DictWriter(f, fieldnames=keys)
    writer.writeheader()
    writer.writerows({k:d[k] for k in keys} for d in districts)
print(json.dumps({'districts': len(districts), 'winners': packet['winnerCounts'], 'missingDRMargins': 37,
                  'missingVoteTallies': 2, 'changedMapStates': sorted(changed)}, indent=2))
