"""Tests for receipt GET reconciliation fencing under durable admission hold.

Verifies that any receipt route /{session}/{request_key} (GET or POST, recover=false or recover=true)
is fenced under admission_hold.publication, preventing durable state mutations while held=1,
while pure read-only binding lookups (/binding/{session}) and health checks remain accessible.
"""
import http.server
import json
import os
import pathlib
import posixpath
import sqlite3
import sys
import tempfile
import threading
import unittest
import urllib.parse
import urllib.request

# Ensure gate modules can be imported
candidate_dirs = [
    pathlib.Path("/tmp/opencode/issue75-direct/integrated-oEAmIHhQ/host-candidate/gate"),
    pathlib.Path(__file__).resolve().parents[6] / "host-candidate" / "gate",
    pathlib.Path("/home/filip/.local/share/openviking-commit-gate"),
]
for d in candidate_dirs:
    if d.is_dir():
        sys.path.insert(0, str(d))
        break

import admission_hold as hold
import openviking_commit_gate as gate


class MockBackendHandler(http.server.BaseHTTPRequestHandler):
    """Mock backend recording received requests and simulating reconcile side effects."""

    def log_message(self, format, *args):
        pass  # suppress stderr logging

    def do_GET(self):
        self.server.requests_log.append(("GET", self.path))
        if self.path.startswith("/api/v1/admin/commit_receipts/binding/"):
            session_id = self.path.split("/")[-1]
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok",
                "result": {
                    "protocol": "gate-owner-binding-v1",
                    "account": "garion",
                    "user_id": "filip",
                    "session_id": session_id
                }
            }).encode())
            return
        elif self.path.startswith("/api/v1/admin/commit_receipts/"):
            # Simulate reconciliation mutating durable receipt state
            self.server.reconcile_call_count += 1
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok",
                "result": {"state": "sealed_terminal", "outcome": "completed"}
            }).encode())
            return
        elif self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        self.server.requests_log.append(("POST", self.path))
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"status":"ok"}')


class TestReceiptHoldFencing(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.db_path = str(pathlib.Path(self.tmp.name) / "queue.sqlite3")

        # Initialize QueueDB and admission hold
        self.db = gate.QueueDB(self.db_path)
        self.owner = "test-fencing-owner-001"
        hold.set_hold(self.db_path, self.owner, 0, True, "initial test hold")

        # Start mock backend server
        self.backend_server = http.server.HTTPServer(("127.0.0.1", 0), MockBackendHandler)
        self.backend_server.requests_log = []
        self.backend_server.reconcile_call_count = 0
        self.backend_port = self.backend_server.server_port
        self.backend_thread = threading.Thread(target=self.backend_server.serve_forever, daemon=True)
        self.backend_thread.start()
        self.addCleanup(self.backend_server.shutdown)

        # Start gate server pointing to mock backend
        from dataclasses import replace
        sys.path.insert(0, str(pathlib.Path(gate.__file__).parent / "tests"))
        from test_gate import config
        self.cfg = replace(
            config(self.tmp.name),
            database=self.db_path,
            backend_host="127.0.0.1",
            backend_port=self.backend_port,
            listen_port=0,
            receipts_enabled=True,
        )
        self.gate_server = gate.GateServer(self.cfg, self.db)
        self.gate_port = self.gate_server.server_address[1]
        self.gate_thread = threading.Thread(target=self.gate_server.serve_forever, daemon=True)
        self.gate_thread.start()
        self.addCleanup(self.gate_server.shutdown)

    def request(self, method, path, headers=None, body=None):
        url = f"http://127.0.0.1:{self.gate_port}{path}"
        req = urllib.request.Request(url, method=method, headers=headers or {})
        try:
            with urllib.request.urlopen(req, data=body) as resp:
                return resp.status, json.loads(resp.read().decode())
        except urllib.error.HTTPError as exc:
            return exc.code, json.loads(exc.read().decode())

    def test_ordinary_receipt_get_blocked_when_hold_active(self):
        # Default GET /api/v1/admin/commit_receipts/{session}/{key} without recover param
        status, body = self.request("GET", "/api/v1/admin/commit_receipts/s1/k1")
        self.assertEqual(status, 503)
        self.assertEqual(body.get("error", {}).get("message"), "durable admission held")
        # Ensure backend was NOT called
        self.assertEqual(self.backend_server.reconcile_call_count, 0)

    def test_receipt_get_variants_blocked_when_hold_active(self):
        variants = [
            "/api/v1/admin/commit_receipts/s1/k1?recover=false",
            "/api/v1/admin/commit_receipts/s1/k1?recover=0",
            "/api/v1/admin/commit_receipts/s1/k1?recover=true",
            "/api/v1/admin/commit_receipts/s1/k1?recover=1",
            "/api/v1/admin/%63ommit_receipts/s1/k1",  # URL-encoded 'c'
            "/api/v1/admin/commit_receipts/s1/k1?recover=%74%72%75%65",  # encoded true
        ]
        for path in variants:
            with self.subTest(path=path):
                status, body = self.request("GET", path)
                self.assertEqual(status, 503, f"Expected 503 for {path}, got {status}")
                self.assertEqual(body.get("error", {}).get("message"), "durable admission held")
        self.assertEqual(self.backend_server.reconcile_call_count, 0)

    def test_receipt_post_blocked_when_hold_active(self):
        status, body = self.request("POST", "/api/v1/admin/commit_receipts/s1/k1", body=b"{}")
        self.assertEqual(status, 503)
        self.assertEqual(body.get("error", {}).get("message"), "durable admission held")
        self.assertEqual(self.backend_server.reconcile_call_count, 0)

    def test_pure_read_only_binding_allowed_when_hold_active(self):
        # Binding lookup does not reconcile and must remain accessible
        status, body = self.request("GET", "/api/v1/admin/commit_receipts/binding/s1")
        self.assertEqual(status, 200)
        self.assertEqual(body.get("result", {}).get("protocol"), "gate-owner-binding-v1")

    def test_health_check_allowed_when_hold_active(self):
        status, body = self.request("GET", "/health")
        self.assertEqual(status, 200)

    def test_receipt_get_allowed_when_hold_released(self):
        # Explicit owner release
        hold.set_hold(self.db_path, self.owner, 1, False, "explicit release for testing")
        status, body = self.request("GET", "/api/v1/admin/commit_receipts/s1/k1")
        self.assertEqual(status, 200)
        self.assertEqual(body.get("result", {}).get("state"), "sealed_terminal")
        self.assertEqual(self.backend_server.reconcile_call_count, 1)


if __name__ == "__main__":
    unittest.main()
