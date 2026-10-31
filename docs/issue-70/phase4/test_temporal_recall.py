"""Real SQLite receipt/outcome joins; graph query itself is not needed."""
import json,sqlite3,tempfile,unittest
from pathlib import Path
from graphiti_recall_service import receipt_sources,format_rows

class TemporalRecallTests(unittest.TestCase):
    def setUp(self):
        t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup)
        self.path=str(Path(t.name)/"gate.sqlite3")
        self.ref="git:"+"a"*40+":memory-facts/state.json"
        self.ep="ep-1"
        self.pin="a"*64
        with sqlite3.connect(self.path) as c:
            c.execute("CREATE TABLE graphiti_ingest_receipts (work_key TEXT,episode_uuid TEXT,group_id TEXT,state TEXT)")
            c.execute("CREATE TABLE memory_work (work_key TEXT,candidate_json TEXT,status TEXT)")
            c.execute("CREATE TABLE memory_source_attestations (work_key TEXT,source_authority TEXT)")
            c.execute("""CREATE TABLE temporal_validation_results (work_key TEXT,
                episode_uuid TEXT,state TEXT,exit_code INTEGER,validator_sha256 TEXT)""")
            c.execute("""CREATE TABLE temporal_validator_active (singleton INTEGER,
                validator_sha256 TEXT)""")
            c.execute("INSERT INTO temporal_validator_active VALUES (1,?)",(self.pin,))
            c.execute("INSERT INTO graphiti_ingest_receipts VALUES ('k','ep-1','issue70_test','completed')")
            c.execute("INSERT INTO memory_work VALUES (?,?,?)",("k",json.dumps({
                "fact_ref":self.ref,"category":"exclusive_state_transition",
                "scope":{"group_id":"issue70_test"}}),"completed"))
            c.execute("INSERT INTO memory_source_attestations VALUES ('k','git-record-v1:v1')")
            c.execute("INSERT INTO temporal_validation_results VALUES ('k','ep-1','done',0,?)",
                      (self.pin,))
    def read(self):
        return receipt_sources(self.path,"issue70_test",[self.ep])

    def test_pass_labeled_from_persisted_result(self):
        self.assertEqual(self.read()[self.ep]["validation_status"],"PASS")
        rows=[{"fact":"Service uses NATS","episode_ids":[self.ep]}]
        f=format_rows(rows,self.read(),"issue70_test")
        self.assertEqual(f[0]["validation_status"],"PASS")

    def test_all_other_validator_exits_mapped_distinctly(self):
        for code,expected in ((1,"INCONSISTENT"),(2,"INCOMPLETE"),(3,"INVALID_INPUT")):
            with sqlite3.connect(self.path) as c:
                c.execute("UPDATE temporal_validation_results SET exit_code=?",(code,))
            self.assertEqual(self.read()[self.ep]["validation_status"],expected)

    def test_no_verified_outcome_does_not_assert_pass(self):
        with sqlite3.connect(self.path) as c:
            c.execute("DELETE FROM temporal_validation_results")
        self.assertEqual(self.read()[self.ep]["validation_status"],"UNVERIFIED")
        self.assertEqual(receipt_sources(self.path,"wrong-group",[self.ep]),{})

    def test_changed_validator_or_legacy_outcome_never_stays_pass(self):
        with sqlite3.connect(self.path) as c:
            c.execute("UPDATE temporal_validator_active SET validator_sha256=?",("b"*64,))
        self.assertEqual(self.read()[self.ep]["validation_status"],"UNVERIFIED")
        with sqlite3.connect(self.path) as c:
            c.execute("UPDATE temporal_validator_active SET validator_sha256=?",(self.pin,))
            c.execute("UPDATE temporal_validation_results SET validator_sha256=NULL")
        self.assertEqual(self.read()[self.ep]["validation_status"],"UNVERIFIED")

    def test_invalid_attestation_blocks_recall(self):
        with sqlite3.connect(self.path) as c:
            c.execute("UPDATE memory_source_attestations SET source_authority='agent_candidate'")
        self.assertEqual(self.read(),{})

if __name__=="__main__":unittest.main()
