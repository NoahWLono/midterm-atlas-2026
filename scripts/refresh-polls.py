#!/usr/bin/env python3
"""Fetch public polling facts, validate, and atomically publish one versioned bundle.
No model fitting, scraped prose, credentials, or paid services are involved.
"""
import argparse, collections, csv, re, datetime as dt, hashlib, io, json, math, os, sys, time, unicodedata
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/data/live-polls.json'
CUTOFF='2026-11-04T12:00:00Z'
VOTEHUB='https://api.votehub.com/polls'
NYT='https://www.nytimes.com/newsgraphics/polls/'
# Only independently checked nominated D/R pairs may change Senate means.
# Unrecognized and alternative matchups remain visible in the evidence ledger.
REGISTRY=json.loads((ROOT/'public/data/senate-eligibility.json').read_text())
PAIRS={r['state']:(r['democratic'],r['republican']) for r in REGISTRY['pairs'] if r['eligible']}
ALIASES={r['state']:r.get('aliases',{}) for r in REGISTRY['pairs']}
STATES={r['stateName']:r['state'] for r in json.loads((ROOT/'lib/election/races.json').read_text())['races']}
SENATE_IDS={r['state']:r['id'] for r in json.loads((ROOT/'lib/election/races.json').read_text())['races'] if r['chamber']=='senate'}
def canonical(name):
 s=''.join(c.lower() for c in unicodedata.normalize('NFKD',name) if c.isalnum())
 aliases={'emersoncollegepolling':'emersoncollege','theeconomistyougov':'yougov','beaconresearchshawcompanyresearch':'foxnews','universityoftexastexaspoliticsproject':'universityoftexas'}
 return aliases.get(s,s)
def matches(name,state,side):
 pair=PAIRS.get(state)
 if not pair:return False
 index=0 if side=='democratic' else 1
 return canonical(name) in {canonical(x) for x in [pair[index],*ALIASES.get(state,{}).get(side,[])]}
def date(s):
 s=s.split(' ')[0]
 for fmt in ('%Y-%m-%d','%m/%d/%y','%m/%d/%Y'):
  try:return dt.datetime.strptime(s,fmt).date().isoformat()
  except ValueError:pass
 raise ValueError('Unrecognized date')
def truth(s):return str(s).strip().lower() in ('true','1','yes')
def party_pair(rows):
 d=[r for r in rows if r.get('party')=='DEM'];r=[r for r in rows if r.get('party')=='REP']
 if len(d)!=1 or len(r)!=1:return None
 try:return float(d[0]['pct']),float(r[0]['pct']),d[0]['candidate_name'],r[0]['candidate_name']
 except (ValueError,KeyError):return None

def validate_poll(p,today):
 if not p.get('id') or not isinstance(p['id'],str):raise ValueError('Missing ID')
 if not ('2026-01-01'<=p['start']<=p['end']<=today):raise ValueError('Invalid field dates')
 dt.date.fromisoformat(p['start']);dt.date.fromisoformat(p['end'])
 if not isinstance(p['sample'],(int,float)) or not math.isfinite(p['sample']) or not 50<=p['sample']<=1000000:raise ValueError('Invalid sample')
 if p['population'] not in ('LV','RV','A'):raise ValueError('Unknown population')
 if urlparse(p['source']).scheme!='https' or not urlparse(p['source']).netloc:raise ValueError('Invalid source URL')
 if p.get('dem') is not None or p.get('rep') is not None:
  d,r=p.get('dem'),p.get('rep')
  if not isinstance(d,(float,int)) or not isinstance(r,(float,int)) or not math.isfinite(d+r) or min(d,r)<0 or not 0<d+r<=100:raise ValueError('Invalid shares')
 for answer in p.get('answers',[]):
  value=answer.get('pct')
  if not isinstance(value,(float,int)) or not math.isfinite(value) or not 0<=value<=100:raise ValueError('Invalid answer share')
 return p

def fetch(url):
 for attempt in range(3):
  try:
   with urlopen(Request(url,headers={'User-Agent':'MidtermAtlas/1.1 (+https://github.com/NoahWLono/midterm-atlas-2026)','Accept':'application/json,text/csv,*/*'}),timeout=35) as r:
    b=r.read(15_000_001)
    if len(b)>15_000_000:raise ValueError('Source exceeds size limit')
    return b.decode('utf-8-sig')
  except Exception:
   if attempt==2:raise
   time.sleep(2**attempt)

