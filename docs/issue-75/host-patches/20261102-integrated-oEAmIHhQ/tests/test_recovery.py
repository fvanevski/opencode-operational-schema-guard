import unittest, tempfile, sys, sqlite3, pathlib
sys.path.insert(0,str(pathlib.Path(__file__).parents[1]/"host-candidate/gate"))
import openviking_commit_gate as gate
class DefaultClosed(unittest.TestCase):
 def test_new_database_cannot_claim_without_explicit_owner_release(self):
  with tempfile.TemporaryDirectory() as d:
   db=gate.QueueDB(d+"/queue.sqlite3")
   db.enqueue({"account":"tenant","user_id":"user","actor_peer":"peer"},"session",0,{},"test")
   with db.connect() as c: row=c.execute("SELECT * FROM intents").fetchone()
   self.assertIsNone(db.claim(row),"default-closed hold must deny claim inside transaction")


import json, os, subprocess, threading, time
from contextlib import closing
from unittest import mock
import admission_hold as hold
OWNER="disposable-owner-0001"
PROOF="1"*64

def read_rows(path, table):
 with closing(sqlite3.connect(path)) as c:
  c.row_factory=sqlite3.Row
  return [dict(r) for r in c.execute("SELECT * FROM "+table+" ORDER BY rowid")]

def fixture(root):
 db=gate.QueueDB(str(pathlib.Path(root)/"queue.sqlite3"))
 hold.set_hold(db.path,OWNER,0,True,"test ownership")
 hold.set_hold(db.path,OWNER,1,False,"explicit test release")
 scope={"account":"", "user_id":"", "actor_peer":"peer"}
 for _ in range(2): db.enqueue(scope,"original",10,{"keep_recent_count":10},"test")
 row=db.claim(db.next_ready())
 with db.connect() as c: c.execute("UPDATE commit_attempts SET submitted=1")
 db.mark_unknown(row)
 for i,gen in enumerate((3,1,4)):
  for _ in range(gen): db.enqueue({"account":"tenant","user_id":"user","actor_peer":"other"},"pending-"+str(i),0,{},"unrelated")
 with db.connect() as c:
  c.execute("INSERT INTO failed_tasks(task_id,account,user_id,actor_peer,session_id,generation,failed_at) VALUES('old-task','t','u','p','failed',1,1)")
 hold.set_hold(db.path,OWNER,2,True,"recovery hold")
 return db,read_rows(db.path,"intents")[0],read_rows(db.path,"commit_attempts")[0]

