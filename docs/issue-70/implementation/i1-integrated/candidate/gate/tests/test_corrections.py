"""Issue 70 corrections, disposable state only; never talks to installed services."""
import copy
import fcntl
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from unittest import mock

from test_gate import gate, config
from test_shared_work import candidate
from shared_work import SharedWorkQueue, SourceEventConflict, SourceAuthorityUnavailable, normalized_candidate, work_key


class Corrections(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.TemporaryDirectory()
        self.addCleanup(self.root.cleanup)
        self.cfg = replace(config(self.root.name), drain_enabled=True, process_names=())
        self.db = gate.QueueDB(self.cfg.database)
        self.worker = gate.Worker(self.cfg, self.db, threading.Event())
        self.worker._metrics = lambda: (0, 0)
        self.identity = {"account": "a", "user_id": "u", "actor_peer": "p"}

    def intent(self, name="one"):
        self.db.enqueue(self.identity, name, 0, {}, "test")
        return self.db.claim(self.db.next_ready())

    def test_known_inflight_competing_lease_restart_and_own_busy_metrics(self):
        row = self.intent()
        self.db.set_task(row, "durable-task")
        self.db.mark_unknown_claims()
        self.worker = gate.Worker(self.cfg, gate.QueueDB(self.cfg.database), threading.Event())
        self.worker._metrics = mock.Mock(side_effect=AssertionError("own occupancy must not veto polling"))
        with open(self.cfg.lock_file, "a+") as holder:
            fcntl.flock(holder, fcntl.LOCK_SH | fcntl.LOCK_NB)
            with mock.patch.object(gate, "json_request") as request:
                self.assertFalse(self.worker.tick())
                request.assert_not_called()
            self.assertEqual(self.db.inflight()["task_id"], "durable-task")
            fcntl.flock(holder, fcntl.LOCK_UN)
        def poll(method, url, **kw):
            self.assertEqual(method, "GET")
            self.assertIn("durable-task", url)
            # Poll and terminal reconciliation actually retain the OS lease.
            with open(self.cfg.lock_file, "a+") as other:
                with self.assertRaises(BlockingIOError):
                    fcntl.flock(other, fcntl.LOCK_SH | fcntl.LOCK_NB)
            return 200, {"result": {"status": "completed"}}
        with mock.patch.dict(os.environ, {"OPENVIKING_ROOT_API_KEY": "test-only"}), mock.patch.object(gate, "json_request", side_effect=poll) as request:
            self.assertTrue(self.worker.tick())
            self.assertEqual(request.call_count, 1)
        self.assertEqual(self.db.list_rows()[0]["state"], "complete")
        self.worker._metrics.assert_not_called()

    def test_unrelated_busy_scheduler_still_blocks_new_commit(self):
        self.db.enqueue(self.identity, "new", 0, {}, "test")
        self.worker._metrics = lambda: (1, 0)
        with mock.patch.object(self.worker, "_process") as process:
            self.assertFalse(self.worker.tick())
            process.assert_not_called()

    def test_unknown_cannot_be_revived_and_independent_work_fails_closed_without_barrier(self):
        row = self.intent("ambiguous")
        self.db.mark_unknown(row)
        before = self.db.list_rows()[0]
        self.db.enqueue(self.identity, "ambiguous", 0, {}, "retry")
        after = self.db.list_rows()[0]
        self.assertEqual(after["state"], "unknown")
        self.assertEqual(after["claimed_generation"], before["claimed_generation"])
        self.db.enqueue(self.identity, "independent", 0, {}, "test")
        with mock.patch.object(self.worker, "_process") as process:
            self.assertFalse(self.worker.tick())
            self.assertFalse(self.worker.tick())
            process.assert_not_called()
        self.assertEqual(self.worker.admission_status()["state"], "unknown_quiescence_unavailable")
        self.assertEqual(self.db.list_rows()[0]["state"], "unknown")
        self.assertEqual(self.db.list_rows()[1]["state"], "pending")

    def test_idle_task_list_is_not_an_authoritative_publication_barrier(self):
        with mock.patch.dict(os.environ, {"OPENVIKING_ROOT_API_KEY": "test-only"}), mock.patch.object(gate, "json_request", return_value=(200, {"status": "ok", "result": []})) as request:
            self.assertFalse(self.worker._unknown_quiescent())
            request.assert_not_called()  # The installed list API cannot prove this claim.

    def test_error_after_submission_unknown_across_restart_no_duplicate(self):
        for status, payload in [(500, {"error": {"code": "INTERNAL"}}), (503, {}), (200, {"status": "ok"}), (202, {"result": {"status": "queued"}})]:
            with self.subTest(status=status, payload=payload):
                row = self.intent(str(status) + json.dumps(payload))
                with mock.patch.dict(os.environ, {"OPENVIKING_ROOT_API_KEY": "test-only"}), mock.patch.object(gate, "json_request", return_value=(status, payload)) as request:
                    self.worker._process(row)
                    self.assertEqual(request.call_count, 1)
                self.db.mark_unknown_claims()
                self.assertIsNone(self.db.next_ready())
                self.assertEqual(self.db.list_rows()[-1]["state"], "unknown")

    def test_error_task_identity_recovers_and_polls_without_resubmit(self):
        row = self.intent()
        with mock.patch.dict(os.environ, {"OPENVIKING_ROOT_API_KEY": "test-only"}), mock.patch.object(gate, "json_request", side_effect=[(500, {"error": {"details": {"task_id": "recovered-id", "archived": True, "stage": "queue_enqueue"}}}), TimeoutError("poll lost")]) as request:
            self.worker._process(row)
            self.assertEqual([c.args[0] for c in request.call_args_list], ["POST", "GET"])
        self.assertEqual(self.db.inflight()["task_id"], "recovered-id")
        with mock.patch.dict(os.environ, {"OPENVIKING_ROOT_API_KEY": "test-only"}), mock.patch.object(gate, "json_request", return_value=(200, {"result": {"status": "completed"}})) as request:
            restarted = gate.Worker(self.cfg, gate.QueueDB(self.cfg.database), threading.Event())
            self.assertTrue(restarted.tick())
            self.assertEqual(request.call_args.args[0], "GET")
        self.assertEqual(self.db.list_rows()[0]["state"], "complete")

    def test_unproven_no_task_success_is_not_terminal(self):
        cases = (
            (200, {"status": "ok", "result": {"status": "ok"}}, "unknown"),
            (200, {"status": "ok", "result": {"status": "complete"}}, "unknown"),
            (200, {"status": "ok", "result": {"status": "completed"}}, "unknown"),
            (202, {"status": "ok", "result": {"status": "skipped", "archived": False, "archive_uri": None}}, "unknown"),
            (200, {"status": "ok", "result": {"status": "skipped", "archived": True, "archive_uri": "viking://archive"}}, "unknown"),
            (200, {"status": "ok", "result": {"status": "skipped", "archived": False, "archive_uri": None}}, "complete"),
        )
        for status, payload, expected in cases:
            with self.subTest(status=status, payload=payload):
                with tempfile.TemporaryDirectory() as root:
                    cfg = replace(config(root), process_names=())
                    db = gate.QueueDB(cfg.database)
                    db.enqueue(self.identity, "single", 0, {}, "test")
                    row = db.claim(db.next_ready())
                    worker = gate.Worker(cfg, db, threading.Event())
                    with mock.patch.dict(os.environ, {"OPENVIKING_ROOT_API_KEY": "disposable-only"}), mock.patch.object(gate, "json_request", return_value=(status, payload)) as request:
                        worker._process(row)
                    self.assertEqual(request.call_count, 1)
                    self.assertEqual(db.list_rows()[0]["state"], expected)
                    self.assertIsNone(db.list_rows()[0]["task_id"])

    def test_pre_submission_auth_failure_is_retryable(self):
        row = self.intent()
        with mock.patch.dict(os.environ, {}, clear=True), mock.patch.object(gate, "json_request") as request:
            self.worker._process(row)
            request.assert_not_called()
        self.assertEqual(self.db.list_rows()[0]["state"], "pending")

    def test_shape_is_not_source_authority_and_no_inference_is_eligible(self):
        work = SharedWorkQueue(self.db)
        for basis in ("source_verified", "operator_declared"):
            item = candidate()
            item["authority"]["basis"] = basis
            with self.assertRaises(SourceAuthorityUnavailable):
                work.enqueue(item)
        admitted = work.enqueue(candidate())
        self.assertEqual(admitted["status"], "deferred_unverified")
        self.assertIsNone(work.ready())
        self.assertIsNone(work.claim(admitted["work_key"], "lease"))

    def test_digest_replay_conflict_restart_and_concurrent_uniqueness(self):
        work = SharedWorkQueue(self.db)
        a = candidate()
        b = copy.deepcopy(a)
        b["event_id"] = "1" * 64
        b["logical_digest"] = "2" * 64
        self.assertEqual(work_key(a), work_key(b))
        first = work.enqueue(a)
        self.assertEqual(first, work.enqueue(b))
        restarted = SharedWorkQueue(gate.QueueDB(self.cfg.database))
        self.assertEqual(first, restarted.enqueue(b))
        with ThreadPoolExecutor(max_workers=4) as pool:
            self.assertTrue(all(x == first for x in pool.map(restarted.enqueue, [a, b, a, b])))
        for change in ({"fact_ref": "repo:contradiction"}, {"observed_at": "2025-01-01T00:00:00Z"}, {"category": "entity_relationship"}):
            with self.assertRaises(SourceEventConflict):
                restarted.enqueue({**a, **change})
        self.assertEqual(len(work.status()), 1)
        # Different destination is a different identity; source hash stays bound.
        b["scope"]["group_id"] = "other"
        self.assertNotEqual(first["work_key"], work.enqueue(b)["work_key"])

    def test_admitted_processing_and_terminal_identities_reject_conflicting_payload(self):
        work = SharedWorkQueue(self.db)
        first = work.enqueue(candidate())
        with self.db.connect() as conn:
            conn.execute("UPDATE memory_work SET status='queued' WHERE work_key=?", (first["work_key"],))
        row = work.claim(first["work_key"], "disposable-fixture-lease")
        bad = candidate(); bad["fact_ref"] = "repo:conflicting"
        with self.assertRaises(SourceEventConflict): work.enqueue(bad)
        work.processing(first["work_key"], row["attempt_generation"], "synthetic-episode")
        with self.assertRaises(SourceEventConflict): work.enqueue(bad)
        work.finish(first["work_key"], row["attempt_generation"], "synthetic-episode", "completed")
        with self.assertRaises(SourceEventConflict): SharedWorkQueue(self.db).enqueue(bad)
        self.assertEqual(work.enqueue(candidate())["status"], "completed")
        self.assertEqual(len(work.status()), 1)

    def test_historical_collision_migration_rolls_back_without_rewriting_records(self):
        work = SharedWorkQueue(self.db)
        first = work.enqueue(candidate())
        with self.db.connect() as conn:
            row = dict(conn.execute("SELECT * FROM memory_work").fetchone())
            item = json.loads(row["candidate_json"])
            item["logical_digest"] = "f" * 64
            row["work_key"] = "e" * 64
            row["candidate_json"] = json.dumps(item)
            columns = list(row)
            conn.execute("INSERT INTO memory_work (" + ",".join(columns) + ") VALUES (" + ",".join("?" for _ in columns) + ")", list(row.values()))
            conn.execute("DROP TABLE memory_source_admissions")
            before = [dict(r) for r in conn.execute("SELECT * FROM memory_work ORDER BY work_key")]
        with self.assertRaises(SourceEventConflict):
            SharedWorkQueue(self.db)
        with self.db.connect() as conn:
            self.assertEqual(before, [dict(r) for r in conn.execute("SELECT * FROM memory_work ORDER BY work_key")])
            self.assertIsNone(conn.execute("SELECT name FROM sqlite_master WHERE name='memory_source_admissions'").fetchone())

    def test_missing_jsonschema_disabled_startup_and_enabled_preflight(self):
        script = r"""
import importlib.abc, sys, tempfile, threading
from dataclasses import replace
class Block(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, *args):
        if fullname == 'jsonschema' or fullname.startswith('jsonschema.'):
            raise ModuleNotFoundError('deliberately absent jsonschema')
sys.meta_path.insert(0, Block())
from test_gate import gate, config
with tempfile.TemporaryDirectory() as root:
    cfg = config(root)
    db = gate.QueueDB(cfg.database)
    worker = gate.Worker(cfg, db, threading.Event())
    assert worker.shared is None
    assert worker.tick() is False
    try:
        gate.Worker(replace(cfg, graphiti_enabled=True), db, threading.Event())
    except RuntimeError as exc:
        assert 'requirements-phase1.txt' in str(exc)
    else:
        raise AssertionError('optional dependency must produce explicit preflight error')
"""
        result = subprocess.run([sys.executable, "-c", script], cwd=Path(__file__).parent, env={**os.environ, "PYTHONPATH": str(Path(__file__).parents[1]), "PYTHONDONTWRITEBYTECODE": "1"}, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    unittest.main()
