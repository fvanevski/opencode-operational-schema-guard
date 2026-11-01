#!/usr/bin/env python3
"""One-work-key recovery for an OpenViking receipt POST rejected before submission.

Dry-run by default. The operator must independently authenticate the backend's
pre-handler 503, configure a durable receipt DB, stop the gate, and approve
--apply. This program never issues an HTTP request or starts ingestion.
"""
from __future__ import annotations

import argparse
import fcntl
import os
import hashlib
import json
import sqlite3
import subprocess
from pathlib import Path

REQUEST_KEY = "7d9010aaef66f2b7eefa597f8de220073e8c1a7c48bc6fbfe1935345cfe01ecf"
BODY_DIGEST = "42af323a6e06f50bcc33a4ba5b5ee754f35a9b209adee7375ad8f1320029e0be"
WORK_KEY = "a7877b6c3484049f808c6bdbb11b135338f2363dffe7f1e02b30b8af04874604"
ACK = "REARM-ORIGINAL-OPENVIKING-REQUEST-" + REQUEST_KEY
SCOPE = ("account", "user_id", "actor_peer", "session_id")


class RecoveryBlocked(RuntimeError):
    pass


def digest(obj: object) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


def inspect(conn: sqlite3.Connection) -> dict:
    """Validate the exact durable state without reading or returning private bodies."""
    conn.row_factory = sqlite3.Row
    attempt = conn.execute("SELECT * FROM commit_attempts WHERE request_key=?", (REQUEST_KEY,)).fetchone()
    if attempt is None or attempt["generation"] != 1 or attempt["body_digest"] != BODY_DIGEST or attempt["submitted"] != 1 or attempt["resolved"] != 0:
        raise RecoveryBlocked("exact unresolved submitted attempt not present")
    if digest({"scope": {k: attempt[k] for k in SCOPE}, "generation": 1}) != REQUEST_KEY:
        raise RecoveryBlocked("request key disagrees with immutable scope/generation")
    if digest(json.loads(attempt["body_json"])) != BODY_DIGEST:
        raise RecoveryBlocked("attempt payload disagrees with immutable digest")
    key = tuple(attempt[k] for k in SCOPE)
    intent = conn.execute("SELECT * FROM intents WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?", key).fetchone()
    if intent is None:
        raise RecoveryBlocked("source intent missing")
    if (intent["state"] != "unknown" or intent["claimed_generation"] != 1 or
        intent["requested_generation"] != 1 or intent["processed_generation"] != 0 or
        intent["task_id"] is not None or intent["last_error"] != "ambiguous backend acknowledgment"):
        raise RecoveryBlocked("source intent drift: not the documented pre-handler case")
    if digest(json.loads(intent["commit_body_json"])) != BODY_DIGEST:
        raise RecoveryBlocked("intent payload drift")
    if conn.execute("SELECT COUNT(*) FROM intents WHERE state IN ('unknown','inflight')").fetchone()[0] != 1:
        raise RecoveryBlocked("additional unknown/inflight OpenViking claims")
    if conn.execute("SELECT COUNT(*) FROM commit_attempts WHERE resolved=0").fetchone()[0] != 1:
        raise RecoveryBlocked("additional unresolved attempts")
    work = conn.execute("SELECT * FROM memory_work WHERE work_key=?", (WORK_KEY,)).fetchone()
    if work is None or work["status"] != "queued" or work["attempt_generation"] != 0 or work["backend_identity"] is not None:
        raise RecoveryBlocked("queued Graphiti work changed or missing")
    if conn.execute("SELECT 1 FROM graphiti_ingest_receipts WHERE work_key=?", (WORK_KEY,)).fetchone() is not None:
        raise RecoveryBlocked("Graphiti already has a receipt for this work")
    if conn.execute("SELECT COUNT(*) FROM memory_work WHERE status IN ('admitted','processing','blocked_reconcile')").fetchone()[0]:
        raise RecoveryBlocked("another Graphiti operation requires reconciliation")
    return {"status": "ELIGIBLE_FOR_MANUAL_PRE_SUBMIT_REARM", "request_key": REQUEST_KEY,
            "work_key": WORK_KEY, "preserved_generation": 1,
            "operation": "reset only original attempt submitted flag and its original intent state to pending"}


