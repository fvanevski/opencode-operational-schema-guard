#!/usr/bin/env python3
"""Durable OpenViking commit admission gate.

All non-commit HTTP traffic is transparently proxied to the private
OpenViking backend. Session commit requests are persisted in SQLite and a
single worker submits them only after the agent lease and vLLM scheduler have
both remained idle for the configured grace period.
"""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import hmac
import http.client
import json
import logging
import math
import os
import re
import signal
import sqlite3
import threading
import time
import tomllib
import urllib.error
import urllib.parse
import urllib.request
from contextlib import contextmanager
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Iterator
from receipt_protocol import canonical_digest as request_digest, request_key, gate_decision
from shared_work import validator as capture_preflight, SourceAuthorityUnavailable, SourceEventConflict, DisabledGraphitiAdapter, SharedWorkQueue


LOG = logging.getLogger("openviking-commit-gate")
COMMIT_RE = re.compile(r"^/api/v1/sessions/([^/]+)/commit$")
METRIC_RE = re.compile(
    r"^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{[^}]*\})?\s+"
    r"([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?)\s*$"
)
HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}
TERMINAL_OK = {"completed", "complete", "succeeded", "success"}
TERMINAL_FAILED = {"failed", "failure", "error", "cancelled", "canceled"}
NON_INTERACTIVE_HARNESS_SUBCOMMANDS = {
    "codex": {"app-server"},
    "opencode": {"serve"},
}
HARNESS_ALIASES: dict[str, dict[str, set[str]]] = {
    "opencode-desktop": {
        "comm": {
            "opencode-desktop",
            "opencode-deskto",
            "opencode.AppImage",
            "opencode.AppIma",
            "ai.opencode.desktop",
            "ai.opencode.des",
        },
        "exe": {
            "opencode-desktop",
            "opencode.AppImage",
            "ai.opencode.desktop",
        },
    },
    "opencode": {
        "comm": {"opencode"},
        "exe": {"opencode"},
    },
    "codex": {
        "comm": {"codex"},
        "exe": {"codex"},
    },
    "agy": {
        "comm": {"agy", "antigravity"},
        "exe": {"agy", "antigravity"},
    },
}



class TaskFailed(RuntimeError):
    def __init__(
        self,
        message: str,
        task_id: str | None = None,
        failure_kind: str | None = None,
        archive_uri: str | None = None,
    ):
        super().__init__(message)
        self.task_id = task_id
        self.failure_kind = failure_kind
        self.archive_uri = archive_uri


class TerminalCommitError(RuntimeError):
    """A commit cannot succeed on retry without a new client intent."""

    pass


def _expanded(value: str) -> str:
    return os.path.expanduser(os.path.expandvars(value))


@dataclass(frozen=True)
class Config:
    listen_host: str
    listen_port: int
    backend_host: str
    backend_port: int
    metrics_url: str
    lock_file: str
    database: str
    drain_enabled: bool
    quiet_grace_seconds: float
    poll_seconds: float
    task_poll_seconds: float
    task_timeout_seconds: float
    request_timeout_seconds: float
    max_commit_body_bytes: int
    retry_base_seconds: float
    retry_max_seconds: float
    process_names: tuple[str, ...]
    metrics_running: str = "auto"
    metrics_waiting: str = "auto"
    metrics_fallback_urls: tuple[str, ...] = ()
    graphiti_enabled: bool = False
    receipts_enabled: bool = False
    graphiti_runtime_dir: str = ""
    graphiti_source_policy: str = ""
    graphiti_core_python: str = ""
    graphiti_group: str = ""
    graphiti_validator_path: str = ""
    graphiti_validator_sha256: str = ""

    @classmethod
    def load(cls, path: str) -> "Config":
        with open(path, "rb") as handle:
            raw = tomllib.load(handle)
        gate = raw.get("gate", {})
        worker = raw.get("worker", {})
        raw_fallbacks = gate.get("metrics_fallback_urls", ())
        if isinstance(raw_fallbacks, str):
            raw_fallbacks = [raw_fallbacks]
        return cls(
            listen_host=str(gate.get("listen_host", "127.0.0.1")),
            listen_port=int(gate.get("listen_port", 1933)),
            backend_host=str(gate.get("backend_host", "127.0.0.1")),
            backend_port=int(gate.get("backend_port", 1934)),
            metrics_url=str(gate.get("metrics_url", "http://127.0.0.1:8001/metrics")),
            metrics_fallback_urls=tuple(
                str(value).strip() for value in raw_fallbacks if str(value).strip()
            ),
            metrics_running=str(gate.get("metrics_running", "auto")),
            metrics_waiting=str(gate.get("metrics_waiting", "auto")),
            graphiti_enabled=bool(worker.get("graphiti_enabled", False)),
            receipts_enabled=bool(worker.get("receipts_enabled", False)),
            graphiti_runtime_dir=_expanded(str(worker.get("graphiti_runtime_dir", ""))),
            graphiti_source_policy=_expanded(str(worker.get("graphiti_source_policy", ""))),
            graphiti_core_python=_expanded(str(worker.get("graphiti_core_python", ""))),
            graphiti_group=str(worker.get("graphiti_group", "")),
            graphiti_validator_path=_expanded(str(worker.get("graphiti_validator_path", ""))),
            graphiti_validator_sha256=str(worker.get("graphiti_validator_sha256", "")),
            lock_file=_expanded(str(gate.get("lock_file", "$XDG_RUNTIME_DIR/openviking-agent.lock"))),
            database=_expanded(str(gate.get("database", "~/.local/state/openviking-commit-gate/queue.sqlite3"))),
            drain_enabled=bool(worker.get("drain_enabled", False)),
            quiet_grace_seconds=float(worker.get("quiet_grace_seconds", 30.0)),
            poll_seconds=float(worker.get("poll_seconds", 2.0)),
            task_poll_seconds=float(worker.get("task_poll_seconds", 2.0)),
            task_timeout_seconds=float(worker.get("task_timeout_seconds", 3600.0)),
            request_timeout_seconds=float(worker.get("request_timeout_seconds", 30.0)),
            max_commit_body_bytes=int(worker.get("max_commit_body_bytes", 65536)),
            retry_base_seconds=float(worker.get("retry_base_seconds", 15.0)),
            retry_max_seconds=float(worker.get("retry_max_seconds", 900.0)),
            process_names=tuple(
                str(value).strip() for value in worker.get(
                    "process_names", ["codex", "opencode", "agy", "opencode-desktop"]
                ) if str(value).strip()
            ),

        )


