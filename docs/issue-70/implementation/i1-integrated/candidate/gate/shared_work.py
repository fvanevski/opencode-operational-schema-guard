"""Phase 1 typed work in the existing commit-gate SQLite and worker owner.

The real Graphiti adapter is deliberately unavailable until a durable terminal
observer exists. Tests inject a synthetic adapter with submit/poll methods.
"""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import time
from pathlib import Path
from typing import Any

GRAPHITI = "GRAPHITI_EPISODE_INGEST"
OPENVIKING = "OPENVIKING_SESSION_COMMIT"
ACTIVE = ("admitted", "processing", "blocked_reconcile")
TERMINAL = ("completed", "failed", "cancelled")
SCHEMA = json.loads(Path(__file__).with_name("memory-candidate-v1.schema.json").read_text())
VALIDATOR = None


class SourceAuthorityUnavailable(ValueError):
    code = "source_authority_unavailable"


class SourceEventConflict(ValueError):
    code = "source_event_conflict"


def validator():
    global VALIDATOR
    if VALIDATOR is None:
        try:
            import jsonschema
        except ImportError as exc:
            raise RuntimeError("Optional capture requires requirements-phase1.txt; legacy gate needs no jsonschema") from exc
        VALIDATOR = jsonschema.Draft202012Validator(SCHEMA, format_checker=jsonschema.FormatChecker())
    return VALIDATOR


def canonical_digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode()).hexdigest()


def source_key(candidate):
    source, scope = candidate["source"], candidate["scope"]
    return canonical_digest(["memory-source-event-v1", scope["workspace_id"], source["system"], source["session_id"], source["event_id"]])


def normalized_candidate(candidate):
    # Identity and payload digest are local calculations. No supplied hash is
    # authority. Without source attestation this envelope remains unverified.
    item = json.loads(json.dumps(candidate))
    item["event_id"] = source_key(item)
    item.pop("logical_digest", None)
    item["logical_digest"] = canonical_digest(item)
    return item
FORBIDDEN = re.compile(r"(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|\bsk-[A-Za-z0-9]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|Bearer\s+\S+|password\s*[:=]|\bfixtures?/|\btests?/|\.(?:log|trace)\b)", re.I)


def work_key(candidate: dict[str, Any]) -> str:
    return canonical_digest([1, GRAPHITI, source_key(candidate), candidate["scope"]["group_id"]])


def valid_candidate(x: Any) -> bool:
    """Validate the exact staged schema and reject content-like or secret refs."""
    if not isinstance(x, dict):
        return False
    try:
        encoded = json.dumps(x, separators=(",", ":"))
        if len(encoded) > 8192 or FORBIDDEN.search(encoded) or not re.fullmatch(r"[-\w./:@]+", x["fact_ref"]):
            return False
        errors = list(validator().iter_errors(x))
        if errors:
            return False
        return (
            x["destination"] == "graphiti" and "logical_digest" in x
            and x["authority"]["basis"] in ("operator_declared", "source_verified", "agent_candidate")
            and ("evidence_ref" not in x["authority"] or re.fullmatch(r"[-\w./:@]+", x["authority"]["evidence_ref"]) is not None)
        )
    except (KeyError, TypeError, ValueError):
        return False