def rearm(conn: sqlite3.Connection) -> dict:
    """Caller must hold an independent exclusive gate outage and prior-backend proof."""
    conn.execute("BEGIN IMMEDIATE")
    try:
        result = inspect(conn)  # Re-evaluate under writer lock, no stale snapshot.
        cur = conn.execute("UPDATE commit_attempts SET submitted=0 WHERE request_key=? AND submitted=1 AND resolved=0", (REQUEST_KEY,))
        if cur.rowcount != 1:
            raise RecoveryBlocked("attempt compare-and-swap failed")
        cur = conn.execute("""UPDATE intents SET state='pending',last_error=NULL
            WHERE account=(SELECT account FROM commit_attempts WHERE request_key=?)
              AND user_id=(SELECT user_id FROM commit_attempts WHERE request_key=?)
              AND actor_peer=(SELECT actor_peer FROM commit_attempts WHERE request_key=?)
              AND session_id=(SELECT session_id FROM commit_attempts WHERE request_key=?)
              AND state='unknown' AND claimed_generation=1 AND requested_generation=1
              AND processed_generation=0 AND task_id IS NULL""", (REQUEST_KEY,)*4)
        if cur.rowcount != 1:
            raise RecoveryBlocked("intent compare-and-swap failed")
        if conn.execute("SELECT submitted FROM commit_attempts WHERE request_key=?", (REQUEST_KEY,)).fetchone()[0] != 0:
            raise RecoveryBlocked("failed attempt readback")
        conn.commit()
        return {**result, "status": "REARMED_ORIGINAL_REQUEST", "commit_attempt_submitted": 0, "intent_state": "pending"}
    except BaseException:
        conn.rollback()
        raise


def safe_gate_stopped() -> None:
    proc = subprocess.run(["systemctl", "--user", "is-active", "openviking-commit-gate.service"],
                          text=True, capture_output=True, timeout=8, check=False)
    if proc.returncode == 0 or proc.stdout.strip() == "active":
        raise RecoveryBlocked("gate must be stopped before production rearm")
    if proc.stdout.strip() not in ("inactive", "failed"):
        raise RecoveryBlocked("gate stopped state cannot be authenticated")


def connect(path: Path, *, read_only: bool) -> sqlite3.Connection:
    if not path.is_file() or path.is_symlink():
        raise RecoveryBlocked("queue database path absent or symlinked")
    uri = path.resolve().as_uri() + ("?mode=ro" if read_only else "?mode=rw")
    conn = sqlite3.connect(uri, uri=True, isolation_level=None, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout=10000")
    return conn


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queue-db", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--affirm", default="")
    parser.add_argument("--backup-db", type=Path, help="fresh private path for complete SQLite backup (apply only)")
    parser.add_argument("--lease-lock", type=Path,
                        default=Path(os.environ.get("XDG_RUNTIME_DIR", f"/run/user/{os.getuid()}")) / "openviking-agent.lock")
    parser.add_argument("--backend-proof", type=Path,
                        help="operator-authenticated proof JSON, created only after enabling backend receipts")
    args = parser.parse_args()
    try:
        if args.apply:
            if args.affirm != ACK:
                raise RecoveryBlocked("explicit exact-request affirmation missing")
            if args.backend_proof is None or not args.backend_proof.is_file():
                raise RecoveryBlocked("backend negative-proof document missing")
            # This file is operator-provided evidence, NOT proof by itself. A separate
            # independent reviewer must authenticate the underlying live backend.
            evidence = json.loads(args.backend_proof.read_text())
            if not all(evidence.get(k) is True for k in (
                "http_503_prehandler_confirmed", "prior_backend_receipt_absent",
                "prior_backend_archive_absent", "backend_receipts_now_enabled",
                "operator_authorized_same_request_rearm")) or evidence.get("request_key") != REQUEST_KEY:
                raise RecoveryBlocked("backend proof predicates not satisfied")
            safe_gate_stopped()
            if args.backup_db is None or not args.backup_db.is_absolute() or args.backup_db.exists():
                raise RecoveryBlocked("fresh absolute private backup target required")
            if not args.backup_db.parent.is_dir() or args.backup_db.parent.stat().st_mode & 0o077:
                raise RecoveryBlocked("backup parent must exist and have private permissions")
        if args.apply:
            if not args.lease_lock.is_file():
                raise RecoveryBlocked("shared lease lock file unavailable")
            with args.lease_lock.open("r+") as lock:
                try:
                    fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                except BlockingIOError as exc:
                    raise RecoveryBlocked("shared harness lease held; exit local agents") from exc
                safe_gate_stopped()  # Check again while the exclusive lease is held.
                with connect(args.queue_db, read_only=True) as source:
                    inspect(source)
                    fd = os.open(args.backup_db, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
                    os.close(fd)
                    with sqlite3.connect(args.backup_db) as backup:
                        source.backup(backup)
                with connect(args.queue_db, read_only=False) as conn:
                    result = rearm(conn)
                fcntl.flock(lock.fileno(), fcntl.LOCK_UN)
            result["private_backup_created"] = True
        else:
            with connect(args.queue_db, read_only=True) as conn:
                result = inspect(conn)
        print(json.dumps(result, sort_keys=True))
        return 0
    except (RecoveryBlocked, sqlite3.Error, ValueError, OSError, KeyError, json.JSONDecodeError) as e:
        print(json.dumps({"status": "BLOCKED", "reason": str(e)}, sort_keys=True))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