class Repair(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
  self.db,self.i,self.a=fixture(self.tmp.name)
  self.before={t:read_rows(self.db.path,t) for t in ('intents','commit_attempts','failed_tasks')}
 def repair(self,i=None,a=None):
  return hold.repair_rejected(self.db.path,self.i if i is None else i,self.a if a is None else a,owner=OWNER,evidence_digest=PROOF)
 def assert_unchanged(self):
  for t,rows in self.before.items(): self.assertEqual(read_rows(self.db.path,t),rows)
  self.assertEqual(read_rows(self.db.path,'rejection_repairs'),[])
 def test_atomic_honest_rejection_and_idempotence(self):
  self.assertEqual(self.repair(),'rejected')
  rows=read_rows(self.db.path,'intents'); original=rows[0]
  self.assertEqual(original['state'],'dead');self.assertEqual(original['requested_generation'],2);self.assertEqual(original['processed_generation'],0)
  self.assertEqual(original['claimed_generation'],2);self.assertIsNone(original['task_id'])
  for k in set(self.i)-{'state','last_error'}: self.assertEqual(original[k],self.i[k],k)
  self.assertEqual(rows[1:],self.before['intents'][1:])
  after=read_rows(self.db.path,'commit_attempts')[0]
  for k in set(self.a)-{'resolved'}:self.assertEqual(after[k],self.a[k],k)
  self.assertEqual(after['resolved'],1);self.assertEqual(read_rows(self.db.path,'failed_tasks'),self.before['failed_tasks'])
  self.assertEqual(self.repair(),'already_rejected');self.assertEqual(len(read_rows(self.db.path,'rejection_repairs')),1)
  self.assertEqual(read_rows(self.db.path,'recovery_hold')[0]['held'],1)
 def test_every_intent_and_attempt_preimage_column_is_guarded(self):
  for which,record in [('intent',self.i),('attempt',self.a)]:
   for column,value in record.items():
    stale=dict(record);stale[column]=value+1 if isinstance(value,(int,float)) else '__stale__'
    with self.subTest(which=which,column=column):
     with self.assertRaises(hold.Held):self.repair(i=stale) if which=='intent' else self.repair(a=stale)
     self.assert_unchanged()
 def test_concurrent_durable_row_drift_rejected(self):
  with self.db.connect() as c:c.execute("UPDATE intents SET last_requested_at=last_requested_at+1 WHERE session_id='original'")
  before=read_rows(self.db.path,'intents')
  with self.assertRaises(hold.Held):self.repair()
  self.assertEqual(read_rows(self.db.path,'intents'),before);self.assertEqual(read_rows(self.db.path,'rejection_repairs'),[])
 def test_wrong_owner_cannot_repair_or_release(self):
  with self.assertRaises(hold.Held): hold.repair_rejected(self.db.path,self.i,self.a,owner='different-owner-000',evidence_digest=PROOF)
  with self.assertRaises(hold.Held): hold.set_hold(self.db.path,'different-owner-000',3,False,'bad release')
  with self.assertRaises(hold.Held): hold.set_hold(self.db.path,OWNER,2,False,'stale revision')
  self.assert_unchanged()
 def test_database_owner_permissions_fail_closed(self):
  os.chmod(self.db.path,0o644)
  with self.assertRaises(PermissionError):self.repair()
  os.chmod(self.db.path,0o600);self.assert_unchanged()
 def test_crash_before_commit_rolls_back_both_updates_and_audit(self):
  inp=pathlib.Path(self.tmp.name)/'input.json';inp.write_text(json.dumps([self.i,self.a]))
  code="""import sys,json,sqlite3,os,signal
import admission_hold as h
original=sqlite3.connect
def connect(*a,**kw):
 c=original(*a,**kw)
 c.set_trace_callback(lambda sql: os.kill(os.getpid(),signal.SIGKILL) if sql.startswith('INSERT INTO rejection_repairs') else None)
 return c
h.sqlite3.connect=connect
i,a=json.load(open(sys.argv[2]));h.repair_rejected(sys.argv[1],i,a,owner='disposable-owner-0001',evidence_digest='1'*64)
"""
  r=subprocess.run([sys.executable,'-B','-c',code,self.db.path,str(inp)],env=dict(os.environ,PYTHONPATH=str(pathlib.Path(hold.__file__).parent),PYTHONDONTWRITEBYTECODE='1'))
  self.assertEqual(r.returncode,-9);self.assert_unchanged()
  with closing(sqlite3.connect(self.db.path)) as c:self.assertEqual(c.execute('PRAGMA integrity_check').fetchone()[0],'ok')
 def test_two_contenders_one_audit(self):
  inp=pathlib.Path(self.tmp.name)/'input.json';inp.write_text(json.dumps([self.i,self.a]))
  code="""import sys,json
import admission_hold as h
i,a=json.load(open(sys.argv[2]))
try:print(h.repair_rejected(sys.argv[1],i,a,owner='disposable-owner-0001',evidence_digest='1'*64))
except h.Held:print('held')
"""
  args=[sys.executable,'-B','-c',code,self.db.path,str(inp)];env=dict(os.environ,PYTHONPATH=str(pathlib.Path(hold.__file__).parent),PYTHONDONTWRITEBYTECODE='1')
  ps=[subprocess.Popen(args,env=env,stdout=subprocess.PIPE,text=True) for _ in range(2)];results=[x.communicate(timeout=10)[0].strip() for x in ps]
  self.assertEqual(results.count('rejected'),1);self.assertTrue(set(results)<= {'rejected','already_rejected','held'})
  self.assertEqual(len(read_rows(self.db.path,'rejection_repairs')),1)
 def test_restart_hold_no_worker_side_effects(self):
  from dataclasses import replace
  # Existing source Config constructor, no server or local inference.
  sys.path.insert(0,str(pathlib.Path(gate.__file__).parent/'tests'))
  from test_gate import config
  cfg=replace(config(self.tmp.name),database=self.db.path,drain_enabled=True,receipts_enabled=True)
  worker=gate.Worker(cfg,gate.QueueDB(self.db.path),threading.Event())
  with mock.patch.object(worker,'_receipt_observation',side_effect=AssertionError('reconcile called')),mock.patch.object(worker,'_metrics',side_effect=AssertionError('metrics called')):
   self.assertFalse(worker.tick())
  for name in ('_process','_process_receipted'):
   with mock.patch.object(gate,'json_request',side_effect=AssertionError('network called')):getattr(worker,name)(self.i)
  self.assert_unchanged()
 def test_hold_fences_claim_and_sql_submission(self):
  with self.db.connect() as c:pending=c.execute("SELECT * FROM intents WHERE state='pending' LIMIT 1").fetchone()
  self.assertIsNone(self.db.claim(pending))
  with self.assertRaises(sqlite3.IntegrityError):
   with self.db.connect() as c:c.execute("UPDATE intents SET state='inflight' WHERE state='pending'")
  self.assert_unchanged()
 def test_publication_and_hold_transition_serialize(self):
  hold.set_hold(self.db.path,OWNER,3,False,'explicit test release')
  with hold.publication(self.db.path):
   with self.assertRaises(hold.Held):hold.set_hold(self.db.path,OWNER,4,True,'must wait for publication')
  hold.set_hold(self.db.path,OWNER,4,True,'owner reacquired')
  with self.assertRaises(hold.Held):
   with hold.publication(self.db.path):self.fail('held publication admitted')
  # A restart does not expire or release a hold.
  gate.QueueDB(self.db.path);self.assertEqual(read_rows(self.db.path,'recovery_hold')[0]['held'],1)
class PreclaimBinding(unittest.TestCase):
 def test_stale_backend_binding_leaves_no_claim_or_attempt(self):
  from dataclasses import replace
  sys.path.insert(0,str(pathlib.Path(gate.__file__).parent/'tests'))
  from test_gate import config
  with tempfile.TemporaryDirectory() as d:
   db=gate.QueueDB(d+'/queue.sqlite3')
   hold.set_hold(db.path,OWNER,0,True,'fixture owner');hold.set_hold(db.path,OWNER,1,False,'explicit release')
   db.enqueue({'account':'a','user_id':'u','actor_peer':'p'},'s',0,{},'new')
   worker=gate.Worker(replace(config(d),database=db.path,drain_enabled=True,receipts_enabled=True),db,threading.Event())
   with mock.patch.object(worker,'_active_harness_processes',return_value=[]),mock.patch.object(worker,'_metrics',return_value=(0,0)),mock.patch.object(worker,'_process'),mock.patch.object(gate,'json_request',return_value=(403,{})):
    worker.tick();worker.tick()
   self.assertEqual(read_rows(db.path,'commit_attempts'),[],'stale authenticated binding must reject before claim')
   self.assertEqual(read_rows(db.path,'intents')[0]['state'],'pending')
if __name__=='__main__':unittest.main()
