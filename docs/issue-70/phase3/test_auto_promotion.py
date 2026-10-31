"""End-to-end CPU-only nomination -> Git authority -> gate -> terminal receipt."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib,json,subprocess,sys,tempfile,threading,unittest
from dataclasses import replace
ROOT=Path(__file__).resolve().parent.parent
GATE=ROOT/"implementation"/"i1-integrated"/"candidate"/"gate"
sys.path.insert(0,str(GATE/"tests"))
sys.path.insert(0,str(GATE))
sys.path.insert(0,str(ROOT/"phase2"))
from test_gate import gate,config
from test_shared_work import candidate
from shared_work import SharedWorkQueue,normalized_candidate,source_key,work_key
from git_source_authority import GitFactResolver

def cmd(repo,*args):
    return subprocess.check_output(["git","-C",str(repo),*args],stderr=subprocess.DEVNULL).decode().strip()

class SyntheticDirectCore:
    def __init__(self):self.submissions=0
    def submit(self,candidate):
        self.submissions+=1
        return work_key(candidate)
    def poll(self,identity):
        return {"status":"completed","backend_identity":identity,"persisted":True}

class AutoPromotionTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.repo=Path(self.tmp.name)/"repo";self.repo.mkdir()
        cmd(self.repo,"init","-q")
        cmd(self.repo,"config","user.name","Synthetic")
        cmd(self.repo,"config","user.email","synthetic@example.invalid")
        self.fact=self.repo/"memory-facts"/"decision.json";self.fact.parent.mkdir()
        self.fact.write_text(json.dumps({"schema_version":1,"workspace_id":"/work",
            "group_id":"approved","category":"verified_architecture_fact",
            "episode_body":"The verified repository uses a durable coordinator.",
            "reference_time":"2026-10-30T00:00:00Z"}))
        cmd(self.repo,"add","memory-facts/decision.json")
        cmd(self.repo,"commit","-qm","approved record")
        commit=cmd(self.repo,"rev-parse","HEAD")
        branch=cmd(self.repo,"symbolic-ref","HEAD")
        self.item=candidate("git-auto")
        self.item["fact_ref"]="git:"+commit+":memory-facts/decision.json"
        self.policy={"enabled":True,"source_type":"git-record-v1","revision":"v1",
            "repository":str(self.repo),"trusted_ref":branch,"source_prefix":"memory-facts",
            "workspaces":["/work"],"groups":["approved"],"categories":["verified_architecture_fact"]}
        self.resolver=GitFactResolver(policy=self.policy,work_key_fn=work_key,source_key_fn=source_key)
        self.cfg=replace(config(self.tmp.name),drain_enabled=True,graphiti_enabled=True,
                         process_names=(),task_poll_seconds=0,quiet_grace_seconds=0)
        self.db=gate.QueueDB(self.cfg.database)
        self.shared=SharedWorkQueue(self.db)
        self.adapter=SyntheticDirectCore()

    def worker(self):
        w=gate.Worker(self.cfg,self.db,threading.Event(),self.adapter,self.resolver)
        w._metrics=lambda:(0,0);w._active_harness_processes=lambda:[]
        return w

    def test_no_per_event_approval_and_durable_completion(self):
        nominated=self.shared.enqueue(self.item)
        self.assertEqual(nominated["status"],"deferred_unverified")
        worker=self.worker()
        self.assertFalse(worker.tick())
        self.assertEqual(self.shared.status()[0]["status"],"queued")
        self.assertTrue(worker.tick())
        self.assertEqual(self.shared.status()[0]["status"],"completed")
        self.assertEqual(self.adapter.submissions,1)
        self.assertFalse(worker.tick())
        self.assertEqual(self.adapter.submissions,1)
        with self.db.connect() as conn:
            att=conn.execute("SELECT * FROM memory_source_attestations").fetchone()
            self.assertEqual(att["source_authority"],"git-record-v1:v1")

    def test_disabled_git_authority_keeps_nomination_deferred(self):
        self.shared.enqueue(self.item)
        self.policy["enabled"]=False
        worker=self.worker()
        self.assertFalse(worker.tick())
        self.assertIsNone(self.shared.ready())
        self.assertEqual(self.adapter.submissions,0)

    def test_unreachable_or_tampered_claim_stays_deferred(self):
        item={**self.item,"fact_ref":"git:"+"f"*40+":memory-facts/decision.json"}
        self.shared.enqueue(item)
        self.assertFalse(self.worker().tick())
        self.assertIsNone(self.shared.ready())
        self.assertEqual(self.adapter.submissions,0)

    def test_rejected_old_nominations_do_not_starve_later_valid_source(self):
        for suffix in ("invalid-first","invalid-second"):
            item=candidate(suffix)
            item["fact_ref"]="git:"+"f"*40+":memory-facts/unreachable.json"
            self.shared.enqueue(item)
        self.shared.enqueue(self.item)
        first=self.shared.auto_admit(self.resolver,max_items=2)
        self.assertEqual(first["admitted"],0)
        self.assertEqual(first["deferred"],2)
        # Cursor must be durable when the worker/queue restarts.
        reopened=SharedWorkQueue(self.db)
        second=reopened.auto_admit(self.resolver,max_items=2)
        self.assertEqual(second["admitted"],1)
        self.assertEqual(reopened.ready()["work_key"],work_key(self.item))
        with self.db.connect() as conn:
            self.assertEqual(conn.execute("""SELECT COUNT(*) FROM memory_work
                WHERE status='deferred_unverified'""").fetchone()[0],2)

    def test_existing_gate_tick_processes_read_only_retry_on_empty_queue(self):
        seen=[]
        class Adapter:
            def retry_pending(self,*,max_items):
                seen.append(max_items)
                return 0
            def submit(self,_):
                raise AssertionError("no graph re-ingestion during validator retry")
        worker=gate.Worker(self.cfg,self.db,threading.Event(),Adapter(),self.resolver)
        worker._active_harness_processes=lambda:[]
        self.assertFalse(worker.tick())
        self.assertEqual(seen,[1])

    def test_disabled_worker_clears_active_validator_without_losing_history(self):
        from temporal_ledger import TemporalLedger
        TemporalLedger(self.db,validator_sha256="a"*64)
        with self.db.connect() as conn:
            self.assertIsNotNone(conn.execute("SELECT * FROM temporal_validator_active").fetchone())
        worker=gate.Worker(replace(self.cfg,graphiti_enabled=False),
                           self.db,threading.Event(),self.adapter,self.resolver)
        self.assertFalse(worker.cfg.graphiti_enabled)
        with self.db.connect() as conn:
            self.assertIsNone(conn.execute("SELECT * FROM temporal_validator_active").fetchone())

    def test_feature_disabled_has_no_auto_promotion(self):
        self.shared.enqueue(self.item)
        cfg=replace(self.cfg,graphiti_enabled=False)
        worker=gate.Worker(cfg,self.db,threading.Event(),
                           self.adapter,self.resolver)
        worker._metrics=lambda:(0,0)
        worker.tick()
        self.assertEqual(self.shared.status()[0]["status"],"deferred_unverified")
        self.assertEqual(self.adapter.submissions,0)

if __name__=="__main__":unittest.main()
