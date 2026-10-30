"""Issue 70 regression proposal: serialized multi-unknown QueueFS recovery.

Copy into candidate/gate/tests/test_multi_unknown_recovery.py and run with
the pinned gate's test environment. This intentionally does not assert that
scheduler-idle metrics prove absence of queued or future extraction work.
Source-tested against the f822 review contract; not centrally executed.
"""
import tempfile
import threading
import time
import unittest
from dataclasses import replace
from test_gate import gate, config


class MultiUnknownRecovery(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.TemporaryDirectory()
        self.addCleanup(self.root.cleanup)
        self.cfg = replace(config(self.root.name), receipts_enabled=True, drain_enabled=True, process_names=(), quiet_grace_seconds=0.01)
        self.db = gate.QueueDB(self.cfg.database)
        self.worker = gate.Worker(self.cfg, self.db, threading.Event())
        self.worker._metrics = lambda: (0, 0)

    def claim_unknown(self, session):
        scope = {"account": "a", "user_id": "u", "actor_peer": "p"}
        self.db.enqueue(scope, session, 0, {}, "multi-unknown-regression")
        claimed = self.db.claim(self.db.next_ready())
        self.assertIsNotNone(claimed)
        self.db.mark_unknown(claimed)
        return self.db.unknown_rows()[-1]

    def test_second_recovery_is_not_admitted_while_first_could_be_queued(self):
        first = self.claim_unknown("first")
        second = self.claim_unknown("second")
        self.worker._recovery_quiet_since = time.monotonic() - 100
        self.assertFalse(self.worker._receipt_recovery_admitted(second),
                         "Two unproven requests must never be simultaneously recoverable")
        self.db.adopt_receipt_task(first, "task-first")
        self.worker._recovery_quiet_since = time.monotonic() - 100
        self.assertFalse(self.worker._receipt_recovery_admitted(second),
                         "An inflight task can be queued while model metrics report idle")
        self.db.complete(first, outcome="completed")
        self.worker._recovery_quiet_since = time.monotonic() - 100
        self.assertTrue(self.worker._receipt_recovery_admitted(second),
                        "After independent terminal proof for the first request, recovery may proceed")

    def test_inflight_request_prevents_other_recovery(self):
        first = self.claim_unknown("first")
        second = self.claim_unknown("second")
        self.db.adopt_receipt_task(first, "task-first")
        self.worker._recovery_quiet_since = time.monotonic() - 100
        self.assertFalse(self.worker._receipt_recovery_admitted(second))


if __name__ == "__main__":
    unittest.main()
