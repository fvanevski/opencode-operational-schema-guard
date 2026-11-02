"""Exact candidate / isolated binding verification regression for PR #76.

Run ONLY after constructing the candidate from the published pinned preimage
plus fix_reviewed_gate.py and loading from reconstructed host-candidate/gate.
The direct undecorated method here is a pure CPU unit test, not production
admission evidence. Keep the end-to-end gate tests separate.
"""
import pathlib
import sys
import unittest
from types import SimpleNamespace
from unittest import mock

root = pathlib.Path(__file__).resolve().parents[1]
gate_dir = root / "host-candidate" / "gate"
if not gate_dir.is_dir():
    raise RuntimeError("Candidate gate source unavailable; do not fall back to installed bytes")
sys.path.insert(0, str(gate_dir))
import openviking_commit_gate as gate

SCOPE = {"account": "account", "user_id": "user", "actor_peer": "actor", "session_id": "session"}

class FakeDB:
    def __init__(self):
        self.calls = []
        self.attempt_record = {"submitted": 0, "request_key": "test-key", "generation": 1}
    def attempt(self, _row):
        return self.attempt_record
    def retry(self, row, reason, cfg):
        self.calls.append(("retry", row["session_id"], reason))
    def dead_letter(self, row, reason):
        self.calls.append(("dead", row["session_id"], reason))

class BindingReviewRegressions(unittest.TestCase):
    def worker(self):
        w = object.__new__(gate.Worker)
        w.cfg = SimpleNamespace(backend_host="127.0.0.1", backend_port=1934,
                                request_timeout_seconds=0.1, retry_base_seconds=1, retry_max_seconds=4)
        w.db = FakeDB()
        w._auth_headers = lambda row: {"Authorization": "Bearer disposable"}
        return w

    def test_binding_authoritative_match(self):
        w = self.worker()
        with mock.patch.object(gate, "json_request", return_value=(200, {"result": {
            "protocol": "gate-owner-binding-v1", **SCOPE
        }})):
            self.assertIs(w._verified_claim_binding(SCOPE), True)

    def test_binding_authoritative_mismatch_is_terminal(self):
        w = self.worker()
        with mock.patch.object(gate, "json_request", return_value=(200, {"result": {
            "protocol": "gate-owner-binding-v1", **SCOPE, "account": "different"
        }})):
            self.assertIs(w._verified_claim_binding(SCOPE), False)
        w._verified_claim_binding = lambda row: False
        gate.Worker._process_receipted.__wrapped__(w, SCOPE)
        self.assertEqual(len(w.db.calls), 1)
        self.assertEqual(w.db.calls[0][0], "dead")
        self.assertEqual(w.db.attempt_record["submitted"], 0)

    def test_unavailable_binding_retries_without_submission(self):
        for response in ((503, {"error": "temporarily unavailable"}),
                         (404, {}), (200, {"unexpected": "shape"})):
            with self.subTest(response=response[0]):
                w = self.worker()
                with mock.patch.object(gate, "json_request", return_value=response):
                    self.assertIsNone(w._verified_claim_binding(SCOPE))
                w._verified_claim_binding = lambda row: None
                gate.Worker._process_receipted.__wrapped__(w, SCOPE)
                self.assertEqual(len(w.db.calls), 1)
                self.assertEqual(w.db.calls[0][0], "retry")
                self.assertEqual(w.db.attempt_record["submitted"], 0)

    def test_transport_timeout_retries_without_submission(self):
        w = self.worker()
        with mock.patch.object(gate, "json_request", side_effect=TimeoutError("owner unavailable")):
            self.assertIsNone(w._verified_claim_binding(SCOPE))
        w._verified_claim_binding = lambda row: None
        gate.Worker._process_receipted.__wrapped__(w, SCOPE)
        self.assertEqual(w.db.calls[0][0], "retry")
        self.assertEqual(w.db.attempt_record["submitted"], 0)

if __name__ == "__main__":
    unittest.main()
