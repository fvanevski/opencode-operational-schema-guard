import importlib.util
import json
import sqlite3
import unittest
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "tools" / "rearm_prehandler_rejection.py"
spec = importlib.util.spec_from_file_location("rearm", MODULE)
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)


def fixture():
    db = sqlite3.connect(":memory:", isolation_level=None)
    db.row_factory = sqlite3.Row
    db.executescript("""
        CREATE TABLE intents(account TEXT, user_id TEXT, actor_peer TEXT, session_id TEXT,
          state TEXT, requested_generation INTEGER, claimed_generation INTEGER,
          processed_generation INTEGER, task_id TEXT, last_error TEXT, commit_body_json TEXT);
        CREATE TABLE commit_attempts(request_key TEXT, account TEXT, user_id TEXT,
          actor_peer TEXT, session_id TEXT, generation INTEGER, body_json TEXT,
          body_digest TEXT, submitted INTEGER, resolved INTEGER);
        CREATE TABLE memory_work(work_key TEXT, status TEXT, attempt_generation INTEGER,
          backend_identity TEXT);
        CREATE TABLE graphiti_ingest_receipts(work_key TEXT);
    """)
    scope = dict(account="", user_id="person", actor_peer="test", session_id="session")
    request = r.digest({"scope": scope, "generation": 1})
    # Unit test uses a fixed synthetic identity, never a production one.
    r.REQUEST_KEY = request
    body = {"keep_recent_count": 0}
    r.BODY_DIGEST = r.digest(body)
    db.execute("INSERT INTO intents VALUES(?,?,?,?,?,?,?,?,?,?,?)", (
        *scope.values(), "unknown", 1, 1, 0, None, "ambiguous backend acknowledgment", json.dumps(body)))
    db.execute("INSERT INTO commit_attempts VALUES(?,?,?,?,?,?,?,?,?,?)", (
        request, *scope.values(), 1, json.dumps(body), r.BODY_DIGEST, 1, 0))
    db.execute("INSERT INTO memory_work VALUES(?,?,?,?)", (r.WORK_KEY, "queued", 0, None))
    return db


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.db = fixture()

    def tearDown(self):
        self.db.close()

    def test_eligible_read_only_does_not_modify(self):
        result = r.inspect(self.db)
        self.assertEqual(result["status"], "ELIGIBLE_FOR_MANUAL_PRE_SUBMIT_REARM")
        self.assertEqual(self.db.execute("SELECT state FROM intents").fetchone()[0], "unknown")
        self.assertEqual(self.db.execute("SELECT submitted FROM commit_attempts").fetchone()[0], 1)

    def test_exact_one_time_rearm_preserves_work(self):
        result = r.rearm(self.db)
        self.assertEqual(result["status"], "REARMED_ORIGINAL_REQUEST")
        self.assertEqual(self.db.execute("SELECT state FROM intents").fetchone()[0], "pending")
        self.assertEqual(self.db.execute("SELECT submitted FROM commit_attempts").fetchone()[0], 0)
        self.assertEqual(self.db.execute("SELECT resolved FROM commit_attempts").fetchone()[0], 0)
        self.assertEqual(self.db.execute("SELECT status FROM memory_work").fetchone()[0], "queued")
        with self.assertRaises(r.RecoveryBlocked): r.rearm(self.db)

    def test_reject_unrelated_unknown(self):
        self.db.execute("INSERT INTO intents VALUES(?,?,?,?,?,?,?,?,?,?,?)", (
            "", "", "", "other", "unknown", 1, 1, 0, None, "ambiguous backend acknowledgment", "{}"))
        with self.assertRaises(r.RecoveryBlocked): r.rearm(self.db)
        self.assertEqual(self.db.execute("SELECT submitted FROM commit_attempts").fetchone()[0], 1)

    def test_reject_claim_with_task(self):
        self.db.execute("UPDATE intents SET task_id='task-id'")
        with self.assertRaises(r.RecoveryBlocked): r.inspect(self.db)

    def test_reject_graphiti_already_started(self):
        self.db.execute("UPDATE memory_work SET status='processing',attempt_generation=1")
        with self.assertRaises(r.RecoveryBlocked): r.rearm(self.db)

    def test_reject_existing_graphiti_receipt(self):
        self.db.execute("INSERT INTO graphiti_ingest_receipts VALUES(?)", (r.WORK_KEY,))
        with self.assertRaises(r.RecoveryBlocked): r.inspect(self.db)

    def test_reject_attempt_identity_mismatch(self):
        self.db.execute("UPDATE commit_attempts SET body_digest=?", ("a"*64,))
        with self.assertRaises(r.RecoveryBlocked): r.inspect(self.db)


if __name__ == "__main__":
    unittest.main()
