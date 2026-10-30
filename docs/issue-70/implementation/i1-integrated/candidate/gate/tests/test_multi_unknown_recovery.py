"""Gate admission regressions for multiple unresolved backend receipts.

Coordinator checks only; actual QueueFS/backend interleavings tested separately.
"""
import fcntl
import tempfile
import threading
import time
import unittest
from dataclasses import replace
from unittest import mock

from test_gate import gate, config


class MultipleUnknownRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.cfg = replace(
            config(self.tmp.name), receipts_enabled=True,
            drain_enabled=True, quiet_grace_seconds=0.01, process_names=(),
        )
        self.db = gate.QueueDB(self.cfg.database)
        self.worker = gate.Worker(self.cfg, self.db, threading.Event())
        self.worker._metrics = mock.Mock(return_value=(0, 0))
        self.scope = {"account": "a", "user_id": "u", "actor_peer": "p"}

    def unknown(self, session):
        self.db.enqueue(self.scope, session, 0, {}, "multi-unknown-case")
        row = self.db.claim(self.db.next_ready())
        self.assertIsNotNone(row)
        self.assertEqual(row["session_id"], session)
        self.db.mark_unknown(row)
        return next(r for r in self.db.unknown_rows() if r["session_id"] == session)

    def eligible_now(self):
        self.worker._recovery_quiet_since = time.monotonic() - 10

    def test_queued_inflight_task_blocks_distinct_unknown_recovery(self):
        a = self.unknown("a")
        b = self.unknown("b")
        self.db.adopt_receipt_task(a, "durable-task-a")
        self.eligible_now()
        self.assertFalse(self.worker._receipt_recovery_admitted(b))
        self.assertIsNone(self.worker._recovery_quiet_since)
        # This unit-level completion models a separately proven terminal
        # receipt. The service-backed tests must establish actual finality.
        self.db.complete(a, outcome="completed")
        self.eligible_now()
        self.assertTrue(self.worker._receipt_recovery_admitted(b))

    def test_two_ambiguous_submissions_fail_closed_without_external_proof(self):
        a = self.unknown("a")
        b = self.unknown("b")
        for row in (a, b):
            self.eligible_now()
            self.assertFalse(self.worker._receipt_recovery_admitted(row))
        self.worker._metrics.assert_not_called()

    def test_tick_only_observes_when_multiple_unknown_requests_exist(self):
        self.unknown("a")
        self.unknown("b")
        self.eligible_now()
        with mock.patch.object(self.worker, "_receipt_observation", return_value=False) as observe:
            self.assertFalse(self.worker.tick())
            self.assertEqual(observe.call_count, 2)
            self.assertTrue(all(c.kwargs["allow_recovery"] is False for c in observe.call_args_list))

    def test_unrelated_pending_intent_does_not_starve_single_recovery(self):
        row = self.unknown("ambiguous")
        self.db.enqueue(self.scope, "not-yet-submitted", 0, {}, "new")
        self.eligible_now()
        self.assertTrue(self.worker._receipt_recovery_admitted(row))

    def test_competing_interactive_shared_lease_resets_recovery_grace(self):
        self.unknown("ambiguous")
        self.eligible_now()
        with open(self.cfg.lock_file, "a+") as holder:
            fcntl.flock(holder, fcntl.LOCK_SH | fcntl.LOCK_NB)
            try:
                with mock.patch.object(self.worker, "_receipt_observation") as observe:
                    self.assertFalse(self.worker.tick())
                    observe.assert_not_called()
                self.assertIsNone(self.worker._recovery_quiet_since)
            finally:
                fcntl.flock(holder, fcntl.LOCK_UN)


if __name__ == "__main__":
    unittest.main()