def manual_polls():
 result=[]
 for p in json.loads((ROOT/'public/data/generic-ballot-polls.json').read_text())['polls']:
  result.append(dict(id=p['id'],provider='Original releases',firm=p['pollster'],sponsor=p['sponsor'],chamber='generic',raceId=None,state='US',start=p['startDate'],end=p['endDate'],published=p['endDate'],population=p['populationCode'],sample=p['sampleSize'],dem=p['dem'],rep=p['rep'],demName='Democratic',repName='Republican',answers=[dict(name='Democratic',pct=p['dem']),dict(name='Republican',pct=p['rep'])],source=p['source'],eligible=True,reason='Original release checked',partisan=False,primaryVerified=True,sampleNote=p['sampleSizeDefinition']))
 for p in json.loads((ROOT/'public/data/senate-polls.json').read_text())['polls']:
  eligible=p['electionType'] in ('general','special-general')
  result.append(dict(id=p['id'],provider='Original releases',firm=p['pollster'],sponsor=p['sponsor'],chamber='senate',raceId=SENATE_IDS.get(p['state']),state=p['state'],start=p['fieldStart'],end=p['fieldEnd'],published=p['publishedAt'],population=p['population'],sample=p['sampleSize'],dem=p['democraticPercent'],rep=p['republicanPercent'],demName=p['democraticCandidate'],repName=p['republicanCandidate'],answers=[dict(name=p['democraticCandidate'],pct=p['democraticPercent']),dict(name=p['republicanCandidate'],pct=p['republicanPercent'])],source=p['sourceUrl'],eligible=eligible,reason='Original release checked' if eligible else 'Alternative matchup; excluded',partisan=False,primaryVerified=True,sampleNote='; '.join(p.get('notes',[]))))
 return result

def eligibility(p):
 if p['dem'] is None:return False,'No unambiguous D/R pair'
 if p['population']=='A':return False,'Adult sample; excluded from model'
 if p['partisan']:return False,'Partisan/internal sponsor; shown, excluded from model'
 if p['chamber']=='house':return False,'2026 district poll; historical House map not compatible'
 if p['chamber']=='senate':
  pair=PAIRS.get(p['state'])
  if not pair or not matches(p['demName'],p['state'],'democratic') or not matches(p['repName'],p['state'],'republican'):return False,'Matchup requires independent verification'
 return True,'Eligible polling observation'

def district_id(state,seat):
 if re.fullmatch(r'[A-Z]{2}-\d{1,2}',state or ''):return state.split('-')[0],state.split('-')[0]+'-'+state.split('-')[1].zfill(2)
 if re.fullmatch(r'[A-Z]{2}-\d{1,2}',seat or ''):return seat.split('-')[0],seat.split('-')[0]+'-'+seat.split('-')[1].zfill(2)
 words=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth','sixteenth','seventeenth','eighteenth','nineteenth']
 label=seat.lower().replace(' congressional district','').replace(' district','').strip()
 if label in ('at-large','at large'):return state,state+'-01'
 if label in words:return state,state+'-'+str(words.index(label)+1).zfill(2)
 tens={'twentieth':20,'thirtieth':30,'fortieth':40,'fiftieth':50,'twenty':20,'thirty':30,'forty':40,'fifty':50}
 if label in tens:return state,state+'-'+str(tens[label])
 parts=label.split('-')
 if len(parts)==2 and parts[0] in tens and parts[1] in words:return state,state+'-'+str(tens[parts[0]]+words.index(parts[1])+1)
 return state,seat or state