class SharedWorkQueue:
    def __init__(self, legacy_db):
        self.legacy_db = legacy_db
        with legacy_db.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute("""CREATE TABLE IF NOT EXISTS memory_work (
                work_key TEXT PRIMARY KEY, work_class TEXT NOT NULL,
                source_event_id TEXT NOT NULL, source_session_id TEXT NOT NULL,
                source_message_id TEXT, destination_scope TEXT NOT NULL,
                logical_digest TEXT NOT NULL, candidate_json TEXT NOT NULL,
                status TEXT NOT NULL, attempt_generation INTEGER NOT NULL DEFAULT 0,
                backend_identity TEXT, lease_identity TEXT, created_at REAL NOT NULL,
                updated_at REAL NOT NULL, error_code TEXT
            )""")
            conn.execute("CREATE INDEX IF NOT EXISTS memory_work_ready ON memory_work(status, created_at)")
            migrating = conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='memory_source_admissions'").fetchone() is None
            # Separate index preserves historical work keys and original envelopes.
            conn.execute("""CREATE TABLE IF NOT EXISTS memory_source_admissions (
                source_key TEXT NOT NULL, destination_scope TEXT NOT NULL,
                payload_digest TEXT NOT NULL, work_key TEXT NOT NULL,
                PRIMARY KEY(source_key, destination_scope))""")
            for row in conn.execute("SELECT * FROM memory_work").fetchall():
                item = normalized_candidate(json.loads(row["candidate_json"]))
                identity = (source_key(item), item["scope"]["group_id"])
                prior = conn.execute("SELECT * FROM memory_source_admissions WHERE source_key=? AND destination_scope=?", identity).fetchone()
                if prior and prior["work_key"] != row["work_key"]:
                    raise SourceEventConflict("historical source identity collision; reconciliation required")
                conn.execute("INSERT OR IGNORE INTO memory_source_admissions VALUES (?, ?, ?, ?)", (*identity, item["logical_digest"], row["work_key"]))
            # Previously queued metadata never acquired independent attestation.
            if migrating:
                conn.execute("UPDATE memory_work SET status='deferred_unverified', error_code='source_authority_unavailable' WHERE status='queued'")

    def enqueue(self, candidate: dict[str, Any]) -> dict[str, Any]:
        if not valid_candidate(candidate):
            raise ValueError("invalid bounded candidate envelope")
        if candidate["authority"]["basis"] != "agent_candidate":
            raise SourceAuthorityUnavailable("No authenticated V2 source-attestation interface")
        candidate = normalized_candidate(candidate)
        key = work_key(candidate)
        identity = (source_key(candidate), candidate["scope"]["group_id"])
        now = time.time()
        with self.legacy_db.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            prior = conn.execute("SELECT * FROM memory_source_admissions WHERE source_key=? AND destination_scope=?", identity).fetchone()
            if prior:
                if prior["payload_digest"] != candidate["logical_digest"]:
                    raise SourceEventConflict("source event already recorded with contradictory payload")
                return dict(conn.execute("SELECT work_key, status FROM memory_work WHERE work_key=?", (prior["work_key"],)).fetchone())
            conn.execute("""INSERT INTO memory_work
                (work_key, work_class, source_event_id, source_session_id,
                 source_message_id, destination_scope, logical_digest, candidate_json,
                 status, created_at, updated_at, error_code)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'deferred_unverified', ?, ?, 'source_authority_unavailable')""",
                (key, GRAPHITI, candidate["event_id"], candidate["source"]["session_id"],
                 candidate["source"].get("message_id"), candidate["scope"]["group_id"],
                 candidate["logical_digest"], json.dumps(candidate, sort_keys=True), now, now))
            conn.execute("INSERT INTO memory_source_admissions VALUES (?, ?, ?, ?)", (*identity, candidate["logical_digest"], key))
            return {"work_key": key, "status": "deferred_unverified"}

    def ready(self):
        with self.legacy_db.connect() as conn:
            return conn.execute("SELECT * FROM memory_work WHERE status='queued' ORDER BY created_at, work_key LIMIT 1").fetchone()

    def unresolved(self):
        with self.legacy_db.connect() as conn:
            return conn.execute("SELECT * FROM memory_work WHERE status IN ('admitted','processing','blocked_reconcile') ORDER BY created_at LIMIT 1").fetchone()

    def claim(self, key: str, lease: str):
        with self.legacy_db.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            updated = conn.execute("""UPDATE memory_work SET status='admitted', attempt_generation=attempt_generation+1,
                lease_identity=?, updated_at=? WHERE work_key=? AND status='queued'""", (lease, time.time(), key))
            if updated.rowcount != 1:
                return None
            return conn.execute("SELECT * FROM memory_work WHERE work_key=?", (key,)).fetchone()

    def processing(self, key: str, generation: int, backend_identity: str):
        if not backend_identity or len(backend_identity) > 256:
            raise ValueError("bounded backend identity required")
        with self.legacy_db.connect() as conn:
            updated = conn.execute("""UPDATE memory_work SET status='processing', backend_identity=?, updated_at=?
                WHERE work_key=? AND attempt_generation=? AND status='admitted'""",
                (backend_identity, time.time(), key, generation))
            if updated.rowcount != 1:
                raise RuntimeError("processing identity mismatch")

    def finish(self, key: str, generation: int, backend_identity: str, terminal: str):
        if terminal not in ("completed", "failed") or not backend_identity:
            raise ValueError("terminal proof required")
        with self.legacy_db.connect() as conn:
            updated = conn.execute("""UPDATE memory_work SET status=?, updated_at=?, error_code=?
                WHERE work_key=? AND attempt_generation=? AND backend_identity=? AND status='processing'""",
                (terminal, time.time(), "backend_failed" if terminal == "failed" else None,
                 key, generation, backend_identity))
            if updated.rowcount != 1:
                raise RuntimeError("terminal identity mismatch")

    def block(self, key: str, code: str):
        with self.legacy_db.connect() as conn:
            conn.execute("""UPDATE memory_work SET status='blocked_reconcile', error_code=?, updated_at=?
                WHERE work_key=? AND status IN ('admitted','processing')""", (code[:80], time.time(), key))

    def recover_after_restart(self):
        with self.legacy_db.connect() as conn:
            conn.execute("""UPDATE memory_work SET status='blocked_reconcile', error_code='owner_restart', updated_at=?
                WHERE status IN ('admitted','processing')""", (time.time(),))

    def cancel(self, key: str):
        with self.legacy_db.connect() as conn:
            return conn.execute("UPDATE memory_work SET status='cancelled', updated_at=? WHERE work_key=? AND status='queued'", (time.time(), key)).rowcount == 1

    def reconcile(self, key: str, backend_identity: str, terminal: str):
        if terminal not in ("completed", "failed") or not backend_identity:
            raise ValueError("independent terminal proof required")
        with self.legacy_db.connect() as conn:
            updated = conn.execute("""UPDATE memory_work SET status=?, error_code=NULL, updated_at=?
                WHERE work_key=? AND status='blocked_reconcile' AND backend_identity=?""",
                (terminal, time.time(), key, backend_identity))
            if updated.rowcount != 1:
                raise RuntimeError("reconciliation identity mismatch")

    def status(self, limit: int = 50):
        with self.legacy_db.connect() as conn:
            rows = conn.execute("""SELECT work_key, work_class, source_event_id, destination_scope,
                status, attempt_generation, backend_identity, lease_identity, created_at, updated_at, error_code
                FROM memory_work ORDER BY created_at DESC LIMIT ?""", (min(max(limit, 1), 100),)).fetchall()
            return [dict(row) for row in rows]


class DisabledGraphitiAdapter:
    def submit(self, candidate):
        raise RuntimeError("Graphiti terminal observation interface unavailable")

    def poll(self, backend_identity):
        raise RuntimeError("Graphiti terminal observation interface unavailable")
