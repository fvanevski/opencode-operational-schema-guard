"""Issue 70: durable OpenViking commit receipt core (disabled until integrated).

Backend-owned storage and conservative gate parsing. This file is not an HTTP
endpoint and does not itself attest to QueueFS quiescence or launch shims.
"""
from __future__ import annotations

import hashlib
import os
from contextlib import contextmanager
import json
import sqlite3
from pathlib import Path
from typing import Any, Mapping

PROTOCOL = "openviking-commit-receipt-v1"
TERMINAL = frozenset(("completed", "failed", "cancelled", "skipped"))


class ReceiptConflict(ValueError):
    pass


def canonical_digest(body: Mapping[str, Any]) -> str:
    return hashlib.sha256(json.dumps(body, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


def request_key(identity: Mapping[str, Any], claimed_generation: int) -> str:
    """Bind only immutable claimed generation + scope, not mutable retry payload."""
    if not isinstance(claimed_generation, int) or claimed_generation < 1:
        raise ValueError("claimed_generation must be a positive integer")
    required = ("account", "user_id", "actor_peer", "session_id")
    if not all(isinstance(identity.get(k), str) for k in required) or not identity["session_id"]:
        raise ValueError("missing immutable scope")
    return canonical_digest({"scope": {k: identity[k] for k in required}, "generation": claimed_generation})


class ReceiptLedger:
    """Backend-only journal; never expose mutation methods to plugin/gate clients.

    All status changes are sync, durable local SQLite transactions. Incomplete
    begin() survives backend restart as PREPARING and cannot be replayed.
    """
    def __init__(self, path: str):
        self.path = path
        Path(path).parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        with self._connect() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS commit_receipts (
                request_key TEXT PRIMARY KEY,
                scope_json TEXT NOT NULL,
                body_digest TEXT NOT NULL,
                state TEXT NOT NULL,
                task_id TEXT,
                outcome TEXT,
                release_proven INTEGER NOT NULL DEFAULT 0
            )""")
        os.chmod(path, 0o600)

    @contextmanager
    def _connect(self):
        db = sqlite3.connect(self.path, timeout=10, isolation_level=None)
        try:
            db.row_factory = sqlite3.Row
            db.execute("PRAGMA busy_timeout=10000")
            db.execute("PRAGMA journal_mode=WAL")
            db.execute("PRAGMA synchronous=FULL")
            yield db
        finally:
            db.close()

    def _read(self, db, key):
        found = db.execute("SELECT * FROM commit_receipts WHERE request_key=?", (key,)).fetchone()
        return {"protocol": PROTOCOL, **dict(found)} if found else None

    def begin(self, key: str, scope: Mapping[str, Any], body_digest: str) -> tuple[dict, bool]:
        if not isinstance(key, str) or len(key) != 64 or not isinstance(body_digest, str) or len(body_digest) != 64:
            raise ValueError("invalid request or body digest")
        scope_json = json.dumps(scope, sort_keys=True, separators=(",", ":"), allow_nan=False)
        with self._connect() as db:
            try:
                db.execute("BEGIN IMMEDIATE")
                old = self._read(db, key)
                if old is not None:
                    if old["scope_json"] != scope_json or old["body_digest"] != body_digest:
                        raise ReceiptConflict("same request key with contradictory input")
                    db.execute("COMMIT")
                    return old, False  # Existing receipt: DO NOT execute commit_async again.
                db.execute("INSERT INTO commit_receipts(request_key,scope_json,body_digest,state) VALUES(?,?,?,'preparing')",
                           (key, scope_json, body_digest))
                new = self._read(db, key)
                db.execute("COMMIT")
                return new, True
            except BaseException:
                if db.in_transaction:
                    db.execute("ROLLBACK")
                raise

    def accepted(self, key: str, task_id: str) -> dict:
        if not isinstance(task_id, str) or not task_id:
            raise ValueError("a queued extraction needs a real task id")
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = self._read(db, key)
            if row is None or row["state"] not in ("preparing", "accepted") or (row["task_id"] not in (None, task_id)):
                db.execute("ROLLBACK")
                raise ReceiptConflict("not the unique accepted task")
            db.execute("UPDATE commit_receipts SET state='accepted',task_id=? WHERE request_key=?", (task_id, key))
            new = self._read(db, key)
            db.execute("COMMIT")
            return new

    def sealed_terminal(self, key: str, outcome: str, *, backend_quiescence_verified: bool) -> dict:
        """Only backend owner calls after verifying the exact task is non-replayable.

        Cannot infer this boolean from an HTTP response, task list or idle metrics.
        Backend integration MUST implement the proof before making this call.
        """
        if outcome not in TERMINAL or backend_quiescence_verified is not True:
            raise ValueError("backend terminal/quiescence proof required")
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = self._read(db, key)
            if row is None or row["state"] not in ("preparing", "accepted", "terminal"):
                db.execute("ROLLBACK")
                raise ReceiptConflict("no matching operation")
            if outcome != "skipped" and not row["task_id"]:
                db.execute("ROLLBACK")
                raise ReceiptConflict("task terminal requires matched task id")
            if outcome == "skipped" and row["task_id"]:
                db.execute("ROLLBACK")
                raise ReceiptConflict("skipped cannot have queued task")
            if row["state"] == "terminal" and row["outcome"] != outcome:
                db.execute("ROLLBACK")
                raise ReceiptConflict("conflicting terminal evidence")
            db.execute("UPDATE commit_receipts SET state='terminal',outcome=?,release_proven=1 WHERE request_key=?", (outcome, key))
            new = self._read(db, key)
            db.execute("COMMIT")
            return new

    def read(self, key: str) -> dict | None:
        with self._connect() as db:
            return self._read(db, key)


def gate_decision(receipt: Mapping[str, Any] | None, *, key: str, scope: Mapping[str, Any], body_digest: str) -> tuple[str, str | None]:
    """Return BLOCK, TRACK or RELEASE. Authenticated backend transport required.

    Caller must keep the cross-process admission fence until a RELEASE is
    durably reconciled while holding the existing exclusive gate lease.
    """
    if not isinstance(receipt, Mapping) or receipt.get("protocol") != PROTOCOL or receipt.get("request_key") != key or receipt.get("body_digest") != body_digest:
        return "BLOCK", None
    expected = json.dumps(scope, sort_keys=True, separators=(",", ":"), allow_nan=False)
    if receipt.get("scope_json") != expected:
        return "BLOCK", None
    state = receipt.get("state")
    task_id = receipt.get("task_id")
    if state == "terminal" and receipt.get("release_proven") == 1 and receipt.get("outcome") in TERMINAL:
        if receipt["outcome"] == "skipped" and task_id is None:
            return "RELEASE", receipt["outcome"]
        if receipt["outcome"] != "skipped" and isinstance(task_id, str) and task_id:
            return "RELEASE", receipt["outcome"]
    if state == "accepted" and isinstance(task_id, str) and task_id:
        return "TRACK", task_id
    return "BLOCK", None
