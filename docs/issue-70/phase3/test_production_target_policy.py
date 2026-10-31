"""CPU-only tests of explicit production target authorization."""
import hashlib
import json
import sqlite3
import sys
import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parent.parent
GATE = ROOT / "implementation" / "i1-integrated" / "candidate" / "gate"
sys.path.insert(0, str(GATE))

from graphiti_runtime_bootstrap import build_runtime
from graphiti_process_transport import allowed_group


class FakeDB:
    def __init__(self, path):
        self.path = path

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path)
        db.row_factory = sqlite3.Row
        try:
            yield db
            db.commit()
        finally:
            db.close()


class ProductionTargetTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = Path(tmp.name)
        self.policy_path = root / "policy.json"
        self.policy = {
            "enabled": True, "source_type": "git-record-v1",
            "groups": ["graphiti_live"], "production_activation": True,
            "revision": "production-r1", "categories": ["durable_decision"],
            "workspaces": ["/approved"], "repository": str(root),
            "trusted_ref": "refs/heads/main", "source_prefix": "memory-facts",
        }
        self.cfg = SimpleNamespace(
            graphiti_enabled=True, graphiti_production_approved=True,
            graphiti_runtime_dir=str(ROOT / "phase3"),
            graphiti_source_policy=str(self.policy_path),
            graphiti_core_python=sys.executable, graphiti_group="graphiti_live",
            graphiti_validator_path="", graphiti_validator_sha256="",
            task_timeout_seconds=3,
        )
        self.db = FakeDB(str(root / "test.sqlite3"))

    def build(self):
        self.policy_path.write_text(json.dumps(self.policy))
        return build_runtime(self.cfg, self.db)

    def test_two_operator_opt_ins_required(self):
        self.cfg.graphiti_production_approved = False
        with self.assertRaisesRegex(RuntimeError, "unapproved Graphiti target"):
            self.build()
        self.cfg.graphiti_production_approved = True
        self.policy["production_activation"] = False
        with self.assertRaisesRegex(RuntimeError, "production authorization"):
            self.build()

    def test_exact_policy_group_required(self):
        self.policy["groups"] = ["other_group"]
        with self.assertRaisesRegex(RuntimeError, "one exact authorized"):
            self.build()

    def test_positive_setup_is_lazy_and_scoped(self):
        adapter, resolver = self.build()
        self.assertIsNotNone(resolver)
        client = adapter.client_factory()
        self.assertEqual(client.group, "graphiti_live")
        self.assertTrue(client.production_approved)
        with self.db.connect() as conn:
            self.assertIsNone(conn.execute(
                "SELECT 1 FROM sqlite_master WHERE name='graphiti_ingest_receipts'"
            ).fetchone())

    def test_disposable_cannot_inherit_production_policy(self):
        self.cfg.graphiti_group = "issue70_test"
        self.policy["groups"] = ["issue70_test"]
        with self.assertRaisesRegex(RuntimeError, "disposable qualification"):
            self.build()
        self.cfg.graphiti_production_approved = False
        self.policy["production_activation"] = False
        self.assertIsNotNone(self.build()[0])

    def test_target_syntax_and_default(self):
        for group in ("../graphiti_live", "graphiti/live", "", "g" * 129):
            self.assertFalse(allowed_group(group, production_approved=True))
        self.assertFalse(allowed_group("graphiti_live"))
        self.assertTrue(allowed_group("graphiti_live", production_approved=True))
        self.assertTrue(allowed_group("issue70_test"))

    def test_idle_retry_does_not_create_optional_graphiti_tables(self):
        self.policy["categories"] = ["exclusive_state_transition"]
        validator = self.policy_path.parent / "validator.py"
        validator.write_text("# isolated fixture validator identity\n")
        self.cfg.graphiti_validator_path = str(validator)
        self.cfg.graphiti_validator_sha256 = hashlib.sha256(
            validator.read_bytes()).hexdigest()
        adapter, _ = self.build()
        self.assertTrue(callable(adapter.retry_pending))
        self.assertEqual(adapter.retry_pending(max_items=1), 0)
        with self.db.connect() as conn:
            # The authority singleton must be recorded at startup, but
            # ingestion/results/transition tables remain deferred until work.
            active=conn.execute("""SELECT validator_sha256
                FROM temporal_validator_active WHERE singleton=1""").fetchone()
            self.assertEqual(active["validator_sha256"],
                             self.cfg.graphiti_validator_sha256)
            for table in ("graphiti_ingest_receipts",
                          "temporal_validation_results",
                          "temporal_transition_contracts"):
                self.assertIsNone(conn.execute(
                    "SELECT 1 FROM sqlite_master WHERE name=?", (table,)
                ).fetchone())

    def test_reconfigured_validator_invalidates_old_active_digest_at_boot(self):
        self.policy["categories"] = ["exclusive_state_transition"]
        validator = self.policy_path.parent / "validator.py"
        validator.write_text("# new pinned source identity\n")
        expected = hashlib.sha256(validator.read_bytes()).hexdigest()
        self.cfg.graphiti_validator_path = str(validator)
        self.cfg.graphiti_validator_sha256 = expected
        with self.db.connect() as conn:
            conn.execute("""CREATE TABLE temporal_validator_active(
                singleton INTEGER PRIMARY KEY,
                validator_sha256 TEXT NOT NULL)""")
            conn.execute("INSERT INTO temporal_validator_active VALUES(1,?)",
                         ("a" * 64,))
        adapter, _ = self.build()
        with self.db.connect() as conn:
            observed = conn.execute("""SELECT validator_sha256
                FROM temporal_validator_active WHERE singleton=1""").fetchone()[0]
            self.assertEqual(observed, expected)
            self.assertIsNone(conn.execute("""SELECT 1 FROM sqlite_master
                WHERE name='graphiti_ingest_receipts'""").fetchone())
        # A disabled worker drain must not be needed to revoke the old pin.
        self.assertTrue(callable(adapter.retry_pending))

    def test_overlapping_bootstrap_does_not_resurrect_old_validator(self):
        self.policy["categories"]=["exclusive_state_transition"]
        first=self.policy_path.parent/"validator-a.py"
        first.write_text("# validator A\n")
        sha_a=hashlib.sha256(first.read_bytes()).hexdigest()
        self.cfg.graphiti_validator_path=str(first)
        self.cfg.graphiti_validator_sha256=sha_a
        old_adapter,_=self.build()

        second=self.policy_path.parent/"validator-b.py"
        second.write_text("# validator B\n")
        sha_b=hashlib.sha256(second.read_bytes()).hexdigest()
        self.cfg.graphiti_validator_path=str(second)
        self.cfg.graphiti_validator_sha256=sha_b
        new_adapter,_=self.build()
        with self.db.connect() as conn:
            self.assertEqual(conn.execute("""SELECT validator_sha256 FROM
                temporal_validator_active WHERE singleton=1""").fetchone()[0],sha_b)

        # Force old deferred adapter construction *after* the newer boot.
        # Its schema setup must not select SHA A or restore historical PASS.
        old_adapter._real()
        with self.db.connect() as conn:
            self.assertEqual(conn.execute("""SELECT validator_sha256 FROM
                temporal_validator_active WHERE singleton=1""").fetchone()[0],sha_b)
            # A real gate always owns memory_work; this isolated FakeDB
            # creates the minimal table for the read-only retry join.
            conn.execute("CREATE TABLE memory_work(work_key TEXT PRIMARY KEY,status TEXT)")
            conn.execute("""INSERT INTO temporal_transition_contracts(
                work_key,group_id,contract_json,contract_digest,attestation_digest,
                bound_at) VALUES ('old-work','graphiti_live','{}','old','',0)""")
            conn.execute("""INSERT INTO temporal_validation_results(
                work_key,episode_uuid,contract_digest,state,exit_code,
                disposition,attempts,updated_at,validator_sha256)
                VALUES ('old-work','old-episode','old','done',0,'PASS',1,1,?)""",(sha_a,))
        self.assertEqual(old_adapter._real().ledger.status_for_episode(
            "old-episode","graphiti_live"),"UNVERIFIED")
        self.assertEqual(old_adapter.retry_pending(max_items=1),0)
        new_adapter._real()
        with self.db.connect() as conn:
            self.assertEqual(conn.execute("""SELECT validator_sha256 FROM
                temporal_validator_active WHERE singleton=1""").fetchone()[0],sha_b)

    def test_feature_off_no_runtime(self):
        self.cfg.graphiti_enabled = False
        self.assertEqual(self.build(), (None, None))


if __name__ == "__main__":
    unittest.main()
