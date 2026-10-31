"""CPU-only regression tests for the Issue #70 installed-plugin trace checker."""
from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("verify_fresh_trace.py")


class TraceTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.native = self.root / "native.log"
        self.trace = self.root / "plugin.jsonl"

    def run_check(self, native: str, trace_lines: list[dict] | str):
        self.native.write_text(native)
        self.trace.write_text(
            trace_lines if isinstance(trace_lines, str)
            else "".join(json.dumps(x) + "\n" for x in trace_lines))
        return subprocess.run(
            [sys.executable, str(SCRIPT),
             "--native-log", str(self.native), "--plugin-trace", str(self.trace)],
            capture_output=True, text=True)

    def test_true_native_load_context_and_subscribed_event_pass(self):
        result = self.run_check(
            "2026-10-31 DEBUG loading plugin /.../openviking-v2/index.mjs\n",
            [{"type": "context", "hybridActive": False},
             {"type": "session.execution.succeeded", "session": True}])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("ISSUE70_FRESH_TRACE=PASS", result.stdout)
        payload = json.loads(result.stdout.partition("\n")[2])
        self.assertEqual(payload["context_callbacks"], 1)
        self.assertEqual(payload["subscribed_session_events"], 1)
        self.assertFalse(payload["model_stub_route_verified"])
        self.assertFalse(payload["admission_lease_verified"])

    def test_startup_only_log_cannot_pass(self):
        result = self.run_check("cli starting\n",
            [{"type": "context"}, {"type": "session.idle", "session": True}])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("no native installed", result.stderr)

    def test_loading_without_context_cannot_pass(self):
        result = self.run_check("loading plugin ./openviking-v2/index.mjs\n",
            [{"type": "session.idle", "session": True}])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("no installed openviking-v2 context", result.stderr)

    def test_loading_without_subscription_cannot_pass(self):
        result = self.run_check("loading plugin ./openviking-v2/index.mjs\n",
            [{"type": "context"}, {"type": "session.idle", "session": False}])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("no installed openviking-v2 subscribed", result.stderr)

    def test_malformed_trace_fails_closed(self):
        result = self.run_check("loading plugin ./openviking-v2/index.mjs\n",
            '{"type":"context"}\n{broken}\n')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("invalid JSONL", result.stderr)


if __name__ == "__main__":
    unittest.main()
