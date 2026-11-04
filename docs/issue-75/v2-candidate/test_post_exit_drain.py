"""CPU-only admission tests, no host services or model inference."""
import fcntl
import sqlite3
import importlib.util
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest import TestCase, mock

spec = importlib.util.spec_from_file_location(
    "issue75_post_exit", Path(__file__).with_name("post-exit-drain.py"))
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)

class FakeWorker:
    active = []
    def _active_harness_processes(self):
        return type(self).active
    def _unresolved_graphiti_from_existing_db(self):
        with self.db.connect() as conn:
            found = conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='memory_work'").fetchone()
            if not found:
                return False
            return conn.execute("SELECT 1 FROM memory_work WHERE status IN ('admitted','processing','blocked_reconcile') LIMIT 1").fetchone() is not None

class FakeGate:
    Worker = FakeWorker
    @staticmethod
    def parse_vllm_metrics(payload, _running, _waiting):
        numbers = payload.split("/")
        return float(numbers[0]), float(numbers[1])

CFG = SimpleNamespace(
    metrics_url="http://127.0.0.1:8002/metrics",
    metrics_fallback_urls=(), metrics_running="auto", metrics_waiting="auto", database="/nonexistent/issue75-queue.sqlite3")

def http_response(payload):
    response = mock.MagicMock()
    response.status = 200
    response.read.return_value = payload.encode()
    response.__enter__.return_value = response
    return response

