import json, pathlib, math
root=pathlib.Path(__file__).resolve().parents[1]
dest=root/'public/data'
h=json.load(open(dest/'house-2024-baseline.json'));s=json.load(open(dest/'senate-roster.json'));p=json.load(open(dest/'presidential-2024.json'));polls=json.load(open(dest/'senate-polls.json'))
regions={}
for name,states in {'Northeast':'CT ME MA NH RI VT NJ NY PA','Midwest':'IN IL MI OH WI IA KS MN MO NE ND SD','South':'DE FL GA MD NC SC VA DC WV AL KY MS TN AR LA OK TX','West':'AZ CO ID MT NV NM UT WY AK CA HI OR WA'}.items():
 for st in states.split():regions[st]=name
pres={x['state']:x for x in p['states']}; pn=100*(p['national']['harrisVotes']-p['national']['trumpVotes'])/(p['national']['harrisVotes']+p['national']['trumpVotes'])
dem=sum(x['demVotes'] or 0 for x in h['districts']);rep=sum(x['repVotes'] or 0 for x in h['districts']);hn=100*(dem-rep)/(dem+rep)
rows=[]
for x in h['districts']:
 raw=x['twoPartyMarginD']; adjusted=raw if raw is not None else (35 if x['winnerParty']=='D' else -35)
 rows.append(dict(id=x['id'],state=x['stateAbbr'],stateName=x['state'],region=regions[x['stateAbbr']],name=x['id'],chamber='house',baseline=adjusted-hn,held=x['winnerParty'],extraSigma=math.sqrt((4 if x['geographyChanged2026'] else 0)**2+(10 if raw is None else 0)**2),historicalMargin=raw,historicalWinner=x['winner'],changedMap=x['geographyChanged2026'],imputed=raw is None,sourceUrl=h['sources'][0]['url'],demVotes=x['demVotes'],repVotes=x['repVotes'],status='2024 result',pollId=None))
for x in s['races']:
 eligible=[z for z in polls['polls'] if z['state']==x['state'] and z['includeInDefaultIllustration'] and z['electionType'] in ['general','special-general']]
 poll=sorted(eligible,key=lambda z:z['fieldEnd'],reverse=True)[0] if eligible else None
 result=dict(id=x['id'],state=x['state'],stateName=x['stateName'],region=regions[x['state']],name=x['stateName']+(' (special)' if x['electionType']=='special' else ''),chamber='senate',baseline=pres[x['state']]['twoPartyDemMinusRepMargin']-pn,held=x['heldParty'],extraSigma=0,historicalMargin=pres[x['state']]['twoPartyDemMinusRepMargin'],historicalWinner=None,changedMap=False,imputed=False,currentSenator=x['currentSenator'],status=x['incumbentStatus'],electionType=x['electionType'],sourceUrl=x['sources'][0],demVotes=pres[x['state']]['harrisVotes'],repVotes=pres[x['state']]['trumpVotes'],pollId=poll['id'] if poll else None)
 if poll:
  d,r,n=poll['democraticPercent'],poll['republicanPercent'],poll['sampleSize'];u=(d-r)/(d+r);share=(d+r)/100
  result['poll']=dict(margin=100*u,se=100*math.sqrt((1-u*u)/(n*share)))
 rows.append(result)
json.dump({'snapshot':'2026-09-04','nationalHouseBenchmark':hn,'nationalPresidentialBenchmark':pn,'houseValidDemVotes':dem,'houseValidRepVotes':rep,'houseMissingMargins':sum(x['imputed'] for x in rows),'houseChangedDistricts':sum(x['changedMap'] for x in rows),'races':rows},open(root/'lib/election/races.json','w'),separators=(',',':'))
json.dump(polls,open(root/'lib/election/polls.json','w'),separators=(',',':'))
print('470 total races:',len(rows),'House national',hn,'Pres national',pn,'Senate poll coverage',sum(x['pollId'] is not None for x in rows))
