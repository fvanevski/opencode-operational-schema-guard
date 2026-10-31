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

    def admit_attested(self, candidate, envelope, *, source_authority):
        """Queue a previously deferred event ONLY after trusted source verification.

        The supplied envelope is produced by a separate authenticated source
        resolver, not by metadata in the OpenCode tool event. The caller is
        responsible for verifying real source ownership and operator opt-in.
        """
        if not isinstance(source_authority, str) or not source_authority:
            raise SourceAuthorityUnavailable("trusted authority identity missing")
        if not valid_candidate(candidate):
            raise ValueError("invalid original source candidate")
        item = normalized_candidate(candidate)
        key = work_key(item)
        if (envelope.work_key != key or envelope.source_event_key != source_key(item)
                or envelope.group_id != item["scope"]["group_id"]):
            raise SourceAuthorityUnavailable("source attestation identity mismatch")
        envelope.validate()
        exclusive=item["category"]=="exclusive_state_transition"
        if exclusive != (envelope.transition_contract is not None):
            raise SourceAuthorityUnavailable("exclusive state requires trusted bound contract")
        if exclusive:
            from temporal_ledger import validate_contract, digest as contract_digest
            contract_sha=validate_contract(envelope.transition_contract,item["scope"]["group_id"])
        with self.legacy_db.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute("""CREATE TABLE IF NOT EXISTS memory_source_attestations(
                work_key TEXT PRIMARY KEY, source_authority TEXT NOT NULL,
                attestation_digest TEXT NOT NULL, episode_digest TEXT NOT NULL,
                created_at REAL NOT NULL)""")
            row = conn.execute("SELECT * FROM memory_work WHERE work_key=?", (key,)).fetchone()
            if row is None or row["logical_digest"] != item["logical_digest"]:
                raise SourceEventConflict("source event was not durably nominated")
            prior = conn.execute("SELECT * FROM memory_source_attestations WHERE work_key=?", (key,)).fetchone()
            if prior is not None:
                if (prior["source_authority"] != source_authority
                        or prior["attestation_digest"] != envelope.attestation_digest
                        or prior["episode_digest"] != envelope.payload_hash()):
                    raise SourceEventConflict("source attestation changed after admission")
                return {"work_key":key,"status":row["status"]}
            if row["status"] != "deferred_unverified":
                raise SourceAuthorityUnavailable("source event is not awaiting verification")
            if exclusive:
                conn.execute("""CREATE TABLE IF NOT EXISTS temporal_transition_contracts(
                    work_key TEXT PRIMARY KEY, group_id TEXT NOT NULL,
                    contract_json TEXT NOT NULL, contract_digest TEXT NOT NULL,
                    attestation_digest TEXT NOT NULL, bound_at REAL NOT NULL)""")
                conn.execute("""INSERT INTO temporal_transition_contracts
                    VALUES (?,?,?,?,?,?)""",(key,item["scope"]["group_id"],
                    json.dumps(envelope.transition_contract,sort_keys=True),
                    contract_sha,envelope.attestation_digest,time.time()))
            conn.execute("""INSERT INTO memory_source_attestations
                VALUES (?,?,?,?,?)""",(key,source_authority,envelope.attestation_digest,
                                        envelope.payload_hash(),time.time()))
            changed = conn.execute("""UPDATE memory_work
                SET status='queued', error_code=NULL, updated_at=?
                WHERE work_key=? AND status='deferred_unverified'""",(time.time(),key))
            if changed.rowcount!=1: raise RuntimeError("attested admission race")
            return {"work_key":key,"status":"queued"}

    def auto_admit(self, source_resolver, *, max_items: int = 2) -> dict:
        """Verify already nominated events using an operator-owned authority.

        This runs in the existing coordinator worker, not an OpenCode context
        hook or a competing inference scheduler. It only promotes durable
        source nominations; actual Graphiti inference still requires the
        shared exclusive lock and all existing admission checks.
        """
        if source_resolver is None:
            return {"inspected": 0, "admitted": 0, "deferred": 0}
        policy = getattr(source_resolver, "policy", None)
        if (not isinstance(policy, dict) or policy.get("enabled") is not True
                or policy.get("source_type") != "git-record-v1"
                or not isinstance(policy.get("revision"), str)
                or not policy["revision"]):
            return {"inspected": 0, "admitted": 0, "deferred": 0}
        authority = "git-record-v1:" + policy["revision"]
        with self.legacy_db.connect() as conn:
            rows = conn.execute("""SELECT candidate_json FROM memory_work
                WHERE status='deferred_unverified' ORDER BY created_at, work_key LIMIT ?""",
                (max(1, min(8, max_items)),)).fetchall()
        totals = {"inspected": 0, "admitted": 0, "deferred": 0}
        for row in rows:
            totals["inspected"] += 1
            candidate = json.loads(row["candidate_json"])
            try:
                envelope = source_resolver(candidate)
            except ValueError:
                # Ineligible/unverified tool nominations never become runnable.
                # No permanent failure marking: a later authorized Git commit
                # or policy revision may make the source independently valid.
                totals["deferred"] += 1
                continue
            self.admit_attested(candidate, envelope, source_authority=authority)
            totals["admitted"] += 1
        return totals

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
            count = min(max(limit, 1), 100)
            columns = ("mw.work_key,mw.work_class,mw.source_event_id,mw.destination_scope,"
                       "mw.status,mw.attempt_generation,mw.backend_identity,"
                       "mw.lease_identity,mw.created_at,mw.updated_at,mw.error_code")
            has_temporal = conn.execute("""SELECT 1 FROM sqlite_master WHERE
                type='table' AND name='temporal_validation_results'""").fetchone()
            if not has_temporal:
                rows = conn.execute(f"SELECT {columns} FROM memory_work mw ORDER BY mw.created_at DESC LIMIT ?",(count,)).fetchall()
                return [dict(row) for row in rows]
            rows = conn.execute(f"""SELECT {columns},
                tc.work_key AS temporal_contract_key,
                tv.state AS temporal_state,tv.exit_code AS temporal_exit,
                tv.disposition AS temporal_disposition,tv.episode_uuid AS temporal_episode_uuid
                FROM memory_work mw
                LEFT JOIN temporal_transition_contracts tc ON tc.work_key=mw.work_key
                LEFT JOIN temporal_validation_results tv ON tv.work_key=mw.work_key
                ORDER BY mw.created_at DESC LIMIT ?""",(count,)).fetchall()
            outcomes={0:"PASS",1:"INCONSISTENT",2:"INCOMPLETE",3:"INVALID_INPUT"}
            response=[]
            for row in rows:
                record=dict(row)
                contract=record.pop("temporal_contract_key")
                state=record.pop("temporal_state")
                code=record.pop("temporal_exit")
                record["temporal_validation_status"]=(
                    "not_required" if contract is None else
                    outcomes.get(code,"UNVERIFIED") if state=="done" else "UNVERIFIED")
                response.append(record)
            return response


class DisabledGraphitiAdapter:
    def submit(self, candidate):
        raise RuntimeError("Graphiti terminal observation interface unavailable")

    def poll(self, backend_identity):
        raise RuntimeError("Graphiti terminal observation interface unavailable")
