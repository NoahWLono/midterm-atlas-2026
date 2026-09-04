import unittest, importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('pipeline',Path(__file__).parents[1]/'scripts/refresh-polls.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)

class PollPipelineTests(unittest.TestCase):
 def test_verified_aliases_do_not_admit_defeated_or_ambiguous_candidates(self):
  self.assertTrue(p.matches('Ben Ray Lujan','NM','democratic'))
  self.assertTrue(p.matches('N’Kiyla Thomas','OK','democratic'))
  self.assertFalse(p.matches('Jim Priest','OK','democratic'))
  self.assertFalse(p.matches('Graham','SC','republican'))
  self.assertFalse(p.matches('Lindsey Graham','SC','republican'))
  self.assertNotIn('AK',p.PAIRS);self.assertNotIn('MT',p.PAIRS)
 def test_same_day_different_firms_are_not_ambiguous_question_variants(self):
  rows=[dict(id=str(i),raceId='MI-SEN',firm=firm,end='2026-09-01',sample=1000,population='LV',dem=d,rep=r) for i,(firm,d,r) in enumerate([('A',48,46),('B',47,47)])]
  self.assertEqual(len(p.unambiguous_latest(rows,lambda x:(x['raceId'],p.canonical(x['firm'])))),2)
 def test_rounded_originals_do_not_create_false_source_conflicts(self):
  row=dict(id='original',provider='Original releases',chamber='senate',state='TX',firm='Example',start='2026-08-01',end='2026-08-04',population='LV',dem=45,rep=50,demName='James Talarico',repName='Ken Paxton',eligible=True,primaryVerified=True,sample=1000,published='2026-08-05')
  peer=dict(row,id='nyt',provider='NYT',primaryVerified=False,dem=45.05,rep=49.47)
  self.assertTrue(all(x['eligible'] for x in p.deduplicate([row,peer])))
  peer['rep']=48
  self.assertTrue(all(not x['eligible'] for x in p.deduplicate([row,peer])))
 def test_party_labels_not_answer_order(self):
  rows=[dict(party='REP',pct='51',candidate_name='R person'),dict(party='DEM',pct='45',candidate_name='D person')]
  self.assertEqual(p.party_pair(rows),(45.,51.,'D person','R person'))
 def test_ambiguous_party_is_rejected(self):
  rows=[dict(party='DEM',pct='40',candidate_name='A'),dict(party='DEM',pct='30',candidate_name='B'),dict(party='REP',pct='20',candidate_name='C')]
  self.assertIsNone(p.party_pair(rows))
 def test_bad_shares_rejected(self):
  with self.assertRaises(ValueError):p.validate_poll(dict(id='x',start='2026-09-01',end='2026-09-01',sample=500,population='LV',dem=70,rep=60,source='https://example.org'), '2026-09-04')
 def test_future_dates_rejected(self):
  with self.assertRaises(ValueError):p.validate_poll(dict(id='x',start='2026-10-01',end='2026-10-01',sample=500,population='LV',dem=40,rep=40,source='https://example.org'), '2026-09-04')
 def test_script_urls_rejected(self):
  with self.assertRaises(ValueError):p.validate_poll(dict(id='x',start='2026-09-01',end='2026-09-01',sample=500,population='LV',dem=40,rep=40,source='javascript:alert(1)'), '2026-09-04')
 def test_anchor_excludes_partisan_and_adults(self):
  rows=[dict(id='a',firm='A',end='2026-09-01',sample=1000,population='LV',dem=48,rep=48,eligible=True,partisan=False,chamber='generic'),dict(id='b',firm='B',end='2026-09-01',sample=1000,population='A',dem=80,rep=10,eligible=False,partisan=False,chamber='generic')]
  a,ids=p.national_anchor(rows,'2026-09-04',7)
  self.assertEqual(a,0);self.assertEqual(ids,['a'])
 def test_latest_wave_and_population_priority(self):
  rows=[dict(id='a',firm='A',end='2026-09-01',sample=1000,population='RV',dem=45,rep=50,eligible=True,partisan=False,chamber='generic'),dict(id='b',firm='A',end='2026-09-01',sample=800,population='LV',dem=50,rep=45,eligible=True,partisan=False,chamber='generic')]
  _,ids=p.national_anchor(rows,'2026-09-04',7)
  self.assertEqual(ids,['b'])
 def test_all_answer_values_must_be_finite(self):
  with self.assertRaises(ValueError):p.validate_poll(dict(id='x',start='2026-09-01',end='2026-09-01',sample=500,population='LV',dem=None,rep=None,source='https://example.org',answers=[dict(name='Unknown',pct=float('nan'))]),'2026-09-04')
 def test_nyt_house_identity_normalization(self):
  self.assertEqual(p.district_id('CA','Forty-eighth Congressional District'),('CA','CA-48'))
  self.assertEqual(p.district_id('CA-48',None),('CA','CA-48'))
 def test_multiple_question_variants_do_not_get_arbitrarily_selected(self):
  rows=[dict(id='a',firm='A',end='2026-09-01',sample=1000,population='RV',dem=45,rep=50,eligible=True,partisan=False,chamber='generic'),dict(id='b',firm='A',end='2026-09-01',sample=1000,population='RV',dem=49,rep=45,eligible=True,partisan=False,chamber='generic')]
  anchor,ids=p.national_anchor(rows,'2026-09-04',7)
  self.assertEqual(ids,[]);self.assertEqual(anchor,7)
 def test_production_failure_path_preserves_last_success_and_records(self):
  import tempfile,json,sys,io,contextlib
  from datetime import datetime,timezone
  class FrozenDateTime(datetime):
   @classmethod
   def now(cls,tz=None):return cls(2026,9,4,12,tzinfo=timezone.utc)
  from unittest.mock import patch
  with tempfile.TemporaryDirectory() as temp:
   out=Path(temp)/'live-polls.json'
   old=p.manual_polls()[4].copy();old.update(id='retained-source-row',provider='VoteHub',feed='VoteHub Senate',firm='Preservation Test Firm')
   out.write_text(json.dumps(dict(polls=[old],sources=[dict(name='VoteHub Senate',lastSuccess='2026-09-03T00:00:00Z',latestFieldEnd=old['end'])],referenceEnvironment=7)))
   with patch.object(p,'OUT',out),patch.object(p,'fetch',side_effect=RuntimeError('test outage')),patch.object(sys,'argv',['refresh-polls.py']),patch.object(p.dt,'datetime',FrozenDateTime),contextlib.redirect_stdout(io.StringIO()):
    with self.assertRaises(SystemExit) as raised:p.main()
   self.assertEqual(raised.exception.code,2)
   data=json.loads(out.read_text());self.assertTrue(any(x['id']=='retained-source-row' for x in data['polls']))
   health=next(x for x in data['sources'] if x['name']=='VoteHub Senate')
   self.assertEqual(health['lastSuccess'],'2026-09-03T00:00:00Z');self.assertEqual(health['status'],'error')
if __name__=='__main__':unittest.main()