class PostExitAdmissionTests(TestCase):
    def test_bounded_lock_wait_does_not_bypass_held_lease(self):
        # Two handles to the SAME inode exercise actual flock contention.
        with tempfile.TemporaryDirectory() as temp:
            lockpath = Path(temp) / 'agent.lock'
            with lockpath.open('a+') as holder, lockpath.open('a+') as contender:
                fcntl.flock(holder.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                with self.assertRaisesRegex(RuntimeError, 'lease held'):
                    runner.acquire_gate_lock(contender, 0)
                fcntl.flock(holder.fileno(), fcntl.LOCK_UN)
                runner.acquire_gate_lock(contender, 0)
                fcntl.flock(contender.fileno(), fcntl.LOCK_UN)

    def setUp(self):
        FakeWorker.active = []
        self.real_canonical_unresolved = runner.canonical_unresolved
        patcher = mock.patch.object(runner, 'canonical_unresolved', return_value=False)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_canonical_queue_unresolved_blocks_drain(self):
        with tempfile.TemporaryDirectory() as directory:
            f = Path(directory) / "queue.sqlite3"
            with sqlite3.connect(f) as conn:
                conn.execute("CREATE TABLE memory_work (status TEXT NOT NULL)")
                conn.execute("INSERT INTO memory_work VALUES ('blocked_reconcile')")
            cfg = SimpleNamespace(**{**vars(CFG), "database": str(f)})
            self.assertTrue(self.real_canonical_unresolved(FakeGate, cfg))
            with mock.patch.object(runner, "canonical_unresolved", wraps=self.real_canonical_unresolved):
                with mock.patch.object(runner.urllib.request, "urlopen") as metrics:
                    with self.assertRaisesRegex(RuntimeError, "unresolved"):
                        runner.observation(FakeGate, cfg)
                    metrics.assert_not_called()
            with sqlite3.connect(f) as conn:
                self.assertEqual(conn.execute("SELECT status FROM memory_work").fetchone()[0], "blocked_reconcile")
                conn.execute("UPDATE memory_work SET status='completed'")
            self.assertFalse(self.real_canonical_unresolved(FakeGate, cfg))

    def test_canonical_queue_missing_fails_closed(self):
        cfg = SimpleNamespace(database="/nonexistent/issue75-gate-state.sqlite3")
        with self.assertRaisesRegex(RuntimeError, "unverifiable"):
            self.real_canonical_unresolved(FakeGate, cfg)

    def test_canonical_queue_no_memory_work_table_is_idle(self):
        with tempfile.TemporaryDirectory() as directory:
            f = Path(directory) / "queue.sqlite3"
            with sqlite3.connect(f) as conn:
                conn.execute("CREATE TABLE unrelated (n INTEGER)")
            self.assertFalse(self.real_canonical_unresolved(FakeGate, SimpleNamespace(database=str(f))))

    def test_late_reconciliation_waits_without_resubmitting_or_releasing(self):
        with mock.patch.object(runner.subprocess, 'run') as run:
            run.side_effect = [
                SimpleNamespace(returncode=3),
                SimpleNamespace(returncode=0),
            ]
            with mock.patch.object(runner.time, 'sleep') as sleep:
                result = runner.reconcile_late('/tmp/curator-cli.mjs',
                    'cur80_unit', '/tmp/state', 'http://127.0.0.1:8766/mcp',
                    {'GHDEV_MEMORY_POST_EXIT_LEASE': 'admitted'}, interval_seconds=5)
            self.assertEqual(result, 0)
            self.assertEqual(run.call_count, 2)
            for call in run.call_args_list:
                self.assertIn('reconcile-only', call.args[0])
                self.assertNotIn('drain', call.args[0])
                self.assertNotIn('add_memory', call.args[0])
            sleep.assert_called_once_with(5)

    def test_late_reconciliation_resumes_only_after_remote_ambiguity_clears(self):
        with mock.patch.object(runner.subprocess, 'run') as run:
            run.side_effect = [
                SimpleNamespace(returncode=3),  # Ambiguous submission: no retry
                SimpleNamespace(returncode=4),  # Remote settled, local approved
                SimpleNamespace(returncode=0),  # Resumed admitted drain settled
            ]
            with mock.patch.object(runner.time, 'sleep') as sleep:
                result = runner.reconcile_late('/tmp/curator-cli.mjs',
                    'cur80_unit', '/tmp/state', 'http://127.0.0.1:8766/mcp',
                    {'GHDEV_MEMORY_POST_EXIT_LEASE': 'admitted'},
                    interval_seconds=5,max_seconds=30)
            self.assertEqual(result, 0)
            self.assertEqual(run.call_count, 3)
            self.assertIn('reconcile-only', run.call_args_list[0].args[0])
            self.assertIn('reconcile-only', run.call_args_list[1].args[0])
            self.assertIn('drain', run.call_args_list[2].args[0])
            self.assertIn('--max-seconds', run.call_args_list[2].args[0])
            sleep.assert_called_once_with(5)

    def test_late_reconciliation_keeps_lease_after_resumed_drain_unresolved(self):
        with mock.patch.object(runner.subprocess, 'run') as run:
            run.side_effect = [
                SimpleNamespace(returncode=4),  # Local work resumes
                SimpleNamespace(returncode=3),  # New async Graphiti work pending
                SimpleNamespace(returncode=3),  # Still remote unresolved
                SimpleNamespace(returncode=0),  # Finally reconciled
            ]
            with mock.patch.object(runner.time, 'sleep') as sleep:
                self.assertEqual(runner.reconcile_late('/tmp/memory-cli.mjs',
                    'legacy_group','/tmp/state','http://127.0.0.1:8766/mcp',
                    {'GHDEV_MEMORY_POST_EXIT_LEASE':'admitted'},
                    interval_seconds=1,max_seconds=15),0)
            self.assertEqual(run.call_count, 4)
            self.assertEqual(sum('drain' in call.args[0] for call in run.call_args_list),1)
            self.assertEqual(sleep.call_count,2)

    def test_late_reconciliation_keeps_lease_on_unverifiable_remote(self):
        with mock.patch.object(runner.subprocess, 'run') as run:
            run.side_effect = [
                SimpleNamespace(returncode=2),
                SimpleNamespace(returncode=0),
            ]
            with mock.patch.object(runner.time, 'sleep') as sleep:
                self.assertEqual(runner.reconcile_late(
                    '/tmp/curator-cli.mjs', 'cur80_unit',
                    '/tmp/state', 'http://127.0.0.1:8766/mcp',
                    {'GHDEV_MEMORY_POST_EXIT_LEASE': 'admitted'}, interval_seconds=1), 0)
            self.assertEqual(run.call_count, 2)
            sleep.assert_called_once_with(1)

    @mock.patch.object(runner.urllib.request, "urlopen")
    def test_idle_only(self, urlopen):
        urlopen.return_value = http_response("0/0")
        runner.observation(FakeGate, CFG)

    @mock.patch.object(runner.urllib.request, "urlopen")
    def test_busy_running_is_not_downgraded_to_fallback(self, urlopen):
        urlopen.return_value = http_response("1/0")
        with self.assertRaisesRegex(RuntimeError, "scheduler busy"):
            runner.observation(FakeGate, CFG)

    @mock.patch.object(runner.urllib.request, "urlopen")
    def test_busy_waiting(self, urlopen):
        urlopen.return_value = http_response("0/1")
        with self.assertRaisesRegex(RuntimeError, "scheduler busy"):
            runner.observation(FakeGate, CFG)

    @mock.patch.object(runner.urllib.request, "urlopen")
    def test_active_harness_blocks_before_metrics(self, urlopen):
        FakeWorker.active = [{"pid": 1, "comm": "opencode"}]
        with self.assertRaisesRegex(RuntimeError, "harness active"):
            runner.observation(FakeGate, CFG)
        urlopen.assert_not_called()

    @mock.patch.object(runner.urllib.request, "urlopen")
    def test_unavailable_metrics_fail_closed(self, urlopen):
        urlopen.side_effect = OSError("metrics unavailable")
        with self.assertRaisesRegex(RuntimeError, "not verified"):
            runner.observation(FakeGate, CFG)
