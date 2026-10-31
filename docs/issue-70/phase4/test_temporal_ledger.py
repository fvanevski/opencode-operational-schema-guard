"""CPU-only temporal outcome invariants without Graphiti or live database."""
import json,sqlite3,tempfile,unittest
from contextlib import contextmanager
from pathlib import Path
from temporal_ledger import (
    TemporalLedger,TemporalCheckingAdapter,select_active_validator,digest,EXIT_DISPOSITIONS)

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
        self.pin="a"*64
        with self.db.connect() as c:
            c.execute("""CREATE TABLE graphiti_ingest_receipts (
                work_key TEXT,episode_uuid TEXT,state TEXT,group_id TEXT)""")
            c.execute("""CREATE TABLE temporal_transition_contracts(
                work_key TEXT,group_id TEXT,contract_json TEXT,contract_digest TEXT)""")
            c.execute("""CREATE TABLE memory_work(
                work_key TEXT,candidate_json TEXT,status TEXT)""")
            c.execute("INSERT INTO graphiti_ingest_receipts VALUES (?,?,?,?)",
                      ("k","ep-1","completed","issue70_test"))
            c.execute("INSERT INTO temporal_transition_contracts VALUES (?,?,?,?)",
                      ("k","issue70_test",json.dumps(CONTRACT),digest(CONTRACT)))
            c.execute("INSERT INTO memory_work VALUES (?,?,?)",
                      ("k",json.dumps({"category":"exclusive_state_transition"}),"completed"))
        select_active_validator(self.db,self.pin)
        self.ledger=TemporalLedger(self.db,validator_sha256=self.pin)

    def run_code(self,exit_code,disposition):
        count=[]
        def runner(c):
            count.append(c)
            return {"validator_sha256":self.pin,"exit":exit_code,
                    "disposition":disposition,"mode":"live",
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
            return {"validator_sha256":self.pin,
                    "exit":1,"disposition":"MISSING_STATE","mode":"live",
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
            c.execute("UPDATE temporal_validation_results SET validator_sha256=?",(self.pin,))
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
        adapter=TemporalCheckingAdapter(Core(),self.db,lambda _:{"validator_sha256":self.pin,
            "exit":1,"disposition":"TEMPORAL_CONFLICT","mode":"live","findings":[]},
            validator_sha256=self.pin)
        self.assertEqual(adapter.poll("k")["status"],"completed")
        self.assertEqual(self.ledger.status_for_episode("ep-1","issue70_test"),"INCONSISTENT")

    def test_transient_failure_retries_once_without_reingesting(self):
        submitted=[]
        class Core:
            def submit(self,item):
                submitted.append(item)
                raise AssertionError("must never re-ingest")
            def poll(self,key):
                raise AssertionError("retry must not poll the ingestion backend")
        calls=[]
        def runner(_):
            calls.append(True)
            if len(calls)==1:raise TimeoutError("transient read-only outage")
            return {"validator_sha256":self.pin,"exit":0,"disposition":"PASS",
                    "mode":"live","coverage":"complete","findings":[]}
        adapter=TemporalCheckingAdapter(Core(),self.db,runner,validator_sha256=self.pin)
        self.assertEqual(adapter.ledger.evaluate("k",runner),"UNVERIFIED")
        # Restart with only durable state: the new instance retries read-only.
        adapter=TemporalCheckingAdapter(Core(),self.db,runner,validator_sha256=self.pin)
        self.assertEqual(adapter.retry_pending(max_items=1),1)
        self.assertEqual(adapter.ledger.status_for_episode("ep-1","issue70_test"),"PASS")
        self.assertEqual(adapter.retry_pending(max_items=1),0)
        self.assertEqual(len(calls),2)
        self.assertEqual(len(submitted),0)
        with self.db.connect() as c:
            self.assertEqual(c.execute("SELECT attempts FROM temporal_validation_results").fetchone()[0],2)

    def test_exhausted_attempts_never_reingest_or_loop(self):
        def broken(_):raise TimeoutError("unavailable")
        adapter=TemporalCheckingAdapter(object(),self.db,broken,validator_sha256=self.pin)
        self.assertEqual(adapter.ledger.evaluate("k",broken),"UNVERIFIED")
        self.assertEqual(adapter.retry_pending(),1)
        self.assertEqual(adapter.retry_pending(),0)
        with self.db.connect() as c:
            r=c.execute("SELECT attempts,state FROM temporal_validation_results").fetchone()
        self.assertEqual((r["attempts"],r["state"]),(2,"unverified"))

    def test_mismatched_runner_identity_cannot_persist_pass(self):
        runner=lambda _:{"validator_sha256":"b"*64,"exit":0,
                          "disposition":"PASS","mode":"live","findings":[]}
        self.assertEqual(self.ledger.evaluate("k",runner),"UNVERIFIED")
        self.assertEqual(self.ledger.status_for_episode("ep-1","issue70_test"),"UNVERIFIED")

    def test_validator_identity_change_preserves_history_but_blocks_reuse(self):
        runner,calls=self.run_code(0,"PASS")
        self.assertEqual(self.ledger.evaluate("k",runner),"PASS")
        select_active_validator(self.db,"b"*64)
        current=TemporalLedger(self.db,validator_sha256="b"*64)
        self.assertEqual(current.status_for_episode("ep-1","issue70_test"),"UNVERIFIED")
        self.assertEqual(current.evaluate("k",runner),"UNVERIFIED")
        self.assertEqual(len(calls),1)
        with self.db.connect() as c:
            row=c.execute("SELECT validator_sha256,state FROM temporal_validation_results").fetchone()
        self.assertEqual(row["validator_sha256"],self.pin)
        self.assertEqual(row["state"],"done")

    def test_no_contract_cannot_release_exclusive_ingest(self):
        with self.db.connect() as c:
            c.execute("DELETE FROM temporal_transition_contracts")
        class Core:
            def poll(self,key):return {"status":"completed","persisted":True,
                                       "backend_identity":key}
        adapter=TemporalCheckingAdapter(Core(),self.db,lambda _:None,
            validator_sha256=self.pin)
        self.assertEqual(adapter.poll("k")["status"],"blocked_reconcile")

if __name__=="__main__":unittest.main()
