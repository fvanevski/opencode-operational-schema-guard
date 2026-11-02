"""Unit tests for guarded retirement of invalid, never-accepted untenanted pending intents."""
import json
import os
import pathlib
import signal
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from contextlib import closing

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

OWNER = "test-untenanted-owner-001"
PROOF = "2" * 64


def read_rows(path, table):
    with closing(sqlite3.connect(path)) as c:
        c.row_factory = sqlite3.Row
        return [dict(r) for r in c.execute("SELECT * FROM " + table + " ORDER BY rowid")]


def fixture(root):
    db = gate.QueueDB(str(pathlib.Path(root) / "queue.sqlite3"))
    hold.set_hold(db.path, OWNER, 0, True, "fixture hold")
    # Enqueue untenanted pending intent (empty account & user_id)
    scope = {"account": "", "user_id": "", "actor_peer": "filip-cli"}
    db.enqueue(scope, "cx-test-untenanted-1", 6, {"keep_recent_count": 10}, "client")
    # Enqueue a valid tenanted pending intent
    db.enqueue({"account": "garion", "user_id": "filip", "actor_peer": ""}, "oc-valid-pending", 1, {}, "client")
    return db, read_rows(db.path, "intents")[0], read_rows(db.path, "intents")[1]


class TestUntenantedRetirement(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.db, self.untenanted_intent, self.valid_intent = fixture(self.tmp.name)
        self.before = read_rows(self.db.path, "intents")

    def retire(self, intent=None, owner=OWNER, proof=PROOF):
        target = self.untenanted_intent if intent is None else intent
        return hold.retire_untenanted_pending(self.db.path, target, owner=owner, evidence_digest=proof)

    def test_atomic_retirement_and_idempotence(self):
        result = self.retire()
        self.assertEqual(result, "rejected")
        intents = read_rows(self.db.path, "intents")
        retired = intents[0]
        self.assertEqual(retired["state"], "dead")
        self.assertEqual(retired["last_error"], "untenanted_spool_rejected: owner audited")
        # Valid intent remains pending and untouched
        self.assertEqual(intents[1], self.before[1])
        # Rejection audit recorded
        audits = read_rows(self.db.path, "rejection_repairs")
        self.assertEqual(len(audits), 1)
        self.assertEqual(audits[0]["owner"], OWNER)
        self.assertEqual(audits[0]["evidence_digest"], PROOF)

        # Idempotence check
        result2 = self.retire()
        self.assertEqual(result2, "already_rejected")
        self.assertEqual(len(read_rows(self.db.path, "rejection_repairs")), 1)

    def test_refuses_to_retire_valid_tenanted_intent(self):
        with self.assertRaises(hold.Held):
            self.retire(intent=self.valid_intent)
        self.assertEqual(read_rows(self.db.path, "intents"), self.before)

    def test_refuses_when_preimage_drifted(self):
        stale = dict(self.untenanted_intent)
        stale["requested_generation"] = 999
        with self.assertRaises(hold.Held):
            self.retire(intent=stale)
        self.assertEqual(read_rows(self.db.path, "intents"), self.before)

    def test_refuses_when_attempts_exist(self):
        with self.db.connect() as c:
            c.execute(
                "INSERT INTO commit_attempts(request_key,account,user_id,actor_peer,session_id,generation,body_digest,body_json,submitted,resolved) "
                "VALUES('k1','','','filip-cli','cx-test-untenanted-1',6,'digest','{}',0,0)"
            )
        with self.assertRaises(hold.Held):
            self.retire()

    def test_refuses_when_not_held(self):
        hold.set_hold(self.db.path, OWNER, 1, False, "release hold")
        with self.assertRaises(hold.Held):
            self.retire()
        self.assertEqual(read_rows(self.db.path, "intents"), self.before)


if __name__ == "__main__":
    unittest.main()