def read_nyt(body,chamber,today):
 rows=list(csv.DictReader(io.StringIO(body)))
 required={'poll_id','question_id','stage','cycle','party','candidate_name','pct','start_date','end_date','sample_size','population','state','url','hypothetical'}
 if not rows or not required.issubset(rows[0]):raise ValueError('NYT schema changed')
 groups=collections.defaultdict(list);skipped=collections.Counter()
 since=(dt.date.fromisoformat(today)-dt.timedelta(days=75)).isoformat()
 for r in rows:
  if r['cycle']!='2026' or r['stage']!='general':skipped['Other cycle or primary']+=1;continue
  try:end=date(r['end_date'])
  except ValueError:skipped['Invalid date']+=1;continue
  if end<since:continue
  groups[(r['poll_id'],r['question_id'])].append(r)
 output=[]
 for (pid,qid),group in groups.items():
  r=group[0];pair=party_pair(group)
  try:
   state=r['state'];office=chamber
   # The House file also contains national generic-ballot questions.
   if state in ('','US') and chamber=='house':office='generic';state='US'
   p=dict(id='nyt-'+qid,provider='NYT',firm=r['pollster'],sponsor=r.get('sponsors',''),chamber=office,raceId=SENATE_IDS.get(state) if office=='senate' else (r.get('seat_name') or state) if office=='house' else None,state=state,start=date(r['start_date']),end=date(r['end_date']),published=date(r['created_at']),population=(r['population'] or '').upper(),sample=int(float(r['sample_size'])),dem=pair[0] if pair else None,rep=pair[1] if pair else None,demName=pair[2] if pair else '',repName=pair[3] if pair else '',answers=[dict(name=x['candidate_name'] or x['answer'],pct=float(x['pct'])) for x in group],source=r['url_topline'] or r['url_crosstab'] or r['url'],partisan=bool(r['partisan']) or truth(r['internal']),primaryVerified=False,sampleNote='Sample and party coding as supplied by NYT; question-level denominator may differ.',pollsterId=r['pollster_id'],questionId=qid)
   if office=='house':p['state'],p['raceId']=district_id(p['state'],p['raceId'])
   p['eligible'],p['reason']=eligibility(p)
   if truth(r['hypothetical']) or r.get('subpopulation') or truth(r.get('ranked_choice_reallocated')):
    p['eligible']=False;p['reason']='Hypothetical, subgroup, or reallocated ballot'
   if office=='generic' and not (pair and canonical(p['demName']) in ('democrat','democrats','democratic','democraticparty','genericdemocrat')):
    p['eligible']=False;p['reason']='Unrecognized national question'
   validate_poll(p,today);output.append(p)
  except (ValueError,KeyError,TypeError):skipped['Invalid observation']+=1
 if not output:raise ValueError('No valid recent observations')
 return output,dict(skipped)

def read_votehub(body,chamber,today):
 raw=json.loads(body);rows=raw.get('polls') if isinstance(raw,dict) else raw
 if not isinstance(rows,list) or not rows:raise ValueError('Empty or changed VoteHub schema')
 output=[];skipped=collections.Counter()
 for r in rows:
  try:
   if r['subject']!='2026' and chamber=='generic':continue
   if chamber=='senate' and r['subject'] not in ['2026 '+s for s in STATES]:skipped['Primary or unknown subject']+=1;continue
   state=STATES.get(r['subject'].removeprefix('2026 '),'US' if chamber=='generic' else r['subject'].removeprefix('2026 '))
   names=PAIRS.get(state,('Dem','Rep') if chamber=='generic' else ('',''))
   ans=r['answers'];d=next((a for a in ans if (matches(a['choice'],state,'democratic') if chamber=='senate' else canonical(a['choice'])==canonical(names[0]))),None);rep=next((a for a in ans if (matches(a['choice'],state,'republican') if chamber=='senate' else canonical(a['choice'])==canonical(names[1]))),None)
   p=dict(id='vh-'+r['id'],provider='VoteHub',firm=r['pollster'],sponsor=', '.join(r['sponsors'] or []),chamber=chamber,raceId=SENATE_IDS.get(state) if chamber=='senate' else r.get('seat_name'),state=state,start=date(r['start_date']),end=date(r['end_date']),published=date(r['created_at']),population=(r['population'] or '').upper(),sample=int(r['sample_size']),dem=float(d['pct']) if d and rep else None,rep=float(rep['pct']) if d and rep else None,demName=names[0],repName=names[1],answers=[dict(name=a['choice'],pct=float(a['pct'])) for a in ans],source=r['url'],partisan=bool(r['partisan']) or bool(r['internal']),primaryVerified=False,sampleNote='Provider sample; no design-effect or question-denominator correction.')
   if chamber=='house':p['state'],p['raceId']=district_id(p['state'],p['raceId'])
   p['eligible'],p['reason']=eligibility(p);validate_poll(p,today);output.append(p)
  except (ValueError,KeyError,TypeError):skipped['Invalid observation']+=1
 if not output:raise ValueError('No valid recent observations')
 return output,dict(skipped)

def wave_key(p):
 return (p['chamber'],p['state'],p.get('raceId') if p['chamber']=='house' else '',canonical(p['firm']),p['end'],p['population'])

