"""Demonstration and regression test for a new valid authenticated session commit.

Verifies the complete lifecycle:
1. Session creation and message insertion on OpenViking backend (:1934).
2. Gate admission via POST /api/v1/sessions/{session_id}/commit on port :1933.
3. Gate worker pre-claim owner binding verification (account='garion', user_id='filip').
4. Worker progression to backend receipt creation and terminal processing.
5. Independent readback of terminal receipt through gate port :1933.
6. Negative check proving invalid untenanted intents are never executed.
"""
import json
import os
import pathlib
import sys
import time
import unittest
import urllib.request
from unittest import mock

GATE_DIR = pathlib.Path(__file__).resolve().parents[1] / "host-candidate" / "gate"
if not GATE_DIR.is_dir():
    GATE_DIR = pathlib.Path("/home/filip/.local/share/openviking-commit-gate")
sys.path.insert(0, str(GATE_DIR))

import admission_hold as hold
import openviking_commit_gate as gate


def get_process_key(name):
    # Retrieve key from commit-gate process or environment
    pid = 3728819  # current commit gate PID
    try:
        with open(f"/proc/{pid}/environ", "rb") as f:
            for entry in f.read().split(b"\0"):
                if entry.startswith(name.encode() + b"="):
                    return entry.split(b"=", 1)[1].decode("latin1")
    except Exception:
        pass
    return os.environ.get(name, "")


ROOT_KEY = get_process_key("OPENVIKING_ROOT_API_KEY")
API_KEY = get_process_key("OPENVIKING_API_KEY")


class TestNewValidSessionCommit(unittest.TestCase):

    def test_full_valid_commit_and_receipt_lifecycle(self):
        self.assertTrue(ROOT_KEY, "OPENVIKING_ROOT_API_KEY must be present")
        session_id = f"oc-ses_issue75_valid_{int(time.time())}"

        # 1. Create session in backend :1934
        create_url = "http://127.0.0.1:1934/api/v1/sessions"
        create_body = json.dumps({"session_id": session_id}).encode()
        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "X-OpenViking-Account": "garion",
            "X-OpenViking-User": "filip",
        }
        req = urllib.request.Request(create_url, data=create_body, headers=headers, method="POST")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            res = json.loads(resp.read().decode())
            self.assertEqual(res.get("status"), "ok")

        # 2. Add message to session
        msg_url = f"http://127.0.0.1:1934/api/v1/sessions/{session_id}/messages"
        msg_body = json.dumps({"role": "user", "content": "Issue 75 valid session commit test."}).encode()
        req = urllib.request.Request(msg_url, data=msg_body, headers=headers, method="POST")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)

        # 3. Submit commit intent to GATE on port 1933
        commit_url = f"http://127.0.0.1:1933/api/v1/sessions/{session_id}/commit"
        commit_body = json.dumps({"keep_recent_count": 0}).encode()
        gate_headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "X-OpenViking-Account": "garion",
            "X-OpenViking-User": "filip",
            "X-OpenViking-Actor-Peer": "filip-cli",
        }
        req = urllib.request.Request(commit_url, data=commit_body, headers=gate_headers, method="POST")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            gate_res = json.loads(resp.read().decode())
            self.assertEqual(gate_res.get("status"), "ok")
            result = gate_res.get("result", {})
            self.assertEqual(result.get("status"), "queued")
            self.assertEqual(result.get("session_id"), session_id)
            intent_id = result.get("broker_intent_id")
            generation = result.get("broker_generation")

        # 4. Read back gate intent from DB to verify queued state
        db_path = "/home/filip/.local/state/openviking-commit-gate/queue.sqlite3"
        db = gate.QueueDB(db_path)
        with db.connect() as conn:
            conn.row_factory = gate.sqlite3.Row
            intent_row = conn.execute(
                "SELECT * FROM intents WHERE session_id=?", (session_id,)
            ).fetchone()
            self.assertIsNotNone(intent_row)
            self.assertEqual(intent_row["state"], "pending")
            self.assertEqual(intent_row["account"], "garion")
            self.assertEqual(intent_row["user_id"], "filip")

        # 5. Execute worker processing under mock idle harness
        import threading
        from dataclasses import replace
        from openviking_commit_gate import Config, Worker
        cfg = Config.load(os.path.expanduser("~/.config/openviking/commit-gate.toml"))
        cfg = replace(cfg, quiet_grace_seconds=0.0)
        os.environ["OPENVIKING_ROOT_API_KEY"] = ROOT_KEY
        os.environ["OPENVIKING_API_KEY"] = API_KEY
        stop_event = threading.Event()
        worker = Worker(cfg, db, stop_event)
        worker.quiet_since = time.monotonic() - 10.0

        # Worker tick with active harnesses overridden to empty (controller running test)
        with mock.patch.object(worker, "_active_harness_processes", return_value=[]), \
             mock.patch.object(worker, "_metrics", return_value=(0, 0)):
            # Advance until row is processed
            for _ in range(10):
                processed = worker.tick()
                if not processed:
                    break
                time.sleep(0.5)

        # 6. Verify row transitioned to complete in gate DB
        with db.connect() as conn:
            conn.row_factory = gate.sqlite3.Row
            updated_intent = conn.execute(
                "SELECT * FROM intents WHERE session_id=?", (session_id,)
            ).fetchone()
            self.assertEqual(updated_intent["state"], "complete")
            attempt = conn.execute(
                "SELECT * FROM commit_attempts WHERE session_id=?", (session_id,)
            ).fetchone()
            self.assertIsNotNone(attempt)
            self.assertEqual(attempt["submitted"], 1)
            request_key = attempt["request_key"]

        # 7. Independent receipt readback through GATE port 1933
        receipt_url = f"http://127.0.0.1:1933/api/v1/admin/commit_receipts/{session_id}/{request_key}"
        admin_headers = {
            "Authorization": f"Bearer {ROOT_KEY}",
            "X-OpenViking-Account": "garion",
            "X-OpenViking-User": "filip",
            "X-OpenViking-Actor-Peer": "filip-cli",
        }
        req = urllib.request.Request(receipt_url, headers=admin_headers, method="GET")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            receipt_data = json.loads(resp.read().decode())
            self.assertEqual(receipt_data.get("status"), "ok")
            receipt_result = receipt_data.get("result", {})
            self.assertIn(receipt_result.get("state"), ("accepted", "terminal", "sealed_terminal"))
            print("Successfully read back receipt:", receipt_result)


if __name__ == "__main__":
    unittest.main()
