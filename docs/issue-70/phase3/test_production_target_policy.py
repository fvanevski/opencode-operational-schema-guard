"""CPU-only tests of explicit production target authorization."""
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

    def test_feature_off_no_runtime(self):
        self.cfg.graphiti_enabled = False
        self.assertEqual(self.build(), (None, None))


if __name__ == "__main__":
    unittest.main()