def deduplicate(polls):
 # Preserve distinct questions within a provider. Suppress exact cross-provider
 # duplicates only; mismatched values remain inspectable, not silently replaced.
 priority={'Original releases':0,'NYT':1,'VoteHub':2}
 out=[];seen={}
 for p in sorted(polls,key=lambda x:(priority.get(x['provider'],9),not x['eligible'],x['id'])):
  answers=tuple(sorted((canonical(a['name']).replace('generic','').replace('democratic','democrat'),a['pct']) for a in p.get('answers',[]) if a['name']))
  values=(p['dem'],p['rep']) if p['dem'] is not None else answers
  key=wave_key(p)+(p['start'],values,p['eligible'])
  if key in seen and seen[key]!=p['provider']:continue
  seen[key]=p['provider'];out.append(p)
 # An updated provider contradicting a checked release needs review. Neither
 # the fixed original nor the changed transcription silently wins that conflict.
 for p in out:
  if p['provider']!='Original releases':continue
  peers=[x for x in polls if x['provider']=='NYT' and wave_key(x)==wave_key(p) and canonical(x['demName'])==canonical(p['demName']) and canonical(x['repName'])==canonical(p['repName'])]
  if peers and not any(x['dem'] is not None and abs(x['dem']-p['dem'])<=.6 and abs(x['rep']-p['rep'])<=.6 for x in peers):
   for x in out:
    if x['id']==p['id'] or x['id'] in {peer['id'] for peer in peers}:x['eligible']=False;x['reason']='Source values disagree; correction review required'
 return sorted(out,key=lambda x:(x['end'],x['primaryVerified'],x['population']=='LV',x['sample'],x['published'],x['id']),reverse=True)

def unambiguous_latest(rows,key):
 chosen={}
 for p in rows:chosen.setdefault(key(p),[]).append(p)
 result=[]
 for group in chosen.values():
  newest=max(p['end'] for p in group);wave=[p for p in group if p['end']==newest]
  population='LV' if any(p['population']=='LV' for p in wave) else 'RV'
  wave=[p for p in wave if p['population']==population]
  verified=[p for p in wave if p.get('primaryVerified')]
  if verified:wave=verified
  if len({(p['dem'],p['rep']) for p in wave})>1:continue
  result.append(sorted(wave,key=lambda p:(p['sample'],p['id']),reverse=True)[0])
 return result

def national_anchor(polls,today,fallback):
 since=(dt.date.fromisoformat(today)-dt.timedelta(days=30)).isoformat()
 pool=[p for p in polls if p['chamber']=='generic' and p['eligible'] and not p['partisan'] and p['end']>=since and p['population'] in ('LV','RV')]
 rows=unambiguous_latest(pool,lambda p:canonical(p['firm']))
 if not rows:return fallback,[]
 weights=[min(1500,p['sample'])*2**(-(dt.date.fromisoformat(today)-dt.date.fromisoformat(p['end'])).days/14) for p in rows]
 mean=sum(w*100*(p['dem']-p['rep'])/(p['dem']+p['rep']) for w,p in zip(weights,rows))/sum(weights)
 return round(mean,9),[p['id'] for p in rows]

