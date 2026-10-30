import json
import os
import tempfile
import threading
import time
import unittest
import urllib.request
from dataclasses import replace
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest import mock

from test_gate import config, gate
from test_shared_work import candidate
from shared_work import work_key


def until(predicate, timeout=3):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        if predicate():
            return True
        time.sleep(0.01)
    return False


class Scheduler(BaseHTTPRequestHandler):
    running = 0
    def do_GET(self):
        data = f"ninfer_requests_running {self.running}\nninfer_requests_waiting 0\n".encode()
        self.send_response(200)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
    def log_message(self, *_):
        pass


class DelayedGraphiti:
    def __init__(self, release):
        self.release = release
        self.started = threading.Event()
        self.timeline = []
        self.submissions = 0
    def submit(self, candidate):
        self.submissions += 1
        self.timeline.append(("graph_submitted", time.monotonic()))
        self.started.set()
        return work_key(candidate)
    def poll(self, backend_identity):
        status = "completed" if self.release.is_set() else "queued"
        if status == "queued" and not any(name == "graph_queued" for name, _ in self.timeline):
            self.timeline.append(("graph_queued", time.monotonic()))
        if status == "completed":
            self.timeline.append(("graph_terminal", time.monotonic()))
        return {"backend_identity": backend_identity, "status": status, "persisted": status == "completed"}


class MixedServiceTest(unittest.TestCase):
    def test_disposable_http_scheduler_and_gate_one_owner_timeline(self):
        with tempfile.TemporaryDirectory() as root:
            scheduler = ThreadingHTTPServer(("127.0.0.1", 0), Scheduler)
            scheduler_thread = threading.Thread(target=scheduler.serve_forever, daemon=True)
            scheduler_thread.start()
            cfg = replace(config(root), graphiti_enabled=True, drain_enabled=True,
                          quiet_grace_seconds=0.02, poll_seconds=0.01, task_poll_seconds=0.01,
                          process_names=(), metrics_url=f"http://127.0.0.1:{scheduler.server_port}/metrics")
            db = gate.QueueDB(cfg.database)
            stop = threading.Event()
            release = threading.Event()
            adapter = DelayedGraphiti(release)
            worker = gate.Worker(cfg, db, stop, adapter)
            worker._active_harness_processes = lambda: []
            ov_timeline = []
            def finish_ov(row):
                ov_timeline.append(("ov_started", time.monotonic()))
                db.complete(row)
            worker._process = finish_ov
            server = gate.GateServer(cfg, db, worker)
            server_thread = threading.Thread(target=server.serve_forever, daemon=True)
            worker_thread = threading.Thread(target=worker.run, daemon=True)
            with mock.patch.dict(os.environ, {"OPENVIKING_ROOT_API_KEY": "test-only-key", "GRAPHITI_CAPTURE_TOKEN": "capture-only-key"}):
                server_thread.start()
                worker_thread.start()
                try:
                    req = urllib.request.Request(
                        f"http://127.0.0.1:{server.server_port}/__commit_gate/memory_candidates",
                        data=json.dumps(candidate()).encode(), method="POST",
                        headers={"Authorization": "Bearer capture-only-key", "Content-Type": "application/json"},
                    )
                    with urllib.request.urlopen(req, timeout=2) as response:
                        self.assertEqual(response.status, 202)
                        self.assertEqual(json.load(response)["result"]["status"], "deferred_unverified")
                    # Synthetic coordinator exercise only: no production promotion interface.
                    with db.connect() as conn:
                        conn.execute("UPDATE memory_work SET status='queued'")
                    self.assertTrue(adapter.started.wait(2))
                    Scheduler.running = 1  # Own inference activity after admission.
                    db.enqueue({"account": "a", "user_id": "u", "actor_peer": "p"}, "s-ov", 0, {}, "mixed")
                    time.sleep(0.05)
                    self.assertEqual(ov_timeline, [])
                    self.assertEqual(worker.shared.status()[0]["status"], "processing")
                    release.set()
                    self.assertTrue(until(lambda: worker.shared.status()[0]["status"] == "completed"))
                    self.assertEqual(ov_timeline, [])  # External busy metric still blocks new work.
                    Scheduler.running = 0
                    self.assertTrue(until(lambda: len(ov_timeline) == 1))
                    self.assertLess(adapter.timeline[-1][1], ov_timeline[0][1])
                    self.assertEqual(adapter.submissions, 1)
                    origin = adapter.timeline[0][1]
                    print("MIXED_TIMELINE " + json.dumps({
                        "events_ms": [(name, round((stamp - origin) * 1000, 1)) for name, stamp in adapter.timeline + ov_timeline],
                        "overlap": False, "graph_submissions": adapter.submissions,
                    }))
                finally:
                    stop.set()
                    server.shutdown()
                    scheduler.shutdown()
                    worker_thread.join(2)
                    server_thread.join(2)
                    scheduler_thread.join(2)
                    server.server_close()
                    scheduler.server_close()
                    Scheduler.running = 0


if __name__ == "__main__":
    unittest.main()
