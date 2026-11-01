"""CPU-only regression checks of the exact Central-owned receipt corrections."""
import ast
from dataclasses import dataclass
import os
from pathlib import Path
import sqlite3
import sys
from types import ModuleType, SimpleNamespace
from unittest import TestCase, main, mock

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE / "tools"))
import build_receipt_corrections as source

class TestPurePatch(TestCase):
    def test_old_gate_fragment_unique(self):
        original = "def x():\n" + source.GATE_BEFORE + "    return api_key\n"
        changed = source.replace_once(original, source.GATE_BEFORE, source.GATE_AFTER, "gate")
        self.assertIn("self.cfg.receipts_enabled", changed)

    def test_old_backend_fragment_unique(self):
        original = "def x(scope,session_id):\n" + source.BACKEND_BEFORE + '            or False):\n        pass\n'
        changed = source.replace_once(original, source.BACKEND_BEFORE, source.BACKEND_AFTER, "backend")
        self.assertIn('k == "actor_peer"', changed)

    def test_wrong_context_rejected(self):
        with self.assertRaises(ValueError):
            source.replace_once("pass\n", source.GATE_BEFORE, source.GATE_AFTER, "gate")

    def test_repeat_is_rejected(self):
        with self.assertRaises(ValueError):
            source.replace_once(source.GATE_BEFORE * 2, source.GATE_BEFORE, source.GATE_AFTER, "gate")

    def test_pinned_hash_guard(self):
        with self.assertRaisesRegex(ValueError, "installed source SHA-256 mismatch"):
            source.prepare(b"x", b"y")

def function_from_ast(tree, name):
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            node = ast.fix_missing_locations(node)
            node.decorator_list = []
            return node
    raise AssertionError(f"{name} is absent")

class TestCandidateBehavior(TestCase):
    @classmethod
    def setUpClass(cls):
        path = os.getenv("GRAPHITI_RECEIPT_CORRECTIONS_DIR")
        if not path:
            raise __import__("unittest").SkipTest("set GRAPHITI_RECEIPT_CORRECTIONS_DIR to scratch candidate output")
        root = Path(path)
        cls.gate = ast.parse((root / "openviking_commit_gate.py").read_text())
        cls.backend = ast.parse((root / "sessions.py").read_text())

    def test_gate_credential_role_for_each_mode(self):
        fn = function_from_ast(self.gate, "_auth_headers")
        scope = {"os": os, "sqlite3": sqlite3}
        exec(compile(ast.fix_missing_locations(ast.Module(body=[fn], type_ignores=[])), "<gate-auth>", "exec"), scope)
        headers = scope["_auth_headers"]
        row = {"account": "a", "user_id": "u", "actor_peer": ""}
        with mock.patch.dict(os.environ,
                             {"OPENVIKING_API_KEY": "tenant-fixture", "OPENVIKING_ROOT_API_KEY": "root-fixture"}):
            receipt = headers(SimpleNamespace(cfg=SimpleNamespace(receipts_enabled=True)), row)
            legacy = headers(SimpleNamespace(cfg=SimpleNamespace(receipts_enabled=False)), row)
        self.assertEqual(receipt["Authorization"], "Bearer root-fixture")
        self.assertEqual(legacy["Authorization"], "Bearer tenant-fixture")
        self.assertNotIn("X-OpenViking-Actor-Peer", receipt)

    def test_missing_role_key_fails_closed(self):
        fn = function_from_ast(self.gate, "_auth_headers")
        scope = {"os": os, "sqlite3": sqlite3}
        exec(compile(ast.fix_missing_locations(ast.Module(body=[fn], type_ignores=[])), "<gate-auth>", "exec"), scope)
        with mock.patch.dict(os.environ, {"OPENVIKING_API_KEY": "tenant-fixture"}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "ROOT_API_KEY"):
                scope["_auth_headers"](SimpleNamespace(cfg=SimpleNamespace(receipts_enabled=True)),
                                        {"account": "a", "user_id": "u", "actor_peer": ""})

    def test_empty_actor_peer_is_allowed_but_nonempty_mismatch_rejected(self):
        fn = function_from_ast(self.backend, "_receipt_owner")
        class HTTPException(Exception):
            def __init__(self, code, message):
                self.status_code = code
                super().__init__(message)
        class Role:
            ROOT = "ROOT"
        @dataclass
        class UserIdentifier:
            account_id: str
            user_id: str
        @dataclass
        class Ctx:
            role: str
            account_id: str
            user: UserIdentifier
            actor_peer_id: str | None = None
        fake_module = ModuleType("openviking_cli.session.user_id")
        fake_module.UserIdentifier = UserIdentifier
        fake_session = ModuleType("openviking_cli.session")
        fake_session.__path__ = []
        fake_root = ModuleType("openviking_cli")
        fake_root.__path__ = []
        scope = {"Role": Role, "HTTPException": HTTPException}
        exec(compile(ast.fix_missing_locations(ast.Module(body=[fn], type_ignores=[])), "<receipt-owner>", "exec"), scope)
        request = SimpleNamespace(
            headers={}, app=SimpleNamespace(state=SimpleNamespace(config=SimpleNamespace(auth_mode="api_key")))
        )
        ctx = Ctx("ROOT", "a", UserIdentifier("a", "u"), None)
        with mock.patch.dict(sys.modules, {"openviking_cli": fake_root,
                        "openviking_cli.session": fake_session,
                        "openviking_cli.session.user_id": fake_module}):
            record = {"account": "a", "user_id": "u", "actor_peer": "", "session_id": "s"}
            valid = scope["_receipt_owner"](request, ctx, "s", record)
            self.assertIsNone(valid.actor_peer_id)
            self.assertEqual(valid.user.user_id, "u")
            for bad in [{**record, "actor_peer": "other"},
                        {**record, "account": ""}, {**record, "user_id": ""},
                        {**record, "session_id": ""}, {**record, "actor_peer": "x" * 257}]:
                with self.subTest(bad=bad), self.assertRaises(HTTPException):
                    scope["_receipt_owner"](request, ctx, "s", bad)
            with self.assertRaises(HTTPException):
                scope["_receipt_owner"](request, Ctx("ADMIN", "a", UserIdentifier("a", "u")), "s", record)
            request.headers["X-OpenViking-Actor-Peer"] = "p"
            record["actor_peer"] = "p"
            accepted = scope["_receipt_owner"](request, ctx, "s", record)
            self.assertEqual(accepted.user.user_id, "u")

if __name__ == "__main__":
    main()
