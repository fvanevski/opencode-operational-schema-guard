"""Trusted immutable transition source + same-transaction queue binding."""
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from test_gate import gate,config
from test_shared_work import candidate
from shared_work import SharedWorkQueue,work_key,source_key
from git_source_authority import GitFactResolver
from graphiti_terminal import UnverifiedSource

CONTRACT={"group_id":"issue70_temporal","subject":"Service","predicate":"USES_QUEUE",
          "transition":{"from":"Redis","to":"NATS","effective_at":"2026-10-30T00:00:00Z"}}

def git(root,*args):
    return subprocess.check_output(["git","-C",str(root),*args],
        stderr=subprocess.DEVNULL).decode().strip()

class TemporalSourceTests(unittest.TestCase):
    def setUp(self):
        temp=tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root=Path(temp.name)
        self.repo=self.root/"repo";self.repo.mkdir()
        git(self.repo,"init","-q")
        git(self.repo,"config","user.name","Synthetic")
        git(self.repo,"config","user.email","fixture@example.invalid")
        path=self.repo/"memory-facts"/"decision.json";path.parent.mkdir()
        self.record={"schema_version":1,"workspace_id":"/work",
            "group_id":"issue70_temporal","category":"exclusive_state_transition",
            "episode_body":"As of 2026-10-30 Service migrated queue from Redis to NATS.",
            "reference_time":"2026-10-30T00:00:00Z",
            "transition_contract":CONTRACT}
        self.path=path
        self.recommit()
        self.policy={"enabled":True,"source_type":"git-record-v1","revision":"temporal-v1",
            "repository":str(self.repo),"trusted_ref":git(self.repo,"symbolic-ref","HEAD"),
            "source_prefix":"memory-facts","workspaces":["/work"],
            "groups":["issue70_temporal"],"categories":["exclusive_state_transition"]}
        self.item=candidate("exclusive")
        self.item["category"]="exclusive_state_transition"
        self.item["scope"]["group_id"]="issue70_temporal"
        self.item["transition"]={"subject_ref":"Service","predicate":"USES_QUEUE",
            "outgoing_state_ref":"Redis","incoming_state_ref":"NATS",
            "effective_at":"2026-10-30T00:00:00Z"}
        self.item["fact_ref"]=self.ref
        self.db=gate.QueueDB(str(self.root/"gate.sqlite3"))
        self.work=SharedWorkQueue(self.db)
        self.resolver=GitFactResolver(policy=self.policy,
            work_key_fn=work_key,source_key_fn=source_key)

    def recommit(self):
        self.path.write_text(json.dumps(self.record))
        git(self.repo,"add","memory-facts/decision.json")
        git(self.repo,"commit","-qm","record source")
        commit=git(self.repo,"rev-parse","HEAD")
        self.ref="git:"+commit+":memory-facts/decision.json"

    def test_source_bound_before_work_can_be_claimed(self):
        first=self.work.enqueue(self.item)
        self.assertEqual(first["status"],"deferred_unverified")
        totals=self.work.auto_admit(self.resolver)
        self.assertEqual(totals["admitted"],1)
        self.assertEqual(self.work.ready()["work_key"],work_key(self.item))
        with self.db.connect() as c:
            row=c.execute("SELECT * FROM temporal_transition_contracts").fetchone()
            self.assertEqual(json.loads(row["contract_json"]),CONTRACT)
            self.assertEqual(row["work_key"],work_key(self.item))

    def test_candidate_lookalike_transition_cannot_override_source(self):
        self.item["transition"]["incoming_state_ref"]="Kafka"
        self.work.enqueue(self.item)
        counts=self.work.auto_admit(self.resolver)
        self.assertEqual(counts["admitted"],0)
        self.assertIsNone(self.work.ready())
        with self.db.connect() as c:
            table=c.execute("""SELECT 1 FROM sqlite_master
                WHERE type='table' AND name='temporal_transition_contracts'""").fetchone()
            self.assertIsNone(table)

    def test_source_without_verified_contract_stays_deferred(self):
        del self.record["transition_contract"]
        self.recommit()
        self.item["fact_ref"]=self.ref
        self.work.enqueue(self.item)
        self.assertEqual(self.work.auto_admit(self.resolver)["admitted"],0)
        self.assertIsNone(self.work.ready())

if __name__=="__main__":unittest.main()
