import fcntl
import http.client
import importlib.util
import json
import os
import sys
import tempfile
import threading
import time
import unittest
from unittest import mock
from dataclasses import replace
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


MODULE = Path(__file__).parents[1] / "openviking_commit_gate.py"
SPEC = importlib.util.spec_from_file_location("openviking_commit_gate", MODULE)
gate = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
sys.modules[SPEC.name] = gate
SPEC.loader.exec_module(gate)


def config(root: str):
    return gate.Config(
        listen_host="127.0.0.1",
        listen_port=0,
        backend_host="127.0.0.1",
        backend_port=1,
        metrics_url="http://127.0.0.1:1/metrics",
        lock_file=str(Path(root) / "agent.lock"),
        database=str(Path(root) / "queue.sqlite3"),
        drain_enabled=False,
        quiet_grace_seconds=0,
        poll_seconds=0.01,
        task_poll_seconds=0.01,
        task_timeout_seconds=1,
        request_timeout_seconds=1,
        max_commit_body_bytes=65536,
        retry_base_seconds=1,
        retry_max_seconds=10,
        process_names=("codex", "opencode", "agy", "opencode-desktop"),
    )



class QueueTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.cfg = config(self.tmp.name)
        self.db = gate.QueueDB(self.cfg.database)
        self.identity = {"account": "garion", "user_id": "filip", "actor_peer": "codex"}

    def tearDown(self):
        self.tmp.cleanup()

    def test_enqueue_coalesces_and_uses_max_keep_recent(self):
        first = self.db.enqueue(
            self.identity, "session-1", 3, {"keep_recent_count": 3}, "threshold", now=1
        )
        second = self.db.enqueue(
            self.identity,
            "session-1",
            10,
            {"keep_recent_count": 10, "extraction_metadata": {"event": {"tags": ["a=b"]}}},
            "compact",
            now=2,
        )
        rows = self.db.list_rows()
        self.assertEqual(first["intent_id"], second["intent_id"])
        self.assertEqual(rows[0]["requested_generation"], 2)
        self.assertEqual(rows[0]["keep_recent_count"], 10)
        self.assertIn("extraction_metadata", rows[0]["commit_body_json"])
        self.assertEqual(rows[0]["reasons_json"], '["threshold", "compact"]')

    def test_new_generation_survives_inflight_completion(self):
        self.db.enqueue(self.identity, "session-1", 0, {}, "compact", now=1)
        claimed = self.db.claim(self.db.next_ready(now=2))
        self.db.enqueue(self.identity, "session-1", 0, {}, "dispose", now=3)
        self.db.complete(claimed)
        row = self.db.list_rows()[0]
        self.assertEqual(row["processed_generation"], 1)
        self.assertEqual(row["requested_generation"], 2)
        self.assertEqual(row["state"], "pending")

    def test_restart_marks_unidentified_claim_unknown(self):
        self.db.enqueue(self.identity, "session-1", 0, {}, "compact", now=1)
        self.db.claim(self.db.next_ready(now=2))
        self.db.mark_unknown_claims()
        self.assertEqual(self.db.list_rows()[0]["state"], "unknown")

    def test_dead_letter_is_preserved_and_new_intent_revives_it(self):
        self.db.enqueue(self.identity, "missing", 0, {}, "compact", now=1)
        row = self.db.claim(self.db.next_ready(now=2))
        self.db.dead_letter(row, "commit HTTP 404: Session not found")
        dead = self.db.list_rows()[0]
        self.assertEqual(dead["state"], "dead")
        self.assertIn("Session not found", dead["last_error"])
        self.db.enqueue(self.identity, "missing", 1, {}, "new-intent", now=3)
        revived = self.db.list_rows()[0]
        self.assertEqual(revived["state"], "pending")
        self.assertEqual(revived["requested_generation"], 2)

    def test_summary_does_not_expose_session_or_body(self):
        self.db.enqueue(self.identity, "private-session", 3, {"secret": "value"}, "compact")
        summary = self.db.summary()
        self.assertEqual(summary["states"], {"pending": 1})
        self.assertEqual(summary["generation_gap"], 1)
        self.assertNotIn("private-session", json.dumps(summary))
        self.assertNotIn("secret", json.dumps(summary))


class MetricsAndLeaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.cfg = config(self.tmp.name)
        self.db = gate.QueueDB(self.cfg.database)
        self.worker = gate.Worker(self.cfg, self.db, gate.threading.Event())

    def tearDown(self):
        self.tmp.cleanup()

    def test_metrics_sum_all_engines(self):
        payload = """
vllm:num_requests_running{engine="0",model_name="chat"} 1.0
vllm:num_requests_running{engine="1",model_name="chat"} 2.0
vllm:num_requests_waiting{engine="0",model_name="chat"} 4.0
vllm:num_requests_waiting{engine="1",model_name="chat"} 8.0
"""
        self.assertEqual(gate.parse_vllm_metrics(payload), (3.0, 12.0))

    def test_missing_metric_fails_closed(self):
        with self.assertRaises(ValueError):
            gate.parse_vllm_metrics('vllm:num_requests_running{engine="0"} 0')

    def test_shared_lease_blocks_exclusive_worker_lock(self):
        path = Path(self.cfg.lock_file)
        path.touch()
        shared = open(path, "a+")
        fcntl.flock(shared.fileno(), fcntl.LOCK_SH | fcntl.LOCK_NB)
        try:
            self.assertIsNone(self.worker._try_exclusive_lock())
        finally:
            fcntl.flock(shared.fileno(), fcntl.LOCK_UN)
            shared.close()
        exclusive = self.worker._try_exclusive_lock()
        self.assertIsNotNone(exclusive)
        fcntl.flock(exclusive.fileno(), fcntl.LOCK_UN)
        exclusive.close()

    def test_process_fallback_detects_open_harness(self):
        proc = Path(self.tmp.name) / "proc"
        (proc / "123").mkdir(parents=True)
        (proc / "123" / "comm").write_text("opencode\n")
        (proc / "123" / "cmdline").write_bytes(b"/usr/bin/opencode\0")
        self.assertTrue(self.worker._harness_processes_active(str(proc)))
        (proc / "123" / "comm").write_text("unrelated\n")
        self.assertFalse(self.worker._harness_processes_active(str(proc)))

    def test_process_fallback_ignores_persistent_server_helpers(self):
        proc = Path(self.tmp.name) / "proc"
        cases = {
            "123": ("codex\n", b"/usr/bin/codex\0app-server\0"),
            "456": ("codex\n", b"/usr/bin/codex\0-c\0x=y\0app-server\0"),
            "789": ("opencode\n", b"/usr/bin/opencode\0serve\0--port\042013\0"),
        }
        for pid, (comm, cmdline) in cases.items():
            (proc / pid).mkdir(parents=True)
            (proc / pid / "comm").write_text(comm)
            (proc / pid / "cmdline").write_bytes(cmdline)
        self.assertEqual(self.worker._active_harness_processes(str(proc)), [])

    def test_process_fallback_reports_only_interactive_cli(self):
        proc = Path(self.tmp.name) / "proc"
        for pid, comm, cmdline in (
            ("123", "codex\n", b"/usr/bin/codex\0app-server\0"),
            ("456", "opencode\n", b"/usr/bin/opencode\0"),
        ):
            (proc / pid).mkdir(parents=True)
            (proc / pid / "comm").write_text(comm)
            (proc / pid / "cmdline").write_bytes(cmdline)
        matches = self.worker._active_harness_processes(str(proc))
        self.assertEqual([item["pid"] for item in matches], [456])
        self.assertEqual(matches[0]["comm"], "opencode")

    def test_process_fallback_detects_opencode_desktop(self):
        proc = Path(self.tmp.name) / "proc"
        cases = {
            "100": ("opencode.AppIma\n", b"/opt/AppImage/opencode.AppImage\0"),
            "101": ("ai.opencode.des\n", b"/tmp/.mount_openco/ai.opencode.desktop\0"),
            "102": ("opencode-deskto\n", b"/usr/bin/opencode-desktop\0"),
        }
        for pid, (comm, cmdline) in cases.items():
            (proc / pid).mkdir(parents=True)
            (proc / pid / "comm").write_text(comm)
            (proc / pid / "cmdline").write_bytes(cmdline)
        matches = self.worker._active_harness_processes(str(proc))
        self.assertEqual([item["pid"] for item in matches], [100, 101, 102])

    def test_process_fallback_ignores_electron_helpers(self):
        proc = Path(self.tmp.name) / "proc"
        cases = {
            "200": ("ai.opencode.des\n", b"/tmp/.mount_openco/ai.opencode.desktop --type=zygote\0"),
            "201": ("ai.opencode.des\n", b"/tmp/.mount_openco/ai.opencode.desktop --type=gpu-process\0"),
            "202": ("ai.opencode.des\n", b"/tmp/.mount_openco/ai.opencode.desktop --type=renderer\0"),
            "203": ("chrome_crashpad\n", b"/tmp/.mount_openco/chrome_crashpad_handler\0"),
            "204": ("ai.opencode.des\n", b"/tmp/.mount_openco/ai.opencode.desktop\0"),
        }
        for pid, (comm, cmdline) in cases.items():
            (proc / pid).mkdir(parents=True)
            (proc / pid / "comm").write_text(comm)
            (proc / pid / "cmdline").write_bytes(cmdline)
        matches = self.worker._active_harness_processes(str(proc))
        self.assertEqual([item["pid"] for item in matches], [204])
        self.assertEqual(matches[0]["comm"], "ai.opencode.des")

    def test_worker_dead_letters_missing_session(self):
        identity = {"account": "garion", "user_id": "filip", "actor_peer": "codex"}
        self.db.enqueue(identity, "missing", 0, {}, "compact")
        row = self.db.claim(self.db.next_ready())
        with mock.patch.object(
            gate, "json_request", return_value=(404, {"error": "Session not found"})
        ):
            self.worker._process(row)
        stored = self.db.list_rows()[0]
        self.assertEqual(stored["state"], "dead")
        self.assertEqual(stored["attempts"], 1)