def main():
 args=argparse.ArgumentParser();args.add_argument('--offline',action='store_true');args=args.parse_args()
 now=dt.datetime.now(dt.timezone.utc);today=now.date().isoformat();stamp=now.isoformat(timespec='seconds').replace('+00:00','Z')
 if stamp>=CUTOFF:print('Polling refresh window ended; preserving final archive.');return
 previous=json.loads(OUT.read_text()) if OUT.exists() else {}
 polls=manual_polls();old=previous.get('polls',[]);reports=[]
 feeds=[('NYT Senate',NYT+'senate.csv','NYT','senate',read_nyt),('NYT House / generic',NYT+'house.csv','NYT','house',read_nyt),('VoteHub generic',VOTEHUB+'?poll_type=generic-ballot&subject=2026&from_date=2026-07-01','VoteHub','generic',read_votehub),('VoteHub Senate',VOTEHUB+'?poll_type=us-senator&from_date=2026-07-01','VoteHub','senate',read_votehub),('VoteHub House',VOTEHUB+'?poll_type=us-representative&from_date=2026-07-01','VoteHub','house',read_votehub)]
 for label,url,provider,chamber,reader in feeds:
  prior=[p for p in old if p.get('feed')==label];prev=next((s for s in previous.get('sources',[]) if s['name']==label),{})
  try:
   if args.offline:raise RuntimeError('Offline initialization')
   body=fetch(url);records,skipped=reader(body,chamber,today)
   # Fail closed on gross schema/data loss, while allowing records to age out.
   recent_prior=[p for p in prior if p['end']>=(now.date()-dt.timedelta(days=60)).isoformat()]
   if recent_prior and len(records)<len(recent_prior)*.4:raise ValueError('Unexpected source record loss')
   for p in records:p['feed']=label
   polls+=records
   reports.append(dict(name=label,url=url,status='ok',lastAttempt=stamp,lastSuccess=stamp,latestFieldEnd=max(p['end'] for p in records),count=len(records),skipped=skipped,bodyHash=hashlib.sha256(body.encode()).hexdigest()))
  except Exception as e:
   polls+=prior
   reports.append(dict(name=label,url=url,status='error',lastAttempt=stamp,lastSuccess=prev.get('lastSuccess'),latestFieldEnd=prev.get('latestFieldEnd'),count=len(prior),error=type(e).__name__+': '+str(e)[:160]))
 # A successful feed that removes a recent question cannot be silently replaced
 # by its older transcription in another feed. Expose a review state instead.
 active_feeds={r['name'] for r in reports if r['status']=='ok'}
 current_ids={p['id'] for p in polls}
 removed=set(tuple(w) for w in previous.get('withdrawnWaves',[])) | {wave_key(p) for p in old if p['provider']=='NYT' and p.get('feed') in active_feeds and p['id'] not in current_ids and p['end']>=(now.date()-dt.timedelta(days=60)).isoformat()}
 removed-={wave_key(p) for p in polls if p['provider']=='NYT' and p.get('feed') in active_feeds}
 for p in polls:
  if wave_key(p) in removed and p['provider']!='NYT':p['eligible']=False;p['reason']='Matching provider observation removed; review required'
 polls=deduplicate(polls)
 for p in polls:validate_poll(p,today)
 reference,anchor=national_anchor(polls,today,previous.get('referenceEnvironment',6.976744186))
 pool=[p for p in polls if p['chamber']=='senate' and p['eligible'] and (now.date()-dt.date.fromisoformat(p['end'])).days<=60]
 candidates=unambiguous_latest(pool,lambda p:(p['raceId'],canonical(p['firm'])))
 active={}
 for p in sorted(candidates,key=lambda p:(p['end'],p['primaryVerified'],p['population']=='LV',p['published'],p['sample'],p['id']),reverse=True):active.setdefault(p['raceId'],p['id'])
 payload=dict(schemaVersion=1,modelVersion='1.1',withdrawnWaves=sorted(removed,key=str),referenceEnvironment=reference,anchorPollIds=anchor,senatePollIds=active,polls=polls)
 revision=hashlib.sha256(json.dumps(payload,sort_keys=True,separators=(',',':')).encode()).hexdigest()[:16]
 bundle=dict(**payload,revision=revision,checkedAt=stamp,changedAt=stamp if revision!=previous.get('revision') else previous['changedAt'],latestFieldEnd=max(p['end'] for p in polls),sources=reports,refreshEndsAt=CUTOFF,attribution=[dict(name='VoteHub',url='https://votehub.com/polls/api/',license='CC BY 4.0',changes='Filtered and normalized factual observations; original source links retained.'),dict(name='The New York Times polling database',url='https://www.nytimes.com/interactive/polls/congressional-vote-2026.html',license='CC BY 4.0',changes='Selected 2026 observations, filters and D/R normalization; no publisher model or ratings used.')])
 OUT.parent.mkdir(parents=True,exist_ok=True)
 temp=OUT.with_suffix('.tmp');temp.write_text(json.dumps(bundle,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n');os.replace(temp,OUT)
 editions=OUT.parent/'editions';editions.mkdir(exist_ok=True)
 edition=editions/(revision+'.json')
 if not edition.exists():edition.write_text(json.dumps(bundle,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n')
 print(json.dumps(dict(revision=revision,polls=len(polls),nationalAnchor=reference,anchorPolls=len(anchor),senateRaces=len(active),feeds=[dict(name=s['name'],status=s['status'],count=s['count']) for s in reports]),indent=2))
 # Publish health metadata even on partial failure; the workflow flags a failure afterwards.
 if not args.offline and any(s['status']=='error' for s in reports):sys.exit(2)
if __name__=='__main__':main()
