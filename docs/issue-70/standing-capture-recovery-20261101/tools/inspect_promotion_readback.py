#!/usr/bin/env python3
"""Inspect the existing OpenViking receipt and Graphiti work; no writes or retries.

Reads existing SQLite files with mode=ro. Never prints session IDs, tenant
identities, secrets, candidate contents, scopes, task IDs, or database paths.
"""
from __future__ import annotations
import argparse
import json
import sqlite3
from pathlib import Path

REQUEST_KEY = "7d9010aaef66f2b7eefa597f8de220073e8c1a7c48bc6fbfe1935345cfe01ecf"
BODY_DIGEST = "42af323a6e06f50bcc33a4ba5b5ee754f35a9b209adee7375ad8f1320029e0be"
WORK_KEY = "a7877b6c3484049f808c6bdbb11b135338f2363dffe7f1e02b30b8af04874604"
GROUP = "ghdev_gh_mcp"

class StateMismatch(Exception):
    pass

def fetch(conn: sqlite3.Connection, table: str, key: str, value: str):
    if table not in {"commit_attempts", "intents", "memory_work", "graphiti_ingest_receipts", "commit_receipts"}:
        raise ValueError("table not allowlisted")
    if key not in {"request_key", "work_key"}:
        raise ValueError("column not allowlisted")
    return conn.execute(f"SELECT * FROM {table} WHERE {key}=?", (value,)).fetchone()

def check_state(attempt, intent, receipt, work, ingest) -> dict:
    """All arguments are plain mappings from the two source-owned ledgers."""
    if attempt is None or intent is None or work is None:
        raise StateMismatch("missing original request/intent/work")
    if (attempt["request_key"] != REQUEST_KEY or
        attempt["body_digest"] != BODY_DIGEST or
        attempt["generation"] != 1):
        raise StateMismatch("original immutable request identity drift")
    if any(attempt[k] != intent[k] for k in ("account", "user_id", "actor_peer", "session_id")):
        raise StateMismatch("request and intent scope mismatch")
    if work["work_key"] != WORK_KEY or work["destination_scope"] != GROUP:
        raise StateMismatch("Graphiti work identity or group mismatch")
    if receipt is None:
        ov = "BACKEND_RECEIPT_ABSENT"
    else:
        try:
            receipt_scope = json.loads(receipt["scope_json"])
        except (ValueError, TypeError, KeyError) as exc:
            raise StateMismatch("invalid backend receipt scope") from exc
        if (receipt["request_key"] != REQUEST_KEY or receipt["body_digest"] != BODY_DIGEST or
            any(receipt_scope.get(k) != attempt[k] for k in ("account", "user_id", "actor_peer", "session_id"))):
            raise StateMismatch("backend receipt identity or scope mismatch")
        if receipt["state"] == "terminal":
            if receipt["outcome"] == "completed" and receipt["release_proven"] == 1 and receipt["task_id"]:
                ov = "BACKEND_COMPLETED_PROVEN"
            else:
                raise StateMismatch("backend terminal receipt is not a proven successful completion")
        else:
            ov = "BACKEND_" + str(receipt["state"]).upper()
    gate_complete = (intent["state"] == "complete" and
                     intent["last_terminal_outcome"] == "completed" and
                     intent["last_terminal_generation"] == 1 and
                     intent["processed_generation"] >= 1 and
                     attempt["resolved"] == 1 and attempt["submitted"] == 1)
    if gate_complete and ov == "BACKEND_COMPLETED_PROVEN":
        ov_status = "OV_COMPLETE_PROVEN"
    elif gate_complete:
        ov_status = "GATE_COMPLETED_BACKEND_NOT_PROVEN"
    elif ov == "BACKEND_COMPLETED_PROVEN":
        ov_status = "BACKEND_COMPLETED_GATE_NOT_RECONCILED"
    else:
        ov_status = "OV_PENDING_OR_UNVERIFIED"
    if ingest is not None and (ingest["work_key"] != WORK_KEY or ingest["group_id"] != GROUP):
        raise StateMismatch("Graphiti ingestion receipt identity mismatch")
    if work["status"] == "completed":
        if ingest is None or ingest["state"] != "completed" or not ingest["episode_uuid"]:
            raise StateMismatch("Graphiti completed without durable UUID receipt")
        graphiti = "GRAPHITI_COMPLETED_RECORDED"
    elif work["status"] == "queued" and ingest is None and work["attempt_generation"] == 0 and work["backend_identity"] is None:
        graphiti = "GRAPHITI_QUEUED_UNCLAIMED"
    else:
        graphiti = "GRAPHITI_RECONCILIATION_REQUIRED"
    if ov_status == "OV_COMPLETE_PROVEN" and graphiti == "GRAPHITI_QUEUED_UNCLAIMED":
        decision = "RESUME_EXISTING_GRAPHITI_DRAIN_ONLY"
    elif ov_status == "OV_COMPLETE_PROVEN" and graphiti == "GRAPHITI_COMPLETED_RECORDED":
        decision = "VERIFY_RECALL_AND_STANDING_CONFIG"
    else:
        decision = "STOP_AND_RECONCILE_EXACT_STATE"
    return {"openviking": ov_status, "openviking_gate_state": intent["state"],
            "backend_receipt_state": receipt["state"] if receipt else "ABSENT",
            "backend_receipt_outcome": receipt["outcome"] if receipt else None,
            "backend_release_proven": receipt["release_proven"] if receipt else None,
            "graphiti": graphiti, "graphiti_work_state": work["status"],
            "graphiti_attempt_generation": work["attempt_generation"],
            "graphiti_receipt_state": ingest["state"] if ingest else "ABSENT",
            "graphiti_episode_uuid": ingest["episode_uuid"] if graphiti == "GRAPHITI_COMPLETED_RECORDED" else None,
            "decision": decision}

def read_existing(path: Path):
    if not path.is_file() or path.is_symlink():
        raise StateMismatch("required database unavailable or symlinked")
    conn = sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True, timeout=3)
    conn.row_factory = sqlite3.Row
    return conn

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gate-db", type=Path, default=Path.home()/".local/state/openviking-commit-gate/queue.sqlite3")
    parser.add_argument("--backend-db", type=Path, default=Path("/opt/openviking/data/_system/commit_receipts/commit_receipts.sqlite3"))
    args = parser.parse_args()
    try:
        with read_existing(args.gate_db) as gate, read_existing(args.backend_db) as backend:
            attempt = fetch(gate, "commit_attempts", "request_key", REQUEST_KEY)
            if attempt is None:
                raise StateMismatch("original commit attempt missing")
            intent = gate.execute(
                "SELECT * FROM intents WHERE account=? AND user_id=? AND actor_peer=? AND session_id=?",
                tuple(attempt[k] for k in ("account","user_id","actor_peer","session_id"))
            ).fetchone()
            work = fetch(gate, "memory_work", "work_key", WORK_KEY)
            ingest = fetch(gate, "graphiti_ingest_receipts", "work_key", WORK_KEY)
            receipt = fetch(backend, "commit_receipts", "request_key", REQUEST_KEY)
            result = check_state(attempt, intent, receipt, work, ingest)
            print(json.dumps(result, sort_keys=True))
            return 0 if result["decision"] != "STOP_AND_RECONCILE_EXACT_STATE" else 2
    except (StateMismatch, sqlite3.Error, OSError, KeyError, TypeError) as exc:
        print(json.dumps({"decision": "STOP_AND_RECONCILE_EXACT_STATE",
                          "reason": type(exc).__name__ + ": " + str(exc)}, sort_keys=True))
        return 2

if __name__ == "__main__":
    raise SystemExit(main())