class FakeBackendHandler(BaseHTTPRequestHandler):
    commits = []

    def log_message(self, fmt, *args):
        pass

    def do_GET(self):
        if self.path == "/metrics":
            data = (
                'vllm:num_requests_running{engine="0",model_name="chat"} 0.0\n'
                'vllm:num_requests_waiting{engine="0",model_name="chat"} 0.0\n'
            ).encode()
            content_type = "text/plain"
        elif self.path == "/health":
            data = json.dumps({"status": "ok", "backend": True}).encode()
            content_type = "application/json"
        elif self.path == "/api/v1/tasks/task-1":
            data = json.dumps({"status": "ok", "result": {"status": "completed"}}).encode()
            content_type = "application/json"
        else:
            data = b"{}"
            content_type = "application/json"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        body = json.loads(self.rfile.read(length) or b"{}")
        self.__class__.commits.append((self.path, body, dict(self.headers)))
        data = json.dumps(
            {"status": "ok", "result": {"status": "accepted", "task_id": "task-1"}}
        ).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


class GatewayIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        FakeBackendHandler.commits = []
        self.backend = ThreadingHTTPServer(("127.0.0.1", 0), FakeBackendHandler)
        self.backend_thread = threading.Thread(target=self.backend.serve_forever, daemon=True)
        self.backend_thread.start()
        base = config(self.tmp.name)
        self.cfg = replace(
            base,
            backend_port=self.backend.server_address[1],
            metrics_url=f"http://127.0.0.1:{self.backend.server_address[1]}/metrics",
        )
        self.db = gate.QueueDB(self.cfg.database)

    def tearDown(self):
        self.backend.shutdown()
        self.backend.server_close()
        self.backend_thread.join(timeout=2)
        self.tmp.cleanup()

    def test_commit_is_intercepted_and_normal_health_is_proxied(self):
        server = gate.GateServer(self.cfg, self.db)
        self.assertGreaterEqual(server.request_queue_size, 128)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            port = server.server_address[1]
            conn = http.client.HTTPConnection("127.0.0.1", port, timeout=2)
            body = json.dumps(
                {"keep_recent_count": 7, "extraction_metadata": {"event": {"tags": ["x=y"]}}}
            )
            conn.request(
                "POST",
                "/api/v1/sessions/session-1/commit",
                body=body,
                headers={
                    "Content-Type": "application/json",
                    "X-OpenViking-Account": "garion",
                    "X-OpenViking-User": "filip",
                    "X-OpenViking-Actor-Peer": "codex",
                },
            )
            response = conn.getresponse()
            payload = json.loads(response.read())
            self.assertEqual(response.status, 200)
            self.assertEqual(payload["result"]["status"], "queued")
            self.assertEqual(FakeBackendHandler.commits, [])
            self.assertIn("extraction_metadata", self.db.list_rows()[0]["commit_body_json"])
            conn.close()

            conn = http.client.HTTPConnection("127.0.0.1", port, timeout=2)
            conn.request("GET", "/health")
            response = conn.getresponse()
            payload = json.loads(response.read())
            self.assertEqual(response.status, 200)
            self.assertTrue(payload["backend"])
            conn.close()
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

    def test_worker_submits_once_and_waits_for_terminal_task(self):
        identity = {"account": "garion", "user_id": "filip", "actor_peer": "codex"}
        self.db.enqueue(identity, "session-1", 4, {"keep_recent_count": 4}, "compact")
        worker_cfg = replace(
            self.cfg,
            drain_enabled=True,
            quiet_grace_seconds=0,
            process_names=(),
        )
        worker = gate.Worker(worker_cfg, self.db, threading.Event())
        old_key = os.environ.get("OPENVIKING_ROOT_API_KEY")
        os.environ["OPENVIKING_ROOT_API_KEY"] = "test-key"
        try:
            self.assertFalse(worker.tick())
            self.assertTrue(worker.tick())
        finally:
            if old_key is None:
                os.environ.pop("OPENVIKING_ROOT_API_KEY", None)
            else:
                os.environ["OPENVIKING_ROOT_API_KEY"] = old_key
        self.assertEqual(len(FakeBackendHandler.commits), 1)
        self.assertEqual(FakeBackendHandler.commits[0][1]["keep_recent_count"], 4)
        row = self.db.list_rows()[0]
        self.assertEqual(row["state"], "complete")
        self.assertEqual(row["processed_generation"], 1)


if __name__ == "__main__":
    unittest.main()
