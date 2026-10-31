"""Operator-visible work status distinguishes ingestion from temporal validation."""
import tempfile
import unittest
from pathlib import Path
from test_gate import gate
from shared_work import SharedWorkQueue
from test_shared_work import candidate
from temporal_ledger import TemporalLedger

PIN="a"*64
class StatusTests(unittest.TestCase):
    def test_legacy_status_unchanged_and_opted_in_status_is_distinct(self):
        t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup)
        db=gate.QueueDB(str(Path(t.name)/"gate.sqlite3"))
        q=SharedWorkQueue(db)
        item=candidate("status")
        admitted=q.enqueue(item)
        original=q.status()
        self.assertEqual(original[0]["status"],"deferred_unverified")
        self.assertNotIn("temporal_validation_status",original[0])
        TemporalLedger(db,validator_sha256=PIN)
        with db.connect() as c:
            c.execute("""INSERT INTO temporal_transition_contracts
                (work_key,group_id,contract_json,contract_digest,attestation_digest,bound_at)
                VALUES (?,?,?,?,?,?)""",
                (admitted["work_key"],"approved","{}","digest","attestation",1))
        self.assertEqual(q.status()[0]["temporal_validation_status"],"UNVERIFIED")
        with db.connect() as c:
            c.execute("""INSERT INTO temporal_validation_results(
                work_key,episode_uuid,contract_digest,state,exit_code,
                disposition,attempts,updated_at,validator_sha256)
                VALUES (?,?,?,'done',1,'TEMPORAL_CONFLICT',1,1,?)""",
                (admitted["work_key"],"ep-1","digest",PIN))
        record=q.status()[0]
        self.assertEqual(record["status"],"deferred_unverified")
        self.assertEqual(record["temporal_validation_status"],"INCONSISTENT")
        self.assertEqual(record["temporal_episode_uuid"],"ep-1")
        self.assertEqual(record["temporal_validator_sha256"],PIN)
        with db.connect() as c:
            c.execute("UPDATE temporal_validator_active SET validator_sha256=?",("b"*64,))
        self.assertEqual(q.status()[0]["temporal_validation_status"],"UNVERIFIED")

    def test_legacy_outcome_schema_fails_closed_without_runtime_identity(self):
        t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup)
        db=gate.QueueDB(str(Path(t.name)/"gate.sqlite3"))
        q=SharedWorkQueue(db)
        item=candidate("legacy-exclusive")
        item["category"]="exclusive_state_transition"
        item["transition"]={
            "subject_ref":"Service","predicate":"USES",
            "outgoing_state_ref":"Redis","incoming_state_ref":"NATS",
            "effective_at":"2026-10-30T00:00:00Z"}
        nominated=q.enqueue(item)
        with db.connect() as conn:
            conn.execute("""CREATE TABLE temporal_transition_contracts(
                work_key TEXT,group_id TEXT,contract_json TEXT,contract_digest TEXT)""")
            conn.execute("""INSERT INTO temporal_transition_contracts VALUES
                (?,'approved','{}','digest')""",(nominated["work_key"],))
            conn.execute("""CREATE TABLE temporal_validation_results(
                work_key TEXT,episode_uuid TEXT,state TEXT,exit_code INTEGER,
                disposition TEXT)""")
            conn.execute("""INSERT INTO temporal_validation_results VALUES
                (?,'ep-old','done',0,'PASS')""",(nominated["work_key"],))
        self.assertEqual(q.status()[0]["temporal_validation_status"],"UNVERIFIED")

    def test_exclusive_state_without_contract_is_unverified_not_exempt(self):
        t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup)
        db=gate.QueueDB(str(Path(t.name)/"gate.sqlite3"))
        q=SharedWorkQueue(db)
        item=candidate("exclusive-status")
        item["category"]="exclusive_state_transition"
        item["transition"]={
            "subject_ref":"Service",
            "predicate":"USES_AS_JOB_QUEUE_BACKEND",
            "outgoing_state_ref":"Redis",
            "incoming_state_ref":"NATS",
            "effective_at":"2026-10-30T00:00:00Z",
        }
        nominated=q.enqueue(item)
        TemporalLedger(db)
        # An unbound exclusive candidate must not display 'not_required'.
        before=q.status()[0]
        self.assertEqual(before["work_key"],nominated["work_key"])
        self.assertEqual(before["temporal_validation_status"],"UNVERIFIED")
        self.assertNotIn("candidate_json",before)
        self.assertNotIn("_candidate_json",before)
        with db.connect() as conn:
            conn.execute("""UPDATE memory_work SET status='completed'
                WHERE work_key=?""",(nominated["work_key"],))
        after=q.status()[0]
        self.assertEqual(after["status"],"completed")
        self.assertEqual(after["temporal_validation_status"],"UNVERIFIED")

    def test_ordinary_fact_without_contract_remains_not_required(self):
        t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup)
        db=gate.QueueDB(str(Path(t.name)/"gate.sqlite3"))
        q=SharedWorkQueue(db)
        nominated=q.enqueue(candidate("ordinary-status"))
        TemporalLedger(db)
        after=q.status()[0]
        self.assertEqual(after["work_key"],nominated["work_key"])
        self.assertEqual(after["temporal_validation_status"],"not_required")

if __name__=="__main__":unittest.main()
