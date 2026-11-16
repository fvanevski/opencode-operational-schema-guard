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


    def test_v2_reconcile_continuation_preserves_flags_and_lock_fd(self):
        with mock.patch.object(runner.subprocess, "run") as run:
            run.side_effect = [SimpleNamespace(returncode=4),
                               SimpleNamespace(returncode=0)]
            result = runner.reconcile_late("/tmp/curator-cli.mjs",
                "prospective_v2", "/tmp/staged", "http://127.0.0.1:8766/mcp",
                {"GHDEV_MEMORY_POST_EXIT_LEASE": "admitted",
                 "GHDEV_MEMORY_POST_EXIT_LOCK_FD": "9"},
                lock_fd=9, finite_batch_v2=True)
        self.assertEqual(result, 0)
        self.assertEqual(run.call_count, 2)
        for call in run.call_args_list:
            self.assertEqual(call.kwargs["pass_fds"], (9,))
        self.assertIn("reconcile-only", run.call_args_list[0].args[0])
        resumed = run.call_args_list[1].args[0]
        for option in ("drain", "--finite-batch", "--quote-integrity-v2",
                       "--source-window-recovery", "--max-clusters"):
            self.assertIn(option, resumed)

    def test_scheduler_wait_retries_busy_only_and_remains_fail_closed(self):
        with mock.patch.object(runner, "observation",
                               side_effect=[RuntimeError("scheduler busy (running/waiting nonzero)"),
                                            None]) as observed:
            with mock.patch.object(runner.time, "sleep") as slept:
                runner.wait_for_scheduler_idle(FakeGate, CFG, 180)
            self.assertEqual(observed.call_count, 2)
            slept.assert_called_once()
        with mock.patch.object(runner, "observation",
                               side_effect=RuntimeError("interactive harness active/unknown")):
            with self.assertRaisesRegex(RuntimeError, "harness active"):
                runner.wait_for_scheduler_idle(FakeGate, CFG, 180)
        with mock.patch.object(runner, "observation",
                               side_effect=RuntimeError("scheduler busy (running/waiting nonzero)")):
            with self.assertRaisesRegex(RuntimeError, "scheduler busy"):
                runner.wait_for_scheduler_idle(FakeGate, CFG, 0)


    def test_finite_v2_command_preserves_source_message_isolation(self):
        args = runner.finite_v2_drain_args(True)
        i = args.index("--source-message-isolation")
        self.assertEqual(args[i + 1], "on")
        self.assertEqual(runner.finite_v2_drain_args(False), [])


    def test_finite_v2_command_enables_independently_reviewed_atomic_subspans(self):
        args = runner.finite_v2_drain_args(True)
        i = args.index("--source-subspan-recovery")
        self.assertEqual(args[i + 1], "on")


    def test_versioned_atomic_clause_recovery_is_admitted_only_for_finite_v2(self):
        args = runner.finite_v2_drain_args(True)
        i = args.index("--source-subspan-recovery-v2")
        self.assertEqual(args[i + 1], "on")
        self.assertNotIn("--source-subspan-recovery-v2", runner.finite_v2_drain_args(False))

    def test_issue100_autonomous_flag_is_opt_in_not_implicit(self):
        self.assertEqual(runner.autonomous_curation_args(False), [])
        self.assertEqual(runner.autonomous_curation_args(True),
                         ["--autonomous-curation", "on"])

    def test_issue100_late_local_work_preserves_autonomous_mode_and_ex_fd(self):
        with mock.patch.object(runner.subprocess, "run") as run:
            run.side_effect = [SimpleNamespace(returncode=4),
                               SimpleNamespace(returncode=0)]
            result = runner.reconcile_late("/tmp/curator-cli.mjs",
                "disposable_issue100", "/tmp/disposable-state",
                "http://127.0.0.1:8766/mcp",
                {"GHDEV_MEMORY_POST_EXIT_LEASE":"admitted",
                 "GHDEV_MEMORY_POST_EXIT_LOCK_FD":"9"},
                lock_fd=9, autonomous_curation=True)
        self.assertEqual(result,0)
        self.assertEqual(run.call_count,2)
        for call in run.call_args_list:
            self.assertEqual(call.kwargs["pass_fds"],(9,))
        self.assertNotIn("--autonomous-curation",run.call_args_list[0].args[0])
        resumed=run.call_args_list[1].args[0]
        self.assertEqual(resumed[resumed.index("--autonomous-curation")+1],"on")
        self.assertNotIn("--finite-batch",resumed)

    def test_issue100_wrapper_rejects_incompatible_mode_flags(self):
        with mock.patch.object(runner.sys,"argv",[
            "post-exit-drain.py","--gate-source","/abs/source.py",
            "--gate-config","/abs/gate.toml","--cli","/abs/curator-cli.mjs",
            "--group","test","--state-dir","/tmp/test",
            "--endpoint","http://127.0.0.1:8766/mcp",
            "--finite-batch-v2","--autonomous-curation"]):
            with self.assertRaises(SystemExit) as ctx:
                runner.main()
            self.assertEqual(ctx.exception.code,2)

    def test_issue100_local_technical_retry_releases_ex_after_positive_readback(self):
        # The corrected autonomous-only status distinguishes no-model work
        # from an ambiguous Graphiti submission. A second read-only result 4
        # proves there is still local work but NO remote uncertainty.
        with tempfile.TemporaryDirectory() as td:
            cfg = SimpleNamespace(
                lock_file=str(Path(td) / "agent.lock"), metrics_url="http://127.0.0.1:8002/metrics",
                process_names=["opencode"], quiet_grace_seconds=0,
                metrics_fallback_urls=(), metrics_running="auto",
                metrics_waiting="auto")
            gate=SimpleNamespace(Config=SimpleNamespace(load=lambda _: cfg))
            argv=["post-exit-drain.py","--gate-source","/fake/gate.py",
                  "--gate-config","/fake/gate.toml","--cli",__file__,
                  "--group","disposable","--state-dir",td,
                  "--endpoint","http://127.0.0.1:8766/mcp",
                  "--autonomous-curation"]
            with mock.patch.object(runner,"load_gate",return_value=gate), \\
                 mock.patch.object(runner,"wait_for_scheduler_idle"), \\
                 mock.patch.object(runner,"observation"), \\
                 mock.patch.object(runner.time,"sleep"), \\
                 mock.patch.object(runner.sys,"argv",argv), \\
                 mock.patch.object(runner.subprocess,"run") as child:
                child.side_effect=[SimpleNamespace(returncode=4),
                                   SimpleNamespace(returncode=4)]
                self.assertEqual(runner.main(),4)
                self.assertEqual(child.call_count,2)
                self.assertIn("drain",child.call_args_list[0].args[0])
                self.assertIn("reconcile-only",child.call_args_list[1].args[0])
                self.assertEqual(child.call_args_list[0].kwargs["pass_fds"],
                                 child.call_args_list[1].kwargs["pass_fds"])

    def test_issue100_late_autonomous_technical_retry_does_not_loop(self):
        with mock.patch.object(runner.subprocess,"run") as run:
            run.side_effect=[SimpleNamespace(returncode=4),
                             SimpleNamespace(returncode=4)]
            with mock.patch.object(runner.time,"sleep") as sleep:
                result=runner.reconcile_late("/tmp/curator-cli.mjs",
                    "disposable", "/tmp/private", "http://127.0.0.1:8766/mcp",
                    {"GHDEV_MEMORY_POST_EXIT_LEASE":"admitted"},
                    lock_fd=8, autonomous_curation=True)
            self.assertEqual(result,4)
            self.assertEqual(run.call_count,2)
            sleep.assert_not_called()
