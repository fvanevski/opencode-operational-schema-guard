import tempfile
import unittest
from pathlib import Path
from receipt_protocol import ReceiptLedger, ReceiptConflict, canonical_digest, request_key, gate_decision

SCOPE = {"account":"a", "user_id":"u", "actor_peer":"p", "session_id":"s"}
BODY = canonical_digest({"keep_recent_count":0})
KEY = request_key(SCOPE, 7)

class ReceiptTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db = str(Path(self.temp.name)/"backend-receipts.sqlite3")
        self.ledger = ReceiptLedger(self.db)
    def tearDown(self):
        self.temp.cleanup()
    def test_durable_first_writer_wins_and_frozen_digest(self):
        one, fresh = self.ledger.begin(KEY, SCOPE, BODY)
        self.assertTrue(fresh)
        again, fresh = ReceiptLedger(self.db).begin(KEY, SCOPE, BODY)
        self.assertFalse(fresh)
        self.assertEqual(one, again)
        with self.assertRaises(ReceiptConflict):
            self.ledger.begin(KEY, SCOPE, canonical_digest({"keep_recent_count":1}))
    def test_publication_window_never_releases(self):
        self.ledger.begin(KEY, SCOPE, BODY)
        self.assertEqual(gate_decision(self.ledger.read(KEY),key=KEY,scope=SCOPE,body_digest=BODY), ("BLOCK",None))
    def test_task_identity_survives_restart_and_requires_terminal(self):
        self.ledger.begin(KEY, SCOPE, BODY)
        self.ledger.accepted(KEY, "task-1")
        fresh = ReceiptLedger(self.db)
        self.assertEqual(gate_decision(fresh.read(KEY),key=KEY,scope=SCOPE,body_digest=BODY), ("TRACK","task-1"))
        with self.assertRaises(ValueError):
            fresh.sealed_terminal(KEY,"completed",backend_quiescence_verified=False)
        self.assertEqual(gate_decision(fresh.read(KEY),key=KEY,scope=SCOPE,body_digest=BODY), ("TRACK","task-1"))
        fresh.sealed_terminal(KEY,"completed",backend_quiescence_verified=True)
        self.assertEqual(gate_decision(fresh.read(KEY),key=KEY,scope=SCOPE,body_digest=BODY), ("RELEASE","completed"))
    def test_ambiguous_absence_or_mismatch_never_releases(self):
        self.ledger.begin(KEY, SCOPE, BODY)
        self.assertEqual(gate_decision(None,key=KEY,scope=SCOPE,body_digest=BODY), ("BLOCK",None))
        row=self.ledger.read(KEY)
        for k,v in (("request_key","e"*64),("scope_json","{}"),("body_digest","f"*64),("protocol","wrong")):
            tampered=dict(row); tampered[k]=v
            self.assertEqual(gate_decision(tampered,key=KEY,scope=SCOPE,body_digest=BODY), ("BLOCK",None))
    def test_skipped_only_without_task_and_with_positive_backend_proof(self):
        self.ledger.begin(KEY, SCOPE, BODY)
        self.ledger.sealed_terminal(KEY,"skipped",backend_quiescence_verified=True)
        self.assertEqual(gate_decision(self.ledger.read(KEY),key=KEY,scope=SCOPE,body_digest=BODY), ("RELEASE","skipped"))
        with self.assertRaises(ReceiptConflict):
            self.ledger.sealed_terminal(KEY,"failed",backend_quiescence_verified=True)
    def test_no_task_cannot_invent_terminal_extraction(self):
        self.ledger.begin(KEY, SCOPE, BODY)
        with self.assertRaises(ReceiptConflict):
            self.ledger.sealed_terminal(KEY,"completed",backend_quiescence_verified=True)
    def test_scope_and_generation_bind_request(self):
        self.assertNotEqual(KEY, request_key(SCOPE, 8))
        self.assertNotEqual(KEY, request_key({**SCOPE,"user_id":"other"},7))
        self.assertEqual(BODY, canonical_digest({"keep_recent_count":0}))
if __name__ == '__main__': unittest.main()
