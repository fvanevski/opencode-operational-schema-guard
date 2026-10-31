"""Service-backed contract tests, loopback ephemeral ports and disposable DB."""
import copy
import fcntl
import http.client
import json
import os
import tempfile
import threading
import unittest
from dataclasses import replace
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest import mock

from test_gate import gate, config
from test_shared_work import candidate


class Backend(BaseHTTPRequestHandler):
    def log_message(self, *_): pass
    def reply(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers(); self.wfile.write(data)
    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length", 0)))
        self.server.posts += 1
        self.server.events.append("archive-published")
        # Faithful installed contract: failure after publication carries task identity.
        if getattr(self.server, "lose_identity", False):
            self.server.publication_pending = True
            self.reply(503, {"status": "error"})
            return
        self.reply(500, {"status": "error", "error": {"code": "INTERNAL", "details": {"task_id": "task-recovered", "archived": True, "stage": "queue_enqueue"}}})
    def do_GET(self):
        if self.path == "/metrics":
            data = f"ninfer_requests_running {self.server.running}\nninfer_requests_waiting 0\n".encode()
            self.send_response(200); self.send_header("Content-Length", str(len(data))); self.end_headers(); self.wfile.write(data)
        elif self.path.startswith("/api/v1/tasks?"):
            self.reply(200, {"status": "ok", "result": [{"task_id": "external"}] if self.server.external else []})
        elif self.path == "/api/v1/tasks/task-recovered":
            self.server.events.append("poll")
            self.reply(200 if self.server.terminal else 503, {"result": {"status": "completed"}} if self.server.terminal else {"status": "error"})
        else: self.reply(404, {})


class ServiceCorrections(unittest.TestCase):
    def test_post_side_effect_error_restart_competing_lease_and_known_task(self):
        with tempfile.TemporaryDirectory() as root:
            backend = ThreadingHTTPServer(("127.0.0.1", 0), Backend)
            backend.posts = 0; backend.events = []; backend.running = 0; backend.external = False; backend.terminal = False
            thread = threading.Thread(target=backend.serve_forever, daemon=True); thread.start()
            cfg = replace(config(root), backend_port=backend.server_port, drain_enabled=True, process_names=(), metrics_url=f"http://127.0.0.1:{backend.server_port}/metrics")
            db = gate.QueueDB(cfg.database)
            db.enqueue({"account": "a", "user_id": "u", "actor_peer": "p"}, "ov", 0, {}, "service")
            try:
                with mock.patch.dict(os.environ, {"OPENVIKING_ROOT_API_KEY": "disposable-root"}):
                    worker = gate.Worker(cfg, db, threading.Event())
                    self.assertFalse(worker.tick()); self.assertTrue(worker.tick())
                    self.assertEqual(db.inflight()["task_id"], "task-recovered")
                    self.assertEqual(backend.posts, 1)
                    db.mark_unknown_claims()
                    restarted = gate.Worker(cfg, gate.QueueDB(cfg.database), threading.Event())
                    with open(cfg.lock_file, "a+") as interactive:
                        fcntl.flock(interactive, fcntl.LOCK_SH | fcntl.LOCK_NB)
                        before = list(backend.events)
                        self.assertFalse(restarted.tick()); self.assertEqual(backend.events, before)
                        fcntl.flock(interactive, fcntl.LOCK_UN)
                    backend.running = 1; backend.terminal = True
                    self.assertTrue(restarted.tick())
                    self.assertEqual(backend.posts, 1)
                    self.assertEqual(db.list_rows()[0]["state"], "complete")
                    print("RECOVERY_SERVICE " + json.dumps({"events": backend.events, "commit_posts": backend.posts, "terminal": "complete"}))
            finally:
                backend.shutdown(); thread.join(2); backend.server_close()

    def test_publication_gap_demonstrates_unavailable_quiescence_and_blocks_admission(self):
        with tempfile.TemporaryDirectory() as root:
            backend = ThreadingHTTPServer(("127.0.0.1", 0), Backend)
            backend.posts = 0; backend.events = []; backend.running = 0; backend.external = False
            backend.lose_identity = True; backend.publication_pending = False
            thread = threading.Thread(target=backend.serve_forever, daemon=True); thread.start()
            cfg = replace(config(root), backend_port=backend.server_port, drain_enabled=True, process_names=(), metrics_url=f"http://127.0.0.1:{backend.server_port}/metrics")
            db = gate.QueueDB(cfg.database)
            identity = {"account": "a", "user_id": "u", "actor_peer": "p"}
            db.enqueue(identity, "ambiguous", 0, {}, "service")
            worker = gate.Worker(cfg, db, threading.Event())
            try:
                with mock.patch.dict(os.environ, {"OPENVIKING_ROOT_API_KEY": "disposable-root"}):
                    self.assertFalse(worker.tick()); self.assertTrue(worker.tick())
                    self.assertEqual(db.list_rows()[0]["state"], "unknown")
                    db.enqueue(identity, "independent", 0, {}, "service")
                    # Actual installed ordering: publication exists but task
                    # registration and scheduler occupancy have not begun yet.
                    self.assertTrue(backend.publication_pending)
                    code, listing = gate.json_request("GET", f"http://127.0.0.1:{backend.server_port}/api/v1/tasks?status=pending")
                    self.assertEqual(listing["result"], [])
                    self.assertEqual(worker._metrics(), (0, 0))
                    self.assertFalse(worker.tick())
                    backend.running = 1  # Delayed registration/extraction may now start.
                    self.assertFalse(worker.tick())
                    self.assertEqual(backend.posts, 1)
                    self.assertEqual(db.list_rows()[1]["state"], "pending")
                    print("QUIESCENCE_GAP_SERVICE " + json.dumps({"publication_pending": True, "task_list_empty": True, "initial_metrics": [0, 0], "independent_admitted": False, "commit_posts": backend.posts}))
            finally:
                backend.shutdown(); thread.join(2); backend.server_close()

    def test_bounded_capture_credential_conflict_and_source_authority_routes(self):
        with tempfile.TemporaryDirectory() as root:
            cfg = replace(config(root), graphiti_enabled=True)
            db = gate.QueueDB(cfg.database)
            worker = gate.Worker(cfg, db, threading.Event())
            server = gate.GateServer(cfg, db, worker)
            thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
            def request(method, path, token, body=None):
                conn = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=2)
                conn.request(method, path, body=json.dumps(body) if body is not None else None, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
                response = conn.getresponse(); result = response.status, json.loads(response.read()); conn.close(); return result
            try:
                with mock.patch.dict(os.environ, {"OPENVIKING_ROOT_API_KEY": "root-only", "GRAPHITI_CAPTURE_TOKEN": "capture-only"}):
                    path = "/__commit_gate/memory_candidates"
                    self.assertEqual(request("POST", path, "root-only", candidate())[0], 401)
                    self.assertEqual(request("GET", "/__commit_gate/queue", "capture-only")[0], 401)
                    self.assertEqual(request("POST", "/api/v1/sessions/forbidden/commit", "capture-only", {})[0], 401)
                    self.assertEqual(request("POST", "/api/v1/sessions", "capture-only", {})[0], 401)
                    self.assertEqual(db.list_rows(), [])
                    first = request("POST", path, "capture-only", candidate())
                    self.assertEqual(first[0], 202); self.assertEqual(first[1]["result"]["status"], "deferred_unverified")
                    replay = candidate(); replay["logical_digest"] = "f" * 64
                    self.assertEqual(request("POST", path, "capture-only", replay), first)
                    replay["fact_ref"] = "repo:contradiction"
                    conflict = request("POST", path, "capture-only", replay)
                    self.assertEqual(conflict[0], 409); self.assertEqual(conflict[1]["error"]["code"], "source_event_conflict")
                    verified = candidate(); verified["authority"]["basis"] = "source_verified"
                    authority = request("POST", path, "capture-only", verified)
                    self.assertEqual(authority[0], 422); self.assertEqual(authority[1]["error"]["code"], "source_authority_unavailable")
                    self.assertIsNone(worker.shared.ready())
                    with mock.patch.dict(os.environ, {"GRAPHITI_CAPTURE_TOKEN": "root-only"}):
                        self.assertEqual(request("POST", path, "root-only", candidate())[0], 401)
            finally:
                server.shutdown(); thread.join(2); server.server_close()


if __name__ == '__main__': unittest.main()
