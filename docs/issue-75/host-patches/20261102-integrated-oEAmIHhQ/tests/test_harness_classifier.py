import unittest
import tempfile
import pathlib
import sys

gate_root = pathlib.Path(__file__).resolve().parents[1] / "host-candidate/gate"
if not gate_root.is_dir():
    raise RuntimeError("Test requires reconstructed candidate gate")
sys.path.insert(0, str(gate_root))
import openviking_commit_gate as gate


class MockWorker:
    def __init__(self, process_names=("codex", "opencode", "agy", "opencode-desktop")):
        self.cfg = gate.Config(
            listen_host="127.0.0.1",
            listen_port=0,
            backend_host="127.0.0.1",
            backend_port=0,
            metrics_url="",
            lock_file="",
            database="",
            drain_enabled=False,
            quiet_grace_seconds=0,
            poll_seconds=1,
            task_poll_seconds=1,
            task_timeout_seconds=1,
            request_timeout_seconds=1,
            max_commit_body_bytes=1000,
            retry_base_seconds=1,
            retry_max_seconds=1,
            process_names=process_names,
            receipts_enabled=False,
        )


class HarnessClassifierTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.proc_root = pathlib.Path(self.tmp.name)
        self.worker = MockWorker()

    def tearDown(self):
        self.tmp.cleanup()

    def _add_proc(self, pid: int, comm: str, argv: list[str]):
        p = self.proc_root / str(pid)
        p.mkdir(parents=True, exist_ok=True)
        (p / "comm").write_text(comm + "\n", encoding="utf-8")
        raw = b"\0".join(arg.encode("utf-8") for arg in argv) + b"\0" if argv else b""
        (p / "cmdline").write_bytes(raw)

    def test_interactive_codex_is_detected(self):
        self._add_proc(101, "codex", ["codex", "--model", "qwen3.8"])
        matches = gate.Worker._active_harness_processes(self.worker, proc_root=str(self.proc_root))
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]["pid"], 101)
        self.assertEqual(matches[0]["comm"], "codex")

    def test_passive_codex_exec_server_is_exempted(self):
        # ChatGPT desktop application launches codex exec-server as passive background helper
        self._add_proc(102, "codex", ["/usr/lib/chatgpt/resources/codex", "exec-server"])
        matches = gate.Worker._active_harness_processes(self.worker, proc_root=str(self.proc_root))
        self.assertEqual(len(matches), 0, "passive exec-server must be exempted from active harness list")

    def test_passive_codex_app_server_is_exempted(self):
        self._add_proc(103, "codex", ["codex", "app-server"])
        matches = gate.Worker._active_harness_processes(self.worker, proc_root=str(self.proc_root))
        self.assertEqual(len(matches), 0, "passive app-server must be exempted")

    def test_interactive_opencode_is_detected(self):
        self._add_proc(104, "opencode", ["opencode", "run", "implement feature"])
        matches = gate.Worker._active_harness_processes(self.worker, proc_root=str(self.proc_root))
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]["pid"], 104)

    def test_passive_opencode_serve_is_exempted(self):
        self._add_proc(105, "opencode", ["opencode", "serve"])
        matches = gate.Worker._active_harness_processes(self.worker, proc_root=str(self.proc_root))
        self.assertEqual(len(matches), 0, "opencode serve must be exempted")

    def test_interactive_agy_is_detected(self):
        # Antigravity CLI controller is active and commit-capable
        self._add_proc(106, "agy", ["/home/filip/.local/bin/agy", "--dangerously-skip-permissions"])
        matches = gate.Worker._active_harness_processes(self.worker, proc_root=str(self.proc_root))
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]["pid"], 106)
        self.assertEqual(matches[0]["comm"], "agy")

    def test_interactive_antigravity_alias_is_detected(self):
        self._add_proc(107, "antigravity", ["antigravity"])
        matches = gate.Worker._active_harness_processes(self.worker, proc_root=str(self.proc_root))
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]["pid"], 107)

    def test_opencode_desktop_main_is_detected(self):
        self._add_proc(108, "opencode-deskto", ["/opt/OpenCode/opencode-desktop"])
        matches = gate.Worker._active_harness_processes(self.worker, proc_root=str(self.proc_root))
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]["pid"], 108)

    def test_opencode_desktop_electron_helpers_are_exempted(self):
        self._add_proc(109, "opencode-deskto", ["/opt/OpenCode/opencode-desktop", "--type=gpu-process"])
        self._add_proc(110, "opencode-deskto", ["/opt/OpenCode/opencode-desktop", "--type=renderer"])
        self._add_proc(111, "chrome_crashpad", ["/opt/OpenCode/chrome_crashpad_handler"])
        matches = gate.Worker._active_harness_processes(self.worker, proc_root=str(self.proc_root))
        self.assertEqual(len(matches), 0, "Electron helpers and crashpad must be exempted")

    def test_unrelated_processes_are_ignored(self):
        self._add_proc(112, "bash", ["/bin/bash"])
        self._add_proc(113, "python3", ["/usr/bin/python3", "daemon.py"])
        self._add_proc(114, "systemd", ["/lib/systemd/systemd"])
        matches = gate.Worker._active_harness_processes(self.worker, proc_root=str(self.proc_root))
        self.assertEqual(len(matches), 0)

    def test_missing_or_unreadable_proc_fails_closed(self):
        # Missing /proc view must fail closed with unverified status
        matches = gate.Worker._active_harness_processes(self.worker, proc_root="/nonexistent/proc/view")
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]["comm"], "unknown")
        self.assertEqual(matches[0]["command"], "process view unavailable")

    def test_empty_process_names_returns_empty(self):
        worker = MockWorker(process_names=())
        self._add_proc(115, "codex", ["codex"])
        matches = gate.Worker._active_harness_processes(worker, proc_root=str(self.proc_root))
        self.assertEqual(matches, [])


if __name__ == "__main__":
    unittest.main()