class QueueDB:
    def __init__(self, path: str):
        self.path = path
        Path(path).parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        os.chmod(Path(path).parent, 0o700)
        self.initialize()

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.path, timeout=10.0)
        try:
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA busy_timeout=10000")
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA synchronous=FULL")
            with conn:
                yield conn
        finally:
            conn.close()

    def initialize(self) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS intents (
                    account TEXT NOT NULL DEFAULT '',
                    user_id TEXT NOT NULL DEFAULT '',
                    actor_peer TEXT NOT NULL DEFAULT '',
                    session_id TEXT NOT NULL,
                    requested_generation INTEGER NOT NULL DEFAULT 1,
                    processed_generation INTEGER NOT NULL DEFAULT 0,
                    claimed_generation INTEGER,
                    keep_recent_count INTEGER NOT NULL DEFAULT 0,
                    commit_body_json TEXT NOT NULL DEFAULT '{}',
                    reasons_json TEXT NOT NULL DEFAULT '[]',
                    first_requested_at REAL NOT NULL,
                    last_requested_at REAL NOT NULL,
                    state TEXT NOT NULL DEFAULT 'pending',
                    task_id TEXT,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    next_attempt_at REAL NOT NULL DEFAULT 0,
                    last_error TEXT,
                    PRIMARY KEY (account, user_id, actor_peer, session_id)
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS intents_ready_idx "
                "ON intents(state, next_attempt_at, first_requested_at)"
            )
            columns = {row[1] for row in conn.execute("PRAGMA table_info(intents)")}
            if "commit_body_json" not in columns:
                conn.execute(
                    "ALTER TABLE intents ADD COLUMN commit_body_json TEXT NOT NULL DEFAULT '{}'"
                )
            # These describe the last TERMINAL backend request for this intent,
            # independently of unresolved failures from earlier generations.
            if "last_terminal_outcome" not in columns:
                conn.execute("ALTER TABLE intents ADD COLUMN last_terminal_outcome TEXT")
            if "last_terminal_generation" not in columns:
                conn.execute("ALTER TABLE intents ADD COLUMN last_terminal_generation INTEGER")
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS failed_tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id TEXT,
                    account TEXT NOT NULL DEFAULT '',
                    user_id TEXT NOT NULL DEFAULT '',
                    actor_peer TEXT NOT NULL DEFAULT '',
                    session_id TEXT NOT NULL,
                    generation INTEGER NOT NULL DEFAULT 1,
                    archive_uri TEXT,
                    error TEXT,
                    failure_kind TEXT,
                    failed_at REAL NOT NULL,
                    resolution_status TEXT NOT NULL DEFAULT 'unresolved',
                    resolved_at REAL
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS failed_tasks_identity_idx "
                "ON failed_tasks(account, user_id, actor_peer, session_id, resolution_status, generation)"
            )
            conn.execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS failed_tasks_task_unique "
                "ON failed_tasks(task_id) WHERE task_id IS NOT NULL"
            )
            conn.execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS failed_tasks_generation_unique "
                "ON failed_tasks(account, user_id, actor_peer, session_id, generation)"
            )
            conn.execute("CREATE TABLE IF NOT EXISTS admission_contract (version INTEGER PRIMARY KEY, required INTEGER NOT NULL)")
            conn.execute("INSERT OR IGNORE INTO admission_contract VALUES (1,0)")
            conn.execute("""CREATE TABLE IF NOT EXISTS commit_attempts (
                request_key TEXT PRIMARY KEY, account TEXT NOT NULL, user_id TEXT NOT NULL,
                actor_peer TEXT NOT NULL, session_id TEXT NOT NULL, generation INTEGER NOT NULL,
                body_json TEXT NOT NULL, body_digest TEXT NOT NULL,
                submitted INTEGER NOT NULL DEFAULT 0, resolved INTEGER NOT NULL DEFAULT 0,
                UNIQUE(account,user_id,actor_peer,session_id,generation))""")
            conn.execute("""CREATE TRIGGER IF NOT EXISTS commit_attempt_resolved AFTER UPDATE OF state ON intents
                WHEN OLD.state='inflight' AND NEW.state NOT IN ('inflight','unknown')
                BEGIN UPDATE commit_attempts SET resolved=1
                WHERE account=OLD.account AND user_id=OLD.user_id AND actor_peer=OLD.actor_peer
                    AND session_id=OLD.session_id AND generation=OLD.claimed_generation; END""")
        os.chmod(self.path, 0o600)

    @staticmethod
    def key(identity: dict[str, str], session_id: str) -> tuple[str, str, str, str]:
        return (
            identity.get("account", ""),
            identity.get("user_id", ""),
            identity.get("actor_peer", ""),
            session_id,
        )

    def enqueue(
        self,
        identity: dict[str, str],
        session_id: str,
        keep_recent_count: int,
        commit_body: dict[str, Any],
        reason: str,
        now: float | None = None,
    ) -> dict[str, Any]:
        now = time.time() if now is None else now
        key = self.key(identity, session_id)
        with self.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            row = conn.execute(
                "SELECT * FROM intents WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?",
                key,
            ).fetchone()
            if row is None:
                reasons = [reason] if reason else []
                stored_body = dict(commit_body)
                stored_body["keep_recent_count"] = keep_recent_count
                conn.execute(
                    """
                    INSERT INTO intents (
                        account, user_id, actor_peer, session_id,
                        keep_recent_count, commit_body_json, reasons_json,
                        first_requested_at, last_requested_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (*key, keep_recent_count, json.dumps(stored_body), json.dumps(reasons), now, now),
                )
                generation = 1
            else:
                reasons = json.loads(row["reasons_json"] or "[]")
                if reason and reason not in reasons:
                    reasons = (reasons + [reason])[-20:]
                generation = int(row["requested_generation"]) + 1
                state = row["state"] if row["state"] in {"inflight", "unknown"} else "pending"
                stored_body = dict(commit_body)
                stored_body["keep_recent_count"] = max(
                    int(row["keep_recent_count"]), keep_recent_count
                )
                conn.execute(
                    """
                    UPDATE intents
                    SET requested_generation=?, keep_recent_count=?, commit_body_json=?, reasons_json=?,
                        last_requested_at=?, state=?,
                        next_attempt_at=CASE WHEN state IN ('inflight','unknown') THEN next_attempt_at ELSE 0 END,
                        last_error=CASE WHEN state IN ('inflight','unknown') THEN last_error ELSE NULL END
                    WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?
                    """,
                    (
                        generation,
                        stored_body["keep_recent_count"],
                        json.dumps(stored_body),
                        json.dumps(reasons),
                        now,
                        state,
                        *key,
                    ),
                )
        return {"generation": generation, "intent_id": self.intent_id(key)}

    @staticmethod
    def intent_id(key: tuple[str, str, str, str]) -> str:
        digest = hashlib.sha256("\0".join(key).encode()).hexdigest()[:24]
        return f"ovcg-{digest}"

    def next_ready(self, now: float | None = None) -> sqlite3.Row | None:
        now = time.time() if now is None else now
        with self.connect() as conn:
            return conn.execute(
                """
                SELECT * FROM intents
                WHERE state='pending'
                  AND requested_generation > processed_generation
                  AND next_attempt_at <= ?
                ORDER BY first_requested_at, last_requested_at
                LIMIT 1
                """,
                (now,),
            ).fetchone()

    def inflight(self) -> sqlite3.Row | None:
        with self.connect() as conn:
            return conn.execute(
                "SELECT * FROM intents WHERE state='inflight' ORDER BY first_requested_at LIMIT 1"
            ).fetchone()

    def attempt(self, row):
        with self.connect() as conn:
            return conn.execute("SELECT * FROM commit_attempts WHERE account=? AND user_id=? AND actor_peer=? AND session_id=? AND generation=?",
                (*(row[k] for k in ("account","user_id","actor_peer","session_id")),row["claimed_generation"])).fetchone()

    def unknown_rows(self):
        with self.connect() as conn:
            return conn.execute("SELECT * FROM intents WHERE state='unknown'").fetchall()

    def adopt_receipt_task(self, row, task_id):
        with self.connect() as conn:
            updated=conn.execute("""UPDATE intents SET state='inflight',task_id=?
                WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?
                AND claimed_generation=? AND state IN ('unknown','inflight') AND (task_id IS NULL OR task_id=?)""",
                (task_id,*(row[k] for k in ("account","user_id","actor_peer","session_id")),row["claimed_generation"],task_id))
            if updated.rowcount != 1: raise RuntimeError("receipt task identity changed")

    def has_unknown_claim(self) -> bool:
        with self.connect() as conn:
            return conn.execute("SELECT 1 FROM intents WHERE state='unknown' LIMIT 1").fetchone() is not None

    def claim(self, row: sqlite3.Row) -> sqlite3.Row | None:
        key = (row["account"], row["user_id"], row["actor_peer"], row["session_id"])
        with self.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            current = conn.execute(
                "SELECT * FROM intents WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?",
                key,
            ).fetchone()
            if current is None or current["state"] != "pending":
                return None
            generation = int(current["requested_generation"])
            scope = {k: str(current[k]) for k in ("account","user_id","actor_peer","session_id")}
            frozen = json.loads(current["commit_body_json"] or "{}")
            digest = request_digest(frozen)
            req = request_key(scope,generation)
            prior = conn.execute("SELECT * FROM commit_attempts WHERE request_key=?",(req,)).fetchone()
            if prior and (prior["body_digest"] != digest or prior["submitted"]):
                raise RuntimeError("claimed attempt is immutable or already submitted")
            conn.execute("""INSERT OR IGNORE INTO commit_attempts
                (request_key,account,user_id,actor_peer,session_id,generation,body_json,body_digest)
                VALUES (?,?,?,?,?,?,?,?)""",(req,*key,generation,json.dumps(frozen,sort_keys=True),digest))
            conn.execute("UPDATE commit_attempts SET resolved=0 WHERE request_key=?",(req,))
            conn.execute(
                """
                UPDATE intents SET state='inflight', claimed_generation=?, task_id=NULL
                WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?
                """,
                (generation, *key),
            )
            return conn.execute(
                "SELECT * FROM intents WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?",
                key,
            ).fetchone()

    def set_task(self, row: sqlite3.Row, task_id: str) -> None:
        self._update_key(row, "UPDATE intents SET task_id=? WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?", task_id)

    def complete(self, row: sqlite3.Row, outcome: str = "completed") -> None:
        if outcome not in {"completed", "complete", "succeeded", "success", "ok", "skipped"}:
            raise ValueError(f"unrecognized successful terminal outcome: {outcome!r}")
        key = (row["account"], row["user_id"], row["actor_peer"], row["session_id"])
        with self.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            current = conn.execute(
                "SELECT * FROM intents WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?",
                key,
            ).fetchone()
            if current is None:
                return
            terminal_generation = int(current["claimed_generation"] or 0)
            if terminal_generation <= 0:
                raise RuntimeError("cannot complete intent without a claimed generation")
            processed = max(
                int(current["processed_generation"]), int(current["claimed_generation"] or 0)
            )
            state = "pending" if int(current["requested_generation"]) > processed else "complete"

            unresolved = conn.execute(
                """SELECT COUNT(*) FROM failed_tasks
                   WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?
                     AND resolution_status='unresolved'""",
                key,
            ).fetchone()
            has_unresolved = bool(unresolved and unresolved[0] > 0)

            if has_unresolved:
                conn.execute(
                    """
                    UPDATE intents SET processed_generation=?, claimed_generation=NULL,
                        state=?, task_id=NULL, attempts=0, next_attempt_at=0,
                        last_error=COALESCE(last_error, 'unresolved failure in previous extraction'),
                        last_terminal_outcome=?, last_terminal_generation=?
                    WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?
                    """,
                    (processed, state, outcome, terminal_generation, *key),
                )
            else:
                conn.execute(
                    """
                    UPDATE intents SET processed_generation=?, claimed_generation=NULL,
                        state=?, task_id=NULL, attempts=0, next_attempt_at=0, last_error=NULL,
                        last_terminal_outcome=?, last_terminal_generation=?
                    WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?
                    """,
                    (processed, state, outcome, terminal_generation, *key),
                )

    def task_failed(
        self,
        row: sqlite3.Row,
        error: str,
        *,
        task_id: str,
        failure_kind: str | None = None,
        archive_uri: str | None = None,
        now: float | None = None,
    ) -> None:
        """Atomically preserve terminal failure identity and transition its intent.

        Transient polling failures do not call this method. A missing/mismatched
        backend task identity fails closed, leaving the inflight claim intact.
        """
        if not task_id:
            raise ValueError("terminal extraction failure requires a known task ID")
        now = time.time() if now is None else now
        key = (row["account"], row["user_id"], row["actor_peer"], row["session_id"])
        with self.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            current = conn.execute(
                "SELECT * FROM intents WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?",
                key,
            ).fetchone()
            if current is None or current["state"] != "inflight":
                raise RuntimeError("terminal failure has no matching inflight intent")
            generation = int(current["claimed_generation"] or 0)
            if (generation <= 0 or generation != int(row["claimed_generation"] or 0)
                    or str(current["task_id"] or "") != task_id):
                raise RuntimeError("terminal failure task/generation identity mismatch")

            existing = conn.execute(
                """SELECT * FROM failed_tasks WHERE task_id=? OR
                   (account=? AND user_id=? AND actor_peer=? AND session_id=? AND generation=?)""",
                (task_id, *key, generation),
            ).fetchone()
            if existing is None:
                conn.execute(
                    """
                    INSERT INTO failed_tasks (
                        task_id, account, user_id, actor_peer, session_id,
                        generation, archive_uri, error, failure_kind, failed_at, resolution_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unresolved')
                    """,
                    (
                        task_id,
                        *key,
                        generation,
                        archive_uri,
                        (error or "")[:1000],
                        failure_kind,
                        now,
                    ),
                )
            else:
                existing_identity = (
                    existing["account"], existing["user_id"], existing["actor_peer"],
                    existing["session_id"], int(existing["generation"]), existing["task_id"],
                )
                if existing_identity != (*key, generation, task_id) or existing["resolution_status"] != "unresolved":
                    raise RuntimeError("conflicting terminal failure identity; refusing reassociation")
                # Preserve the first recorded failure timestamp/error if a
                # pre-existing record needs its incomplete intent transition.

            req_gen = int(current["requested_generation"])
            if req_gen > generation:
                state = "pending"
            else:
                state = "failed"
            updated = conn.execute(
                """
                UPDATE intents SET state=?, task_id=NULL, claimed_generation=NULL,
                    attempts=attempts + 1, next_attempt_at=0, last_error=?,
                    last_terminal_outcome='failed', last_terminal_generation=?
                WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?
                  AND state='inflight' AND claimed_generation=? AND task_id=?
                """,
                (state, (error or "")[:1000], generation, *key, generation, task_id),
            )
            if updated.rowcount != 1:
                raise RuntimeError("terminal failure intent transition was not applied")

    def list_unresolved_failures(self, session_id: str | None = None) -> list[dict[str, Any]]:
        with self.connect() as conn:
            if session_id:
                rows = conn.execute(
                    "SELECT * FROM failed_tasks WHERE resolution_status='unresolved' AND session_id=? ORDER BY failed_at",
                    (session_id,),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM failed_tasks WHERE resolution_status='unresolved' ORDER BY failed_at, session_id"
                ).fetchall()
        return [dict(row) for row in rows]

    def unresolved_failure_count(self) -> int:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT COUNT(*) FROM failed_tasks WHERE resolution_status='unresolved'"
            ).fetchone()
            return int(row[0]) if row else 0

    def retry(self, row: sqlite3.Row, error: str, cfg: Config) -> None:
        attempts = int(row["attempts"]) + 1
        delay = min(cfg.retry_max_seconds, cfg.retry_base_seconds * (2 ** min(attempts - 1, 10)))
        key = (row["account"], row["user_id"], row["actor_peer"], row["session_id"])
        with self.connect() as conn:
            conn.execute(
                """
                UPDATE intents SET state='pending', task_id=NULL, claimed_generation=NULL,
                    attempts=?, next_attempt_at=?, last_error=?
                WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?
                """,
                (attempts, time.time() + delay, error[:1000], *key),
            )

    def dead_letter(self, row: sqlite3.Row, error: str) -> None:
        key = (row["account"], row["user_id"], row["actor_peer"], row["session_id"])
        with self.connect() as conn:
            conn.execute(
                """
                UPDATE intents SET state='dead', task_id=NULL, claimed_generation=NULL,
                    attempts=attempts + 1, next_attempt_at=0, last_error=?
                WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?
                """,
                (error[:1000], *key),
            )

    def mark_unknown_claims(self) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                UPDATE intents SET state='unknown', last_error=COALESCE(
                    last_error,
                    'broker restarted after commit submission claim but before task id was persisted'
                )
                WHERE state='inflight' AND (task_id IS NULL OR task_id='')
                """
            )

    def mark_unknown(self, row: sqlite3.Row) -> None:
        key = (row["account"], row["user_id"], row["actor_peer"], row["session_id"])
        with self.connect() as conn:
            conn.execute("""UPDATE intents SET state='unknown', last_error='ambiguous backend acknowledgment'
                WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?
                  AND state='inflight'""", key)

    def list_rows(self) -> list[dict[str, Any]]:
        with self.connect() as conn:
            rows = conn.execute(
                """SELECT i.*,
                   (SELECT COUNT(*) FROM failed_tasks AS f
                    WHERE f.account=i.account AND f.user_id=i.user_id
                      AND f.actor_peer=i.actor_peer AND f.session_id=i.session_id
                      AND f.resolution_status='unresolved') AS unresolved_failure_count
                   FROM intents AS i ORDER BY i.first_requested_at, i.session_id"""
            ).fetchall()
        return [dict(row) for row in rows]

    def summary(self) -> dict[str, Any]:
        with self.connect() as conn:
            states = {
                str(row["state"]): int(row["count"])
                for row in conn.execute(
                    "SELECT state, COUNT(*) AS count FROM intents GROUP BY state"
                )
            }
            totals = conn.execute(
                """
                SELECT COUNT(*) AS rows,
                       COALESCE(SUM(requested_generation - processed_generation), 0) AS generation_gap,
                       COALESCE(SUM(attempts), 0) AS attempts,
                       MIN(CASE WHEN state='pending' THEN first_requested_at END) AS oldest_pending_at
                FROM intents
                """
            ).fetchone()
            unresolved = conn.execute(
                "SELECT COUNT(*) FROM failed_tasks WHERE resolution_status='unresolved'"
            ).fetchone()
            unresolved_count = int(unresolved[0]) if unresolved else 0
        return {
            "states": states,
            "rows": int(totals["rows"]),
            "generation_gap": int(totals["generation_gap"]),
            "attempts": int(totals["attempts"]),
            "oldest_pending_at": totals["oldest_pending_at"],
            "unresolved_failures": unresolved_count,
        }

    def _update_key(self, row: sqlite3.Row, sql: str, *values: Any) -> None:
        key = (row["account"], row["user_id"], row["actor_peer"], row["session_id"])
        with self.connect() as conn:
            conn.execute(sql, (*values, *key))


def parse_vllm_metrics(
    payload: str,
    metrics_running: str = "auto",
    metrics_waiting: str = "auto",
) -> tuple[float, float]:
    # Detect on every scrape: the listener may switch providers without a
    # gate restart. Never mix providers or fall back from malformed metrics.
    if "auto" in (metrics_running, metrics_waiting):
        if (metrics_running, metrics_waiting) != ("auto", "auto"):
            raise ValueError("both scheduler metric names must be auto or explicit")
        providers = (
            (
                ("vllm:num_requests_running", "vllm:num_requests_waiting"),
                {"vllm:num_requests_running", "vllm:num_requests_waiting"},
            ),
            (
                ("llamacpp:requests_processing", "llamacpp:requests_deferred"),
                {"llamacpp:requests_processing", "llamacpp:requests_deferred"},
            ),
            (
                ("ninfer_requests_running", "ninfer_requests_waiting"),
                {
                    "ninfer_requests_running",
                    "ninfer_requests_waiting",
                    "ninfer_requests_materializing",
                    "ninfer_requests_paused",
                    "ninfer_engine_ready",
                },
            ),
        )
        sample_names = {
            re.split(r"[\s{]", line.strip(), maxsplit=1)[0]
            for line in payload.splitlines() if not line.lstrip().startswith("#")
        }
        present = [pair for pair, family in providers if sample_names.intersection(family)]
        if len(present) != 1:
            raise ValueError("scheduler metric provider is missing or ambiguous")
        metrics_running, metrics_waiting = present[0]
    names = {metrics_running: "running", metrics_waiting: "waiting"}
    if len(names) != 2 or any(
        re.fullmatch(r"[a-zA-Z_:][a-zA-Z0-9_:]*", name) is None for name in names
    ):
        raise ValueError("scheduler metric names must be valid and distinct")
    extra_names: dict[str, str] = {}
    check_ninfer_ready = False
    if (metrics_running, metrics_waiting) == (
        "ninfer_requests_running",
        "ninfer_requests_waiting",
    ):
        extra_names = {
            "ninfer_requests_materializing": "running",
            "ninfer_requests_paused": "waiting",
        }
        check_ninfer_ready = True
    totals = {"running": 0.0, "waiting": 0.0}
    seen: set[str] = set()
    for line in payload.splitlines():
        line = line.strip()
        metric_name = re.split(r"[\s{]", line, maxsplit=1)[0]
        if check_ninfer_ready and metric_name == "ninfer_engine_ready":
            match = METRIC_RE.fullmatch(line)
            if not match:
                raise ValueError("malformed required scheduler metric")
            ready_val = float(match.group(2))
            if not math.isfinite(ready_val) or ready_val != 1.0:
                raise ValueError("ninfer engine is not ready")
            continue
        if metric_name not in names and metric_name not in extra_names:
            continue
        match = METRIC_RE.fullmatch(line)
        if not match:
            raise ValueError("malformed required scheduler metric")
        name, raw_value = match.groups()
        value = float(raw_value)
        if not math.isfinite(value) or value < 0:
            raise ValueError("scheduler occupancy must be finite and nonnegative")
        kind = names.get(name) or extra_names[name]
        totals[kind] += value
        if not math.isfinite(totals[kind]):
            raise ValueError("scheduler occupancy total is not finite")
        if name in names:
            seen.add(kind)
    if seen != {"running", "waiting"}:
        raise ValueError("required scheduler metrics are missing")
    return totals["running"], totals["waiting"]


def json_request(
    method: str,
    url: str,
    headers: dict[str, str] | None = None,
    body: dict[str, Any] | None = None,
    timeout: float = 30.0,
) -> tuple[int, dict[str, Any]]:
    data = None if body is None else json.dumps(body).encode()
    request_headers = {"Accept": "application/json"}
    if data is not None:
        request_headers["Content-Type"] = "application/json"
    request_headers.update(headers or {})
    request = urllib.request.Request(url, data=data, headers=request_headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read()
            return response.status, json.loads(raw or b"{}")
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            payload = json.loads(raw or b"{}")
        except json.JSONDecodeError:
            payload = {"error": raw.decode(errors="replace")[:1000]}
        return exc.code, payload


class Worker:
    def __init__(self, cfg: Config, db: QueueDB, stop_event: threading.Event, graphiti_adapter=None, source_resolver=None):
        self.cfg = cfg
        self.db = db
        self.stop_event = stop_event
        if cfg.receipts_enabled or cfg.graphiti_enabled:
            # Sticky activation: disabling config cannot erase unresolved work
            # from launcher admission. Observers read this inside the SH lease.
            with db.connect() as conn:
                conn.execute("UPDATE admission_contract SET required=1 WHERE version=1")
        if cfg.graphiti_enabled:
            capture_preflight()
        self.shared = SharedWorkQueue(db) if cfg.graphiti_enabled else None
        self.graphiti_adapter = graphiti_adapter or DisabledGraphitiAdapter()
        # Injection-only until the exact installed Graphiti Python environment
        # and operator policy have been qualified. Never derive authority from
        # agent-supplied capture metadata or auto-enable in serve().
        self.source_resolver = source_resolver
        self._last_class = "GRAPHITI_EPISODE_INGEST"
        self._recovery_quiet_since: float | None = None
        self.quiet_since: float | None = None
        self._status_lock = threading.Lock()
        self._admission_status: dict[str, Any] = {
            "state": "starting",
            "updated_at": time.time(),
        }

    def admission_status(self) -> dict[str, Any]:
        with self._status_lock:
            return dict(self._admission_status)

    def _set_admission_status(self, state: str, **details: Any) -> None:
        status = {"state": state, "updated_at": time.time(), **details}
        with self._status_lock:
            previous = self._admission_status
            self._admission_status = status
        if previous.get("state") != state or previous.get("harnesses") != details.get("harnesses"):
            LOG.info("admission state=%s details=%s", state, details)

    def run(self) -> None:
        self.db.mark_unknown_claims()
        if self.shared:
            self.shared.recover_after_restart()
        LOG.info("worker started drain_enabled=%s", self.cfg.drain_enabled)
        while not self.stop_event.wait(self.cfg.poll_seconds):
            try:
                self.tick()
            except Exception:
                LOG.exception("worker iteration failed")
                self.quiet_since = None
                self._set_admission_status("worker_error")

    def _unresolved_graphiti_from_existing_db(self) -> bool:
        """The Graphiti opt-in toggle cannot erase a prior producer.

        In particular, cfg.graphiti_enabled=False must not disable global
        exclusion for Graphiti work already admitted in the shared SQLite.
        Inspect existing state without creating Graphiti tables in a legacy
        installation. If the state table exists but is unreadable or has a
        broken schema, fail closed rather than admitting another producer.
        """
        with self.db.connect() as conn:
            found = conn.execute("""SELECT 1 FROM sqlite_master
                WHERE type='table' AND name='memory_work'""").fetchone()
            if not found:
                return False
            return conn.execute("""SELECT 1 FROM memory_work
                WHERE status IN ('admitted','processing','blocked_reconcile')
                LIMIT 1""").fetchone() is not None

    def tick(self) -> bool:
        # Admission safety survives a later config disable, even though
        # new Graphiti admissions are disabled and no optional schema is
        # initialized. Unknown prior producers must remain globally fenced.
        if not self.cfg.graphiti_enabled:
            try:
                unresolved = self._unresolved_graphiti_from_existing_db()
            except Exception:
                self.quiet_since = None
                self._set_admission_status("graphiti_state_unverifiable")
                return False
            if unresolved:
                self.quiet_since = None
                self._set_admission_status("blocked_reconcile")
                return False
        if not self.cfg.drain_enabled:
            self.quiet_since = None
            self._set_admission_status("drain_disabled")
            return False
        if self.cfg.receipts_enabled and self.db.has_unknown_claim():
            harnesses=self._active_harness_processes()
            if harnesses:
                self._recovery_quiet_since=None
                self._set_admission_status("harness_active",harnesses=harnesses)
                return False
            handle = self._try_exclusive_lock()
            if handle is None:
                self._recovery_quiet_since=None
                self._set_admission_status("shared_lease_active")
                return False
            try:
                for unknown in self.db.unknown_rows():
                    self._receipt_observation(unknown,allow_recovery=self._receipt_recovery_admitted(unknown))
            finally:
                handle.close()
        inflight = self.db.inflight()
        if self.shared and self.shared.unresolved():
            # Reconcile a previously sealed OWNED Graphiti receipt read-only;
            # never retry the old episode on restart or transport ambiguity.
            unresolved = self.shared.unresolved()
            if unresolved["status"] == "blocked_reconcile" and unresolved["backend_identity"]:
                handle = self._try_exclusive_lock()
                if handle is not None:
                    try:
                        receipt = self.graphiti_adapter.poll(unresolved["backend_identity"])
                        if (isinstance(receipt,dict)
                                and receipt.get("backend_identity")==unresolved["backend_identity"]
                                and receipt.get("status")=="completed"
                                and receipt.get("persisted") is True):
                            self.shared.reconcile(unresolved["work_key"],unresolved["backend_identity"],"completed")
                    except Exception:
                        pass  # Absence of authoritative proof is never safe release.
                    finally:
                        fcntl.flock(handle.fileno(),fcntl.LOCK_UN)
                        handle.close()
            if self.shared.unresolved():
                self.quiet_since = None
                self._set_admission_status("blocked_reconcile")
                return False
        candidate = inflight or self.db.next_ready()
        if (self.shared is not None and self.source_resolver is not None
                and not isinstance(self.graphiti_adapter, DisabledGraphitiAdapter)):
            # Source verification is CPU-only and bounded; candidate selection
            # remains subject to all global admission + publication barriers.
            self.shared.auto_admit(self.source_resolver)
        graph_candidate = self.shared.ready() if self.shared else None
        if candidate is None and graph_candidate is None:
            self.quiet_since = None
            self._set_admission_status("queue_empty")
            return False
        if isinstance(self.graphiti_adapter, DisabledGraphitiAdapter):
            graph_candidate = None
            if candidate is None:
                self._set_admission_status("graphiti_disabled")
                return False
        selected_graphiti = False
        if not inflight and graph_candidate is not None:
            selected_graphiti = candidate is None or self._last_class == "OPENVIKING_SESSION_COMMIT"
        harnesses = self._active_harness_processes()
        if harnesses:
            self.quiet_since = None
            self._set_admission_status("harness_active", harnesses=harnesses)
            return False
        lock_handle = self._try_exclusive_lock()
        if lock_handle is None:
            self._recovery_quiet_since=None
            self.quiet_since = None
            self._set_admission_status("shared_lease_active")
            return False
        try:
            # The initial Graphiti check is only an early rejection. The
            # authoritative recheck MUST be under the EX flock: another
            # coordinator can claim a Graphiti job while we wait for it.
            # Do not let config disablement release an old producer.
            try:
                graphiti_unresolved = self._unresolved_graphiti_from_existing_db()
            except Exception:
                self.quiet_since = None
                self._set_admission_status("graphiti_state_unverifiable")
                return False
            if graphiti_unresolved:
                self.quiet_since = None
                self._set_admission_status("blocked_reconcile")
                return False
            if inflight is not None and inflight["task_id"]:
                # Already submitted: the running scheduler occupancy is this
                # operation's own activity, not a new pre-admission veto.
                self._set_admission_status("reconciling_commit")
                self._process(inflight)
                self.quiet_since = None
                return True
            if self.db.has_unknown_claim() is True and not self._unknown_quiescent():
                self.quiet_since = None
                self._set_admission_status("unknown_quiescence_unavailable")
                return False
            running, waiting = self._metrics()
            if running != 0 or waiting != 0:
                self.quiet_since = None
                self._set_admission_status(
                    "vllm_busy", requests_running=running, requests_waiting=waiting
                )
                return False
            now = time.monotonic()
            if self.quiet_since is None:
                self.quiet_since = now
                self._set_admission_status(
                    "quiet_grace",
                    quiet_elapsed_seconds=0.0,
                    quiet_required_seconds=self.cfg.quiet_grace_seconds,
                )
                return False
            if now - self.quiet_since < self.cfg.quiet_grace_seconds:
                self._set_admission_status(
                    "quiet_grace",
                    quiet_elapsed_seconds=round(now - self.quiet_since, 3),
                    quiet_required_seconds=self.cfg.quiet_grace_seconds,
                )
                return False
            # The lock has remained exclusively obtainable and vLLM idle for the
            # grace period. Re-check metrics while retaining this lock.
            if self.db.has_unknown_claim() is True and not self._unknown_quiescent():
                self.quiet_since = None
                self._set_admission_status("unknown_quiescence_unavailable")
                return False
            running, waiting = self._metrics()
            if running != 0 or waiting != 0:
                self.quiet_since = None
                self._set_admission_status(
                    "vllm_busy", requests_running=running, requests_waiting=waiting
                )
                return False
            if selected_graphiti:
                row = self.shared.claim(graph_candidate["work_key"], f"gate:{os.getpid()}:{time.time_ns()}")
                if row is None:
                    self.quiet_since = None
                    self._set_admission_status("candidate_changed")
                    return False
                self._set_admission_status("processing_graphiti", work_key=row["work_key"])
                self._process_graphiti(row)
                self._last_class = "GRAPHITI_EPISODE_INGEST"
                self.quiet_since = None
                return True
            row = candidate if candidate["state"] == "inflight" else self.db.claim(candidate)
            if row is None:
                self.quiet_since = None
                self._set_admission_status("candidate_changed")
                return False
            self._set_admission_status("committing", session_id=str(row["session_id"]))
            self._process(row)
            self._last_class = "OPENVIKING_SESSION_COMMIT"
            self.quiet_since = None
            return True
        finally:
            fcntl.flock(lock_handle.fileno(), fcntl.LOCK_UN)
            lock_handle.close()

    def _unknown_quiescent(self) -> bool:
        # Installed commit_async publishes a durable archive marker BEFORE task
        # registration. A timed-out request can still enqueue extraction later,
        # even while the task list and scheduler are empty. Neither observation
        # proves quiescence. No authoritative combined publication/task/queue
        # barrier is available to this coordinator; retain the unknown claim.
        return False

    def _process_graphiti(self, row: sqlite3.Row) -> None:
        key = str(row["work_key"])
        generation = int(row["attempt_generation"])
        backend_identity = None
        try:
            # Persist stable backend identity BEFORE submission. If the
            # worker dies after Graphiti's graph write but before returning,
            # the source/work identity is still reconstructible on restart.
            backend_identity = key
            self.shared.processing(key,generation,backend_identity)
            returned = self.graphiti_adapter.submit(json.loads(row["candidate_json"]))
            if returned != backend_identity:
                self.shared.block(key,"submit_identity_mismatch")
                return
            deadline = time.monotonic() + self.cfg.task_timeout_seconds
            while not self.stop_event.is_set() and time.monotonic() < deadline:
                result = self.graphiti_adapter.poll(backend_identity)
                if not isinstance(result, dict) or result.get("backend_identity") != backend_identity:
                    self.shared.block(key, "observer_identity_mismatch")
                    return
                status = result.get("status")
                if status == "completed" and result.get("persisted") is True:
                    self.shared.finish(key, generation, backend_identity, "completed")
                    return
                if status == "failed":
                    self.shared.finish(key, generation, backend_identity, "failed")
                    return
                if status not in ("queued", "processing"):
                    self.shared.block(key, "observer_unknown_status")
                    return
                self.stop_event.wait(self.cfg.task_poll_seconds)
            self.shared.block(key, "observer_interrupted")
        except Exception:
            self.shared.block(key, "submit_or_observer_ambiguous")

    def _active_harness_processes(self, proc_root: str = "/proc") -> list[dict[str, Any]]:
        """Return interactive harnesses, excluding persistent editor/server helpers."""
        wanted = set(self.cfg.process_names)
        if not wanted:
            return []
        matches: list[dict[str, Any]] = []
        try:
            entries = os.scandir(proc_root)
        except OSError:
            # A missing/unreadable process view is not evidence of idleness.
            return [{"pid": None, "comm": "unknown", "command": "process view unavailable"}]
        with entries:
            for entry in entries:
                if not entry.name.isdigit():
                    continue
                try:
                    comm = Path(entry.path, "comm").read_text(encoding="utf-8").strip()
                except OSError:
                    continue

                matched_harness = None
                for name in wanted:
                    aliases = HARNESS_ALIASES.get(name, {})
                    comm_set = aliases.get("comm", {name, name[:15]})
                    if comm in comm_set or comm == name or (len(name) > 15 and comm == name[:15]):
                        matched_harness = name
                        break

                if not matched_harness:
                    continue

                try:
                    raw_cmdline = Path(entry.path, "cmdline").read_bytes()
                    argv = [
                        part.decode(errors="replace")
                        for part in raw_cmdline.split(b"\0")
                        if part
                    ]
                except OSError:
                    raw_cmdline = b""
                    argv = []

                # Filter out Electron / Chromium helper sub-processes
                if b"--type=" in raw_cmdline or any("--type=" in arg for arg in argv):
                    continue
                argv0_name = Path(argv[0].split()[0]).name if argv else ""
                if comm == "chrome_crashpad" or "crashpad" in argv0_name:
                    continue

                ignored = NON_INTERACTIVE_HARNESS_SUBCOMMANDS.get(matched_harness, set())
                if ignored.intersection(argv[1:]):
                    continue
                matches.append(
                    {
                        "pid": int(entry.name),
                        "comm": comm,
                        "command": " ".join(argv)[:500] if argv else comm,
                    }
                )
        return sorted(matches, key=lambda item: int(item["pid"] or 0))



    def _harness_processes_active(self, proc_root: str = "/proc") -> bool:
        """Conservative fallback for harnesses launched before shims existed."""
        return bool(self._active_harness_processes(proc_root))

    def _try_exclusive_lock(self):
        path = Path(self.cfg.lock_file)
        path.parent.mkdir(parents=True, exist_ok=True)
        handle = open(path, "a+", encoding="utf-8")
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            return handle
        except BlockingIOError:
            handle.close()
            return None

    def _metrics(self) -> tuple[float, float]:
        urls = (self.cfg.metrics_url, *self.cfg.metrics_fallback_urls)
        last_error: Exception | None = None
        for index, url in enumerate(urls):
            try:
                with urllib.request.urlopen(url, timeout=5.0) as response:
                    if response.status != 200:
                        raise RuntimeError(f"scheduler metrics returned HTTP {response.status}")
                    payload = response.read().decode(errors="replace")
            except urllib.error.HTTPError as exc:
                last_error = exc
                if exc.code == 404 and index + 1 < len(urls):
                    continue
                raise
            except urllib.error.URLError as exc:
                last_error = exc
                if index + 1 < len(urls):
                    continue
                raise
            return parse_vllm_metrics(
                payload,
                self.cfg.metrics_running,
                self.cfg.metrics_waiting,
            )
        assert last_error is not None
        raise last_error

    def _auth_headers(self, row: sqlite3.Row) -> dict[str, str]:
        api_key = os.environ.get("OPENVIKING_ROOT_API_KEY") or os.environ.get("OPENVIKING_API_KEY")
        if not api_key:
            raise RuntimeError("OPENVIKING_ROOT_API_KEY or OPENVIKING_API_KEY is required")
        headers = {"Authorization": f"Bearer {api_key}"}
        if row["account"]:
            headers["X-OpenViking-Account"] = row["account"]
        if row["user_id"]:
            headers["X-OpenViking-User"] = row["user_id"]
        if row["actor_peer"]:
            headers["X-OpenViking-Actor-Peer"] = row["actor_peer"]
        return headers

    def _process(self, row: sqlite3.Row) -> None:
        if self.cfg.receipts_enabled:
            self._process_receipted(row)
            return
        submission_started = False
        status_received = False
        ambiguous_ack = False
        try:
            if row["task_id"]:
                self._wait_task(row, str(row["task_id"]))
                return
            session = urllib.parse.quote(str(row["session_id"]), safe="")
            url = f"http://{self.cfg.backend_host}:{self.cfg.backend_port}/api/v1/sessions/{session}/commit"
            headers = self._auth_headers(row)
            body = json.loads(row["commit_body_json"] or "{}")
            submission_started = True
            status, payload = json_request(
                "POST",
                url,
                headers=headers,
                body=body,
                timeout=self.cfg.request_timeout_seconds,
            )
            status_received = True
            if status < 200 or status >= 300:
                message = f"commit HTTP {status}: {payload.get('error', payload)}"
                ambiguous_ack = True
                error = payload.get("error")
                details = error.get("details", {}) if isinstance(error, dict) else {}
                if details.get("task_id"):
                    # Installed backend reports archived=True and task_id on
                    # task-store/enqueue errors after Phase 1 publication.
                    self.db.set_task(row, str(details["task_id"]))
                    self._wait_task(self.db.inflight() or row, str(details["task_id"]))
                    return
                missing_session = error == "Session not found" or (
                    isinstance(error, dict) and error.get("code") == "NOT_FOUND"
                    and details.get("type") == "session"
                    and details.get("resource") == str(row["session_id"])
                )
                if status == 404 and missing_session and not details.get("archived"):
                    raise TerminalCommitError(message)
                ambiguous_ack = True  # HTTP error is not proof of non-acceptance.
                raise RuntimeError(message)
            ambiguous_ack = True  # Every acknowledged POST needs terminal/task proof.
            result = payload.get("result") or {}
            task_id = result.get("task_id")
            commit_status = str(result.get("status") or "").lower()
            if not task_id:
                # Installed commit_async uses `skipped` for an operation that did
                # not publish an archive or enqueue extraction. Generic `ok`,
                # `complete`, and `completed` without a task ID are not durable
                # terminal evidence and must never release the inference gate.
                if (status == 200 and commit_status == "skipped"
                        and result.get("archived") is False
                        and result.get("archive_uri") is None):
                    self.db.complete(row, outcome=commit_status)
                    LOG.info("commit skipped without task session=%s", row["session_id"])
                    return
                ambiguous_ack = True
                raise RuntimeError(f"commit response has no verified terminal or task identity: status={commit_status!r}")
            self.db.set_task(row, str(task_id))
            row = self.db.inflight() or row
            LOG.info("commit accepted session=%s task=%s", row["session_id"], task_id)
            self._wait_task(row, str(task_id))
        except TerminalCommitError as exc:
            LOG.warning("commit dead-lettered session=%s error=%s", row["session_id"], exc)
            self.db.dead_letter(self.db.inflight() or row, str(exc))
        except TaskFailed as exc:
            LOG.warning(
                "commit task failed session=%s task=%s error=%s failure_kind=%s",
                row["session_id"], exc.task_id, exc, exc.failure_kind
            )
            current = self.db.inflight() or row
            self.db.task_failed(
                current,
                error=str(exc),
                task_id=str(exc.task_id or current["task_id"] or ""),
                failure_kind=exc.failure_kind,
                archive_uri=exc.archive_uri,
            )
        except Exception as exc:
            LOG.warning("commit deferred session=%s error=%s", row["session_id"], exc)
            current = self.db.inflight()
            if current is not None and current["task_id"]:
                # Preserve a known in-flight task for later status polling.
                return
            if (submission_started and not status_received) or ambiguous_ack:
                self.db.mark_unknown(current or row)
                return
            self.db.retry(current or row, str(exc), self.cfg)

    def _receipt_url(self, row, attempt):
        session = urllib.parse.quote(str(row["session_id"]),safe="")
        return f"http://{self.cfg.backend_host}:{self.cfg.backend_port}/api/v1/admin/commit_receipts/{session}/{attempt['request_key']}"

    def _receipt_recovery_admitted(self, row):
        # The backend's per-request fence does not serialize different keys.
        # Another unproven/queued task can exist while metrics report idle.
        # Read-only receipt polling remains permitted; this only guards
        # recovery that can enqueue extraction under the exclusive gate flock.
        with self.db.connect() as conn:
            other = conn.execute("""
                SELECT 1 FROM intents
                 WHERE state IN ('unknown','inflight')
                   AND NOT (account=? AND user_id=? AND actor_peer=?
                            AND session_id=? AND claimed_generation=?)
                 LIMIT 1
            """, (row["account"],row["user_id"],row["actor_peer"],
                  row["session_id"],row["claimed_generation"])).fetchone()
        if other is not None:
            self._recovery_quiet_since = None
            return False
        # Recovery may enqueue the exact old task. It is an inference-producing
        # action and needs independent idle/grace admission under the EX lease.
        try:
            if self._metrics() != (0,0):
                self._recovery_quiet_since=None
                return False
            now=time.monotonic()
            if self._recovery_quiet_since is None:
                self._recovery_quiet_since=now
                return False
            if now-self._recovery_quiet_since < self.cfg.quiet_grace_seconds:return False
            admitted=self._metrics()==(0,0)
            self._recovery_quiet_since=None
            return admitted
        except Exception:
            self._recovery_quiet_since=None
            return False

    def _receipt_observation(self, row, payload=None, *, allow_recovery=False):
        attempt = self.db.attempt(row)
        if attempt is None: return False  # Historical unknowns have no invented key.
        try:
            if payload is None:
                status,payload=json_request("GET",self._receipt_url(row,attempt)+("?recover=true" if allow_recovery else ""),headers=self._auth_headers(row),timeout=self.cfg.request_timeout_seconds)
                if status != 200: return False
            scope={k:str(row[k]) for k in ("account","user_id","actor_peer","session_id")}
            receipt=payload.get("result")
            decision,value=gate_decision(receipt,key=attempt["request_key"],scope=scope,body_digest=attempt["body_digest"])
            if decision == "TRACK":
                self.db.adopt_receipt_task(row,value)
                return False
            if decision == "RELEASE":
                if value == "skipped" or value == "completed":
                    if row["state"] == "unknown": self.db.adopt_receipt_task(row,receipt.get("task_id"))
                    self.db.complete(row,outcome=value)
                else:
                    self.db.adopt_receipt_task(row,receipt["task_id"])
                    current=self.db.inflight()
                    self.db.task_failed(current,error=f"receipt terminal {value}",task_id=receipt["task_id"],failure_kind=value)
                return True
        except Exception:
            return False
        return False

    def _process_receipted(self, row):
        attempt=self.db.attempt(row)
        if attempt is None:
            self.db.mark_unknown(row)
            return
        try:
            headers=self._auth_headers(row)
            if not attempt["submitted"]:
                envelope={"scope":{k:str(row[k]) for k in ("account","user_id","actor_peer","session_id")},
                    "generation":attempt["generation"],"body":json.loads(attempt["body_json"]),"body_digest":attempt["body_digest"]}
                with self.db.connect() as conn:
                    conn.execute("UPDATE commit_attempts SET submitted=1 WHERE request_key=?",(attempt["request_key"],))
                status,payload=json_request("POST",self._receipt_url(row,attempt),headers=headers,body=envelope,timeout=self.cfg.request_timeout_seconds)
                if status != 200:
                    self.db.mark_unknown(self.db.inflight() or row)
                    return
                if self._receipt_observation(row,payload): return
            deadline=time.monotonic()+self.cfg.task_timeout_seconds
            while not self.stop_event.is_set() and time.monotonic()<deadline:
                current = self.db.inflight() or row
                if self._receipt_observation(current,allow_recovery=self._receipt_recovery_admitted(current)): return
                self.stop_event.wait(self.cfg.task_poll_seconds)
            self.db.mark_unknown(self.db.inflight() or row)
        except Exception:
            self.db.mark_unknown(self.db.inflight() or row)

    def _wait_task(self, row: sqlite3.Row, task_id: str) -> None:
        deadline = time.monotonic() + self.cfg.task_timeout_seconds
        quoted = urllib.parse.quote(task_id, safe="")
        url = f"http://{self.cfg.backend_host}:{self.cfg.backend_port}/api/v1/tasks/{quoted}"
        while not self.stop_event.is_set() and time.monotonic() < deadline:
            status, payload = json_request(
                "GET", url, headers=self._auth_headers(row), timeout=self.cfg.request_timeout_seconds
            )
            if status < 200 or status >= 300:
                raise RuntimeError(f"task HTTP {status}: {payload.get('error', payload)}")
            result = payload.get("result") or payload
            task_status = str(result.get("status") or "").lower()
            if task_status in TERMINAL_OK:
                self.db.complete(row, outcome=task_status)
                LOG.info("commit completed session=%s task=%s", row["session_id"], task_id)
                return
            if task_status in TERMINAL_FAILED:
                error_msg = str(result.get("error") or f"task {task_id} ended with status {task_status}")
                failure_kind = result.get("failure_kind")
                if not failure_kind:
                    if "parse_error" in error_msg:
                        failure_kind = "parse_error"
                    elif "empty_response" in error_msg:
                        failure_kind = "empty_response"
                archive_uri = result.get("archive_uri") or (result.get("meta") or {}).get("archive_uri")
                raise TaskFailed(
                    error_msg,
                    task_id=task_id,
                    failure_kind=failure_kind,
                    archive_uri=archive_uri,
                )
            self.stop_event.wait(self.cfg.task_poll_seconds)
        raise TimeoutError(f"task {task_id} did not finish within timeout")


class GateServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True
    request_queue_size = 128

    def __init__(self, cfg: Config, db: QueueDB, worker: Worker | None = None):
        super().__init__((cfg.listen_host, cfg.listen_port), GateHandler)
        self.cfg = cfg
        self.db = db
        self.worker = worker


class GateHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "OpenVikingCommitGate/1.0"

    def do_GET(self):
        path = urllib.parse.urlsplit(self.path).path
        if path == "/__commit_gate/health":
            admission = (
                self.server.worker.admission_status()
                if self.server.worker is not None
                else {"state": "unavailable"}
            )
            self._json(
                200,
                {"status": "ok", "result": {"admission": admission, "queue": self.server.db.summary()}},
            )
            return
        if path == "/__commit_gate/queue":
            if not self._admin_authorized():
                self._json(401, {"status": "error", "error": {"message": "Unauthorized"}})
                return
            self._json(
                200,
                {
                    "status": "ok",
                    "result": {
                        "queue": self.server.db.list_rows(),
                        "unresolved_failures": self.server.db.list_unresolved_failures(),
                    },
                },
            )
            return
        if path == "/__commit_gate/memory_work":
            if not self._admin_authorized():
                self._json(401, {"status": "error", "error": {"message": "Unauthorized"}})
                return
            work = self.server.worker.shared if self.server.worker else None
            self._json(200, {"status": "ok", "result": {"work": work.status() if work else []}})
            return
        if path in {"/__commit_gate/failures", "/__commit_gate/unresolved"}:
            if not self._admin_authorized():
                self._json(401, {"status": "error", "error": {"message": "Unauthorized"}})
                return
            self._json(
                200,
                {
                    "status": "ok",
                    "result": {
                        "unresolved_failures": self.server.db.list_unresolved_failures(),
                    },
                },
            )
            return
        self._proxy()

    def do_HEAD(self):
        self._proxy()

    def do_POST(self):
        path = urllib.parse.urlsplit(self.path).path
        if path == "/__commit_gate/memory_candidates":
            if not self._capture_authorized():
                self._json(401, {"status": "error", "error": {"message": "Unauthorized"}})
                return
            work = self.server.worker.shared if self.server.worker else None
            if work is None:
                self._json(409, {"status": "disabled"})
                return
            try:
                candidate = json.loads(self._read_body(8192))
                queued = work.enqueue(candidate)
                self._json(202, {"status": "ok", "result": queued})
            except SourceEventConflict as exc:
                self._json(409, {"status": "conflict", "error": {"code": exc.code}})
            except SourceAuthorityUnavailable as exc:
                self._json(422, {"status": "deferred", "error": {"code": exc.code}})
            except (ValueError, json.JSONDecodeError):
                self._json(400, {"status": "error", "error": {"message": "Invalid candidate"}})
            return
        match = COMMIT_RE.match(path)
        if match:
            self._enqueue(match.group(1))
            return
        self._proxy()

    def do_PUT(self):
        self._proxy()

    def do_PATCH(self):
        self._proxy()

    def do_DELETE(self):
        self._proxy()

    def do_OPTIONS(self):
        self._proxy()

    def log_message(self, fmt: str, *args: Any) -> None:
        LOG.info("http client=%s " + fmt, self.client_address[0], *args)

    def _read_body(self, limit: int | None = None) -> bytes:
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length < 0 or (limit is not None and length > limit):
            raise ValueError("request body exceeds configured limit")
        return self.rfile.read(length) if length else b""

    def _identity(self) -> dict[str, str]:
        return {
            "account": self.headers.get("X-OpenViking-Account", "").strip(),
            "user_id": self.headers.get("X-OpenViking-User", "").strip(),
            "actor_peer": self.headers.get("X-OpenViking-Actor-Peer", "").strip(),
        }

    def _capture_credential_supplied(self) -> bool:
        token = os.environ.get("GRAPHITI_CAPTURE_TOKEN", "")
        return bool(token) and hmac.compare_digest(self.headers.get("Authorization", ""), f"Bearer {token}")

    def _capture_authorized(self) -> bool:
        # This credential permits bounded, unverified proposals only. It cannot
        # proxy, read admin state, commit, attest facts or schedule inference.
        token = os.environ.get("GRAPHITI_CAPTURE_TOKEN", "")
        root = os.environ.get("OPENVIKING_ROOT_API_KEY") or os.environ.get("OPENVIKING_API_KEY", "")
        if not token or (root and hmac.compare_digest(token, root)):
            return False
        return hmac.compare_digest(self.headers.get("Authorization", ""), f"Bearer {token}")

    def _admin_authorized(self) -> bool:
        if self._capture_credential_supplied():
            return False
        api_key = os.environ.get("OPENVIKING_ROOT_API_KEY") or os.environ.get(
            "OPENVIKING_API_KEY", ""
        )
        supplied = self.headers.get("Authorization", "")
        return bool(api_key) and hmac.compare_digest(supplied, f"Bearer {api_key}")

    def _enqueue(self, encoded_session: str) -> None:
        if self._capture_credential_supplied():
            self._json(401, {"status": "error", "error": {"message": "Capture credential has no commit authority"}})
            return
        try:
            session_id = urllib.parse.unquote(encoded_session).strip()
            if not session_id or "/" in session_id or len(session_id) > 255:
                raise ValueError("invalid session id")
            raw = self._read_body(self.server.cfg.max_commit_body_bytes)
            body = json.loads(raw or b"{}")
            if not isinstance(body, dict):
                raise ValueError("commit body must be a JSON object")
            keep_recent = body.get("keep_recent_count", 0)
            if isinstance(keep_recent, bool):
                raise ValueError("keep_recent_count must be an integer")
            keep_recent = int(keep_recent)
            if keep_recent < 0 or keep_recent > 10000:
                raise ValueError("keep_recent_count must be between 0 and 10000")
            reason = self.headers.get("X-OpenViking-Commit-Reason", "client")[:120]
            queued = self.server.db.enqueue(
                self._identity(), session_id, keep_recent, body, reason
            )
            self._json(
                200,
                {
                    "status": "ok",
                    "result": {
                        "session_id": session_id,
                        "status": "queued",
                        "task_id": None,
                        "archive_uri": None,
                        "archived": False,
                        "broker_intent_id": queued["intent_id"],
                        "broker_generation": queued["generation"],
                    },
                },
            )
        except (ValueError, json.JSONDecodeError) as exc:
            self._json(400, {"status": "error", "error": {"message": str(exc)}})
        except Exception as exc:
            LOG.exception("failed to persist commit intent")
            self._json(503, {"status": "error", "error": {"message": str(exc)}})

    def _proxy(self) -> None:
        if self._capture_credential_supplied():
            self._json(401, {"status": "error", "error": {"message": "Capture credential has no proxy authority"}})
            return
        cfg = self.server.cfg
        response_started = False
        try:
            body = self._read_body()
            headers = {
                key: value
                for key, value in self.headers.items()
                if key.lower() not in HOP_HEADERS and key.lower() != "host"
            }
            headers["Host"] = f"{cfg.backend_host}:{cfg.backend_port}"
            headers["Connection"] = "close"
            conn = http.client.HTTPConnection(
                cfg.backend_host, cfg.backend_port, timeout=cfg.request_timeout_seconds
            )
            conn.request(self.command, self.path, body=body, headers=headers)
            response = conn.getresponse()
            self.send_response(response.status, response.reason)
            for key, value in response.getheaders():
                if key.lower() not in HOP_HEADERS:
                    self.send_header(key, value)
            self.send_header("Connection", "close")
            self.end_headers()
            response_started = True
            if self.command != "HEAD":
                while True:
                    chunk = response.read1(65536)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    self.wfile.flush()
            self.close_connection = True
            conn.close()
        except (BrokenPipeError, ConnectionResetError) as exc:
            LOG.info("proxy client disconnected method=%s path=%s error=%s", self.command, self.path, exc)
            self.close_connection = True
        except Exception as exc:
            LOG.warning("backend proxy failed method=%s path=%s error=%s", self.command, self.path, exc)
            if not response_started:
                self._json(502, {"status": "error", "error": {"message": "OpenViking backend unavailable"}})
            else:
                self.close_connection = True

    def _json(self, status: int, payload: dict[str, Any]) -> None:
        try:
            data = json.dumps(payload, separators=(",", ":")).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Connection", "close")
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            LOG.info("client disconnected before JSON response path=%s", self.path)
        finally:
            self.close_connection = True


def serve(cfg: Config) -> None:
    db = QueueDB(cfg.database)
    stop_event = threading.Event()
    graphiti_adapter, source_resolver = (None, None)
    if cfg.graphiti_enabled:
        from graphiti_runtime_bootstrap import build_runtime
        graphiti_adapter, source_resolver = build_runtime(cfg, db)
    worker = Worker(cfg, db, stop_event, graphiti_adapter, source_resolver)
    server = GateServer(cfg, db, worker)
    worker_thread = threading.Thread(target=worker.run, name="commit-worker", daemon=True)

    def stop(signum, frame):
        LOG.info("received signal %s", signum)
        stop_event.set()
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    worker_thread.start()
    LOG.info(
        "gateway listening on %s:%s backend=%s:%s",
        cfg.listen_host,
        cfg.listen_port,
        cfg.backend_host,
        cfg.backend_port,
    )
    try:
        server.serve_forever(poll_interval=0.5)
    finally:
        stop_event.set()
        server.server_close()
        worker_thread.join(timeout=5)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--config",
        default=os.environ.get(
            "OPENVIKING_COMMIT_GATE_CONFIG",
            "~/.config/openviking/commit-gate.toml",
        ),
    )
    parser.add_argument("command", nargs="?", choices=("serve", "status", "unresolved"), default="serve")
    args = parser.parse_args()
    cfg = Config.load(_expanded(args.config))
    logging.basicConfig(
        level=os.environ.get("OPENVIKING_COMMIT_GATE_LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    if args.command == "status":
        print(json.dumps(QueueDB(cfg.database).list_rows(), indent=2, sort_keys=True))
        return 0
    if args.command == "unresolved":
        print(json.dumps(QueueDB(cfg.database).list_unresolved_failures(), indent=2, sort_keys=True))
        return 0
    serve(cfg)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
