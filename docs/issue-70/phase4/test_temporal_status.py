"""Operator-visible work status distinguishes ingestion from temporal validation."""
import tempfile
import unittest
from pathlib import Path
from test_gate import gate
from shared_work import SharedWorkQueue
from test_shared_work import candidate
from temporal_ledger import TemporalLedger

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
        TemporalLedger(db)
        with db.connect() as c:
            c.execute("""INSERT INTO temporal_transition_contracts
                (work_key,group_id,contract_json,contract_digest,attestation_digest,bound_at)
                VALUES (?,?,?,?,?,?)""",
                (admitted["work_key"],"approved","{}","digest","attestation",1))
        self.assertEqual(q.status()[0]["temporal_validation_status"],"UNVERIFIED")
        with db.connect() as c:
            c.execute("""INSERT INTO temporal_validation_results(
                work_key,episode_uuid,contract_digest,state,exit_code,
                disposition,attempts,updated_at)
                VALUES (?,?,?,'done',1,'TEMPORAL_CONFLICT',1,1)""",
                (admitted["work_key"],"ep-1","digest"))
        record=q.status()[0]
        self.assertEqual(record["status"],"deferred_unverified")
        self.assertEqual(record["temporal_validation_status"],"INCONSISTENT")
        self.assertEqual(record["temporal_episode_uuid"],"ep-1")
if __name__=="__main__":unittest.main()
