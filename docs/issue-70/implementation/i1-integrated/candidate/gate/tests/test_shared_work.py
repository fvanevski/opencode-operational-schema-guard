import hashlib
import tempfile
import threading
import unittest
from dataclasses import replace
from unittest import mock

from test_gate import config, gate
from shared_work import SharedWorkQueue, valid_candidate


def candidate(suffix="1"):
    digest = hashlib.sha256(suffix.encode()).hexdigest()
    return {
        "schema_version": 1, "event_id": digest,
        "source": {"system": "opencode-v2", "session_id": "s1", "message_id": "m1", "tool_event_id": "t" + suffix, "event_id": "t" + suffix, "cursor_id": "m1"},
        "scope": {"workspace_id": "/work", "group_id": "approved"},
        "observed_at": "2026-10-30T00:00:00Z", "category": "verified_architecture_fact",
        "authority": {"basis": "agent_candidate", "confidence": 0, "evidence_ref": "repo:commit:file"},
        "policy_revision": "operator-r1", "destination": "graphiti", "fact_ref": "repo:commit:fact-1",
        "logical_digest": digest,
    }


class SyntheticGraphiti:
    def __init__(self, statuses=None, ambiguous=False):
        self.statuses = iter(statuses or ["queued", "processing", "completed"])
        self.ambiguous = ambiguous
        self.submissions = 0
        self.timeline = []

    def submit(self, item):
        self.submissions += 1
        self.timeline.append("submitted")
        if self.ambiguous:
            raise TimeoutError("ack lost after possible submission")
        return "episode-1"

    def poll(self, backend_identity):
        status = next(self.statuses)
        self.timeline.append(status)
        return {"backend_identity": backend_identity, "status": status, "persisted": status == "completed"}


class SharedWorkTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.cfg = replace(config(self.tmp.name), drain_enabled=True, graphiti_enabled=True, process_names=(), task_poll_seconds=0)
        self.db = gate.QueueDB(self.cfg.database)
        self.work = SharedWorkQueue(self.db)

    def tearDown(self):
        self.tmp.cleanup()

    def enqueue_synthetic(self, item):
        # Explicit disposable scheduling fixture. There is no production
        # promotion API; all ordinary admissions remain deferred_unverified.
        result = self.work.enqueue(item)
        with self.db.connect() as conn:
            conn.execute("UPDATE memory_work SET status='queued' WHERE work_key=?", (result["work_key"],))
        return result

    def worker(self, adapter):
        worker = gate.Worker(self.cfg, self.db, threading.Event(), adapter)
        worker._active_harness_processes = lambda: []
        worker._metrics = lambda: (0, 0)
        return worker

    def run_ready(self, worker):
        self.assertFalse(worker.tick())  # first clean observation starts quiet grace
        self.assertTrue(worker.tick())

    def test_schema_rejection_and_durable_coalescing(self):
        item = candidate()
        self.assertTrue(valid_candidate(item))
        first = self.work.enqueue(item)
        self.assertEqual(first, self.work.enqueue(item))
        self.assertEqual(len(self.work.status()), 1)
        for change in ({"fact_ref": "tests/fixture"}, {"fact_ref": "password=secret"}, {"category": "unsupported"}):
            bad = {**item, **change}
            self.assertFalse(valid_candidate(bad))
            with self.assertRaises(ValueError):
                self.work.enqueue(bad)
        self.assertNotIn("candidate_json", self.work.status()[0])

    def test_queued_ack_holds_full_reservation_and_ignores_own_metrics(self):
        item = self.enqueue_synthetic(candidate())
        adapter = SyntheticGraphiti()
        worker = self.worker(adapter)
        metric_reads = []
        def metrics():
            metric_reads.append(adapter.submissions)
            return (0, 0) if adapter.submissions == 0 else (1, 0)
        worker._metrics = metrics
        self.run_ready(worker)
        self.assertEqual(metric_reads, [0, 0, 0])
        self.assertEqual(adapter.timeline, ["submitted", "queued", "processing", "completed"])
        self.assertEqual(self.work.status()[0]["status"], "completed")
        self.assertEqual(self.work.status()[0]["backend_identity"], "episode-1")
        self.assertEqual(item["work_key"], self.work.status()[0]["work_key"])

    def test_ambiguous_ack_restart_never_resubmits_and_reconcile_needs_identity(self):
        key = self.enqueue_synthetic(candidate())["work_key"]
        adapter = SyntheticGraphiti(ambiguous=True)
        self.run_ready(self.worker(adapter))
        self.assertEqual(adapter.submissions, 1)
        self.assertEqual(self.work.status()[0]["status"], "blocked_reconcile")
        self.assertFalse(self.worker(adapter).tick())
        self.assertEqual(adapter.submissions, 1)
        with self.assertRaises(RuntimeError):
            self.work.reconcile(key, "invented-id", "completed")

    def test_restart_processing_and_cancel_queued(self):
        key = self.enqueue_synthetic(candidate())["work_key"]
        row = self.work.claim(key, "lease-1")
        self.work.processing(key, row["attempt_generation"], "episode-1")
        self.work.recover_after_restart()
        self.assertEqual(self.work.status()[0]["status"], "blocked_reconcile")
        self.work.reconcile(key, "episode-1", "completed")
        self.assertEqual(self.work.status()[0]["status"], "completed")
        next_key = self.enqueue_synthetic(candidate("2"))["work_key"]
        self.assertTrue(self.work.cancel(next_key))
        self.assertFalse(self.work.cancel(next_key))

    def test_metrics_and_shared_lease_block_admission(self):
        self.enqueue_synthetic(candidate())
        worker = self.worker(SyntheticGraphiti())
        worker._metrics = lambda: (1, 0)
        self.assertFalse(worker.tick())
        self.assertEqual(worker.admission_status()["state"], "vllm_busy")
        self.assertEqual(self.work.status()[0]["status"], "queued")
        worker._metrics = mock.Mock(side_effect=ValueError("malformed metrics"))
        with self.assertRaises(ValueError):
            worker.tick()
        worker._metrics.assert_called_once()
        worker._try_exclusive_lock = lambda: None
        self.assertFalse(worker.tick())
        self.assertEqual(worker.admission_status()["state"], "shared_lease_active")

    def test_alternating_classes_preserves_legacy_turns(self):
        self.db.enqueue({"account": "a", "user_id": "u", "actor_peer": "p"}, "ov-1", 0, {}, "mixed")
        self.db.enqueue({"account": "a", "user_id": "u", "actor_peer": "p"}, "ov-2", 0, {}, "mixed")
        self.enqueue_synthetic(candidate("1"))
        self.enqueue_synthetic(candidate("2"))
        order = []
        class Adapter:
            def submit(self, _):
                order.append("graphiti")
                return "ep-synthetic"
            def poll(self, backend_identity):
                return {"backend_identity": backend_identity, "status": "completed", "persisted": True}
        worker = self.worker(Adapter())
        def ov(row):
            order.append("openviking")
            self.db.complete(row)
        worker._process = ov
        for _ in range(4):
            self.run_ready(worker)
        self.assertEqual(order, ["openviking", "graphiti", "openviking", "graphiti"])

    def test_feature_disabled_does_not_migrate_or_submit(self):
        cfg = replace(self.cfg, graphiti_enabled=False)
        with tempfile.TemporaryDirectory() as root:
            cfg = replace(cfg, database=f"{root}/queue.sqlite3")
            db = gate.QueueDB(cfg.database)
            worker = gate.Worker(cfg, db, threading.Event())
            self.assertIsNone(worker.shared)
            with db.connect() as conn:
                names = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            self.assertNotIn("memory_work", names)

    def test_legacy_ambiguous_queued_ack_does_not_resubmit(self):
        self.db.enqueue({"account": "a", "user_id": "u", "actor_peer": "p"}, "ov-ambiguous", 0, {}, "mixed")
        row = self.db.claim(self.db.next_ready())
        worker = self.worker(SyntheticGraphiti())
        with mock.patch.object(gate, "json_request", return_value=(202, {"result": {"status": "queued"}})) as request:
            worker._process(row)
        self.assertEqual(request.call_count, 1)
        self.assertEqual(self.db.list_rows()[0]["state"], "unknown")
        self.assertTrue(self.db.has_unknown_claim())


if __name__ == "__main__":
    unittest.main()
