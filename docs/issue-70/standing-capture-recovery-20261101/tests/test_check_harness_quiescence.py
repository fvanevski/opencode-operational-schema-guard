"""Read-only host process guard regression tests."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1] / "tools" / "check_harness_quiescence.py"
spec = importlib.util.spec_from_file_location("check_harness_quiescence", SOURCE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class CheckHarnessTests(unittest.TestCase):
    def proc(self, root, pid, comm, *args):
        folder = Path(root) / str(pid)
        folder.mkdir()
        (folder / "comm").write_text(comm + "\n")
        (folder / "cmdline").write_bytes(b"\0".join(a.encode() for a in args) + b"\0")

    def test_codex_app_server_ignored(self):
        self.assertEqual(module.classify("codex", ["codex", "app-server"]), "helper")
    def test_codex_exec_and_interactive_block(self):
        for args in (["codex", "exec"], ["codex"], ["codex", "resume"]):
            self.assertEqual(module.classify("codex", args), "active")
    def test_opencode_serve_ignored(self):
        self.assertEqual(module.classify("opencode", ["opencode", "serve"]), "helper")
    def test_agy_active_and_empty_unknown(self):
        self.assertEqual(module.classify("agy", ["agy", "--prompt-interactive"]), "active")
        self.assertEqual(module.classify("codex", []), "unknown")
    def test_electron_helper_ignored(self):
        self.assertEqual(module.classify("opencode-desktop", ["desktop", "--type=renderer"]), "helper")
    def test_proc_scope(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.proc(tmp, 100, "codex", "codex", "app-server")
            self.proc(tmp, 102, "opencode", "opencode", "serve")
            result = module.inspect(Path(tmp))
            self.assertEqual(result["result"], "NO_INTERACTIVE_AGENT_IDENTIFIED")
            self.assertEqual(result["ignored_noninteractive_helpers"], 2)
            self.proc(tmp, 103, "codex", "codex", "exec")
            result = module.inspect(Path(tmp))
            self.assertEqual(result["result"], "BLOCKED")
            self.assertEqual(result["active"][0]["pid"], 103)
    def test_empty_cmdline_blocks(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.proc(tmp, 101, "codex")
            result = module.inspect(Path(tmp))
            self.assertEqual(result["result"], "BLOCKED")
            self.assertEqual(result["unknown"][0]["pid"], 101)

if __name__ == "__main__":
    unittest.main()
