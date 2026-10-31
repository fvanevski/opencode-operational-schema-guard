"""CPU-only temporal outcome invariants without Graphiti or live database."""
import json,sqlite3,tempfile,unittest
from contextlib import contextmanager
from pathlib import Path
from temporal_ledger import TemporalLedger,TemporalCheckingAdapter,digest,EXIT_DISPOSITIONS

CONTRACT={"group_id":"issue70_test","subject":"Service","predicate":"USES",
          "transition":{"from":"Redis","to":"NATS","effective_at":"2026-10-30T00:00:00Z"}}
class DB:
    def __init__(self,path):self.path=path
    @contextmanager
    def connect(self):
        conn=sqlite3.connect(self.path);conn.row_factory=sqlite3.Row
        try:
            yield conn
            conn.commit()
        except BaseException:
            conn.rollback()
            raise
        finally:conn.close()

class Tests(unittest.TestCase):
    def setUp(self):
        t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup)
        self.db=DB(str(Path(t.name)/"queue.sqlite3"))
        with self.db.connect() as c:
            c.execute("""CREATE TABLE graphiti_ingest_receipts (
                work_key TEXT,episode_uuid TEXT,state TEXT,group_id TEXT)""")
            c.execute("""CREATE TABLE temporal_transition_contracts(
                work_key TEXT,group_id TEXT,contract_json TEXT,contract_digest TEXT)""")
            c.execute("""CREATE TABLE memory_work(
                work_key TEXT,candidate_json TEXT)""")
            c.execute("INSERT INTO graphiti_ingest_receipts VALUES (?,?,?,?)",
                      ("k","ep-1","completed","issue70_test"))
            c.execute("INSERT INTO temporal_transition_contracts VALUES (?,?,?,?)",
                      ("k","issue70_test",json.dumps(CONTRACT),digest(CONTRACT)))
            c.execute("INSERT INTO memory_work VALUES (?,?)",
                      ("k",json.dumps({"category":"exclusive_state_transition"})))
        self.ledger=TemporalLedger(self.db)

    def run_code(self,exit_code,disposition):
        count=[]
        def runner(c):
            count.append(c)
            return {"exit":exit_code,"disposition":disposition,"mode":"live",
                    "coverage":"complete","findings":[]}
        return runner,count

    def test_each_validator_exit_durable(self):
        for exit_code,disposition in (
            (0,"PASS"),(1,"TEMPORAL_CONFLICT"),(2,"INCOMPLETE_EVIDENCE"),(3,"INVALID_INPUT")):
            with self.subTest(exit_code=exit_code):
                with self.db.connect() as c:
                    c.execute("DELETE FROM temporal_validation_results")
                runner,calls=self.run_code(exit_code,disposition)
                self.assertEqual(self.ledger.evaluate("k",runner),EXIT_DISPOSITIONS[exit_code])
                self.assertEqual(self.ledger.status_for_episode("ep-1","issue70_test"),
                                 EXIT_DISPOSITIONS[exit_code])
                self.assertEqual(calls[0]["transition"]["episode_uuid"],"ep-1")
                self.ledger.evaluate("k",runner)
                self.assertEqual(len(calls),1)

    def test_all_detailed_dispositions_of_the_pinned_validator_are_durable(self):
        # The pinned validator's run_transition can return these exact
        # detailed dispositions; each must persist, not degrade to UNVERIFIED.
        for exit_code,disposition in (
            (1,"MISSING_STATE"),(1,"INCORRECT_BOUNDARY"),
            (2,"INCOMPLETE_EVIDENCE"),(1,"TEMPORAL_CONFLICT")):
            with self.subTest(disposition=disposition):
                with self.db.connect() as c:
                    c.execute("DELETE FROM temporal_validation_results")
                runner,calls=self.run_code(exit_code,disposition)
                self.assertEqual(self.ledger.evaluate("k",runner),EXIT_DISPOSITIONS[exit_code])
                with self.db.connect() as c:
                    row=c.execute("SELECT disposition,exit_code,state FROM temporal_validation_results").fetchone()
                self.assertEqual(row["disposition"],disposition)
                self.assertEqual(row["exit_code"],exit_code)
                self.assertEqual(row["state"],"done")

    def test_findings_projection_keeps_bounded_diagnostic_fields(self):
        def runner(_):
            return {"exit":1,"disposition":"MISSING_STATE","mode":"live",
                    "coverage":"complete",
                    "findings":[{"type":"MISSING_STATE","state":"NATS",
                                 "detail":"no outgoing current-state edge for 'NATS'",
                                 "edges":["edge-uuid-1","edge-uuid-2"]},
                               {"type":"TEMPORAL_CONFLICT",
                                 "detail":"overlap",
                                 "edges":["e3"]*20}]}
        with self.db.connect() as c:
            c.execute("DELETE FROM temporal_validation_results")
        self.assertEqual(self.ledger.evaluate("k",runner),"INCONSISTENT")
        with self.db.connect() as c:
            details=json.loads(c.execute(
                "SELECT details_json FROM temporal_validation_results").fetchone()[0])
        self.assertEqual(details["findings"][0]["type"],"MISSING_STATE")
        self.assertEqual(details["findings"][0]["edges"],["edge-uuid-1","edge-uuid-2"])
        self.assertEqual(len(details["findings"][1]["edges"]),8)

    def test_graph_persistence_not_erased_by_unavailable_validator(self):
        def broken(_):raise RuntimeError("validator unavailable")
        self.assertEqual(self.ledger.evaluate("k",broken),"UNVERIFIED")
        with self.db.connect() as c:
            self.assertEqual(c.execute("SELECT state FROM graphiti_ingest_receipts").fetchone()[0],"completed")
        self.assertEqual(self.ledger.status_for_episode("ep-1","issue70_test"),"UNVERIFIED")

    def test_restart_retries_read_only_not_ingestion(self):
        with self.db.connect() as c:
            c.execute("""INSERT INTO temporal_validation_results(
                work_key,episode_uuid,contract_digest,state,attempts,updated_at)
                VALUES (?,?,?,'running',1,1)""",("k","ep-1",digest(CONTRACT)))
        runner,calls=self.run_code(0,"PASS")
        self.assertEqual(self.ledger.evaluate("k",runner),"PASS")
        self.assertEqual(len(calls),1)

    def test_mismatched_contract_or_episode_fails_closed(self):
        with self.db.connect() as c:
            c.execute("UPDATE temporal_transition_contracts SET contract_digest='wrong'")
        with self.assertRaises(ValueError):self.ledger.bind_completed("k")

    def test_adapter_completed_episode_reconciles_with_unverified_validation(self):
        class Core:
            def poll(self,key):
                return {"status":"completed","persisted":True,"backend_identity":key}
        adapter=TemporalCheckingAdapter(Core(),self.db,lambda _:{"exit":1,
            "disposition":"TEMPORAL_CONFLICT","mode":"live","findings":[]})
        self.assertEqual(adapter.poll("k")["status"],"completed")
        self.assertEqual(self.ledger.status_for_episode("ep-1","issue70_test"),"INCONSISTENT")

    def test_no_contract_cannot_release_exclusive_ingest(self):
        with self.db.connect() as c:
            c.execute("DELETE FROM temporal_transition_contracts")
        class Core:
            def poll(self,key):return {"status":"completed","persisted":True,
                                       "backend_identity":key}
        adapter=TemporalCheckingAdapter(Core(),self.db,lambda _:None)
        self.assertEqual(adapter.poll("k")["status"],"blocked_reconcile")

if __name__=="__main__":unittest.main()
