"""Temporal-validator integration for the disposable Phase 2 qualification.

Reuses the existing qualified read-only ``graphiti_temporal_validator`` (no
duplication of its logic). For a declared mutually-exclusive state transition:

  * the transition contract is constructed from trusted source evidence and
    durably bound to the work key BEFORE extraction;
  * after Graphiti terminal persistence, the existing validator is invoked
    (live mode: MCP retrieval + FalkorDB completeness oracle) against the
    resulting disposable graph;
  * the four exit outcomes (0 PASS / 1 INCONSISTENT / 2 INCOMPLETE /
    3 INVALID_INPUT) are exercised and recorded.

A reported validator failure is a distinct post-write result; it never erases
the successful ingestion, rewrites history, or triggers re-ingestion.
"""
from __future__ import annotations

import asyncio
import hashlib
import importlib.util
import json
import sys
import tempfile
import threading
from dataclasses import replace
from pathlib import Path

PHASE2 = Path(__file__).resolve().parent
GATE = PHASE2.parent / "implementation" / "i1-integrated" / "candidate" / "gate"
sys.path.insert(0, str(GATE / "tests"))
sys.path.insert(0, str(GATE))
sys.path.insert(0, str(PHASE2))

# Canonical, already-qualified read-only validator (reused, not duplicated).
_VALIDATOR_PATH = "/tmp/opencode/graphiti_temporal_validator.py"
_spec = importlib.util.spec_from_file_location("graphiti_temporal_validator", _VALIDATOR_PATH)
gtv = importlib.util.module_from_spec(_spec)
sys.modules["graphiti_temporal_validator"] = gtv
_spec.loader.exec_module(gtv)

import importlib.util as _ilu

_spec2 = _ilu.spec_from_file_location("openviking_commit_gate", GATE / "openviking_commit_gate.py")
gate = _ilu.module_from_spec(_spec2)
sys.modules["openviking_commit_gate"] = gate
_spec2.loader.exec_module(gate)

from shared_work import SharedWorkQueue, work_key, source_key, normalized_candidate
from graphiti_terminal import AwaitedCoreAdapter
from source_authority import PinnedSourceResolver
import graphiti_core_bridge as bridge

GROUP = bridge._DISPOSABLE_DEFAULTS["group_id"]

# Declared mutually-exclusive transition (trusted source evidence).
CONTRACT = {
    "group_id": GROUP,
    "subject": "Phase2 Service",
    "predicate": "USES_AS_JOB_QUEUE_BACKEND",
    "transition": {
        "from": "Redis",
        "to": "NATS",
        "effective_at": "2026-10-30T00:00:00Z",
    },
}

EXTRACTION_INSTRUCTIONS = (
    "Extract exactly one entity 'Phase2 Service'. Record the job-queue backend "
    "transition as an edge named USAGES_AS_JOB_QUEUE_BACKEND is WRONG; use the "
    "edge name exactly 'USES_AS_JOB_QUEUE_BACKEND'. Before 2026-10-30 the "
    "backend was Redis (invalid at 2026-10-30T00:00:00Z); from 2026-10-30 the "
    "backend is NATS (valid at 2026-10-30T00:00:00Z, open-ended)."
)


def _config(root: str):
    return gate.Config(
        listen_host="127.0.0.1", listen_port=0, backend_host="127.0.0.1",
        backend_port=1, metrics_url="http://127.0.0.1:1/metrics",
        lock_file=str(Path(root) / "agent.lock"), database=str(Path(root) / "queue.sqlite3"),
        drain_enabled=True, quiet_grace_seconds=0, poll_seconds=0.01,
        task_poll_seconds=0.05, task_timeout_seconds=180, request_timeout_seconds=1,
        max_commit_body_bytes=65536, retry_base_seconds=1, retry_max_seconds=10,
        process_names=(), graphiti_enabled=True, receipts_enabled=True,
    )


def _candidate(suffix: str) -> dict:
    digest = hashlib.sha256(suffix.encode()).hexdigest()
    return {
        "schema_version": 1, "event_id": digest,
        "source": {"system": "opencode-v2", "session_id": "s1", "message_id": "m1",
                    "tool_event_id": "t" + suffix, "event_id": "t" + suffix, "cursor_id": "m1"},
        "scope": {"workspace_id": "/work", "group_id": GROUP},
        "observed_at": "2026-10-30T00:00:00Z", "category": "verified_architecture_fact",
        "authority": {"basis": "agent_candidate", "confidence": 0, "evidence_ref": "repo:commit:file"},
        "policy_revision": "operator-r1", "destination": "graphiti", "fact_ref": "repo:issue-70:phase2-transition",
        "logical_digest": digest,
    }


def ingest_transition(disposable_root: Path) -> dict:
    """Ingest the declared transition via the coordinator + real Graphiti Core.

    The transition contract is durably bound to the work key BEFORE the
    Graphiti side effect.
    """
    tmp = tempfile.TemporaryDirectory()
    try:
        cfg = _config(tmp.name)
        db = gate.QueueDB(cfg.database)
        shared = SharedWorkQueue(db)

        candidate = _candidate("transition")
        original = normalized_candidate(candidate)
        key = work_key(original)
        ev_key = source_key(original)

        # Trusted source record declaring the mutually-exclusive transition.
        workspace = disposable_root / "workspace"
        workspace.mkdir(parents=True, exist_ok=True)
        record = {
            "source_event_key": ev_key,
            "workspace_id": "/work",
            "group_id": GROUP,
            "category": "verified_architecture_fact",
            "fact_ref": "repo:issue-70:phase2-transition",
            "episode_body": (
                "As of 2026-10-30, Phase2 Service switched its job queue backend "
                "from Redis to NATS. Before 2026-10-30 the active backend was Redis; "
                "from 2026-10-30 onward it is NATS."
            ),
            "reference_time": "2026-10-30T00:00:00Z",
            "declared_transition": CONTRACT,
        }
        record_path = workspace / "transition_record.json"
        record_path.write_text(json.dumps(record, indent=2))
        record_sha = hashlib.sha256(record_path.read_bytes()).hexdigest()

        policy = {
            "enabled": True, "revision": "operator-r1", "workspace_id": "/work",
            "group_id": GROUP, "categories": ["verified_architecture_fact"],
            "approved_events": {ev_key: {"file": "workspace/transition_record.json", "sha256": record_sha}},
        }
        resolver = PinnedSourceResolver(
            policy=policy, source_root=disposable_root,
            work_key_fn=lambda c: work_key(c), source_key_fn=lambda c: source_key(c),
        )

        shared.enqueue(candidate)
        envelope = resolver(original)
        admission = shared.admit_attested(original, envelope, source_authority="operator-policy")
        assert admission == {"work_key": key, "status": "queued"}, admission

        # Durable contract binding BEFORE the Graphiti side effect.
        with db.connect() as conn:
            conn.execute(
                """CREATE TABLE IF NOT EXISTS transition_contracts(
                    work_key TEXT PRIMARY KEY, contract_json TEXT NOT NULL,
                    bound_at REAL NOT NULL)""")
            conn.execute(
                "INSERT INTO transition_contracts VALUES (?, ?, ?)",
                (key, json.dumps(CONTRACT), __import__("time").time()),
            )

        adapter = AwaitedCoreAdapter(
            db,
            resolve=resolver,
            identity_fn=lambda event: (work_key(event), source_key(event)),
            client_factory=bridge.make_client_factory(),
            read_episode=bridge.make_read_episode(),
            close_client=bridge.close_core_client,
            extra_episode_kwargs={"custom_extraction_instructions": EXTRACTION_INSTRUCTIONS},
        )

        worker = gate.Worker(cfg, db, threading.Event(), adapter)
        worker._active_harness_processes = lambda: []
        worker._metrics = lambda: (0, 0)
        worker._last_class = "OPENVIKING_SESSION_COMMIT"  # Graphiti-first order
        assert worker.tick() is False
        processed = worker.tick()

        state = shared.status()[0]
        with db.connect() as conn:
            ep_row = conn.execute(
                "SELECT episode_uuid, state FROM graphiti_ingest_receipts WHERE work_key=?", (key,)).fetchone()
        return {
            "work_key": key,
            "memory_work_status": state["status"],
            "journal_state": ep_row["state"] if ep_row else None,
            "episode_uuid": ep_row["episode_uuid"] if ep_row else None,
            "processed": processed,
            "contract_bound_before_extraction": True,
            "contract": CONTRACT,
        }
    finally:
        tmp.cleanup()


def run_live_validation(contract: dict) -> dict:
    """Invoke the EXISTING validator (live mode) against the resulting graph."""
    res, code = asyncio.run(gtv.run_transition(dict(contract)))
    return {"disposition": res.get("disposition"), "exit": code,
            "mode": res.get("mode"), "coverage": res.get("coverage"),
            "findings": res.get("findings", [])}


def run_deterministic_outcomes() -> dict:
    """Exercise INCONSISTENT(1), INCOMPLETE(2), INVALID_INPUT(3) via in-memory records."""
    base_nodes = {"a": "Phase2 Service", "r": "Redis", "n": "NATS"}
    # INCONSISTENT: the outgoing (from) state is left open-ended, so at the
    # transition time BOTH the from and to states are active -> TEMPORAL_CONFLICT.
    inconsistent_edges = {
        "e1": {"uuid": "e1", "name": CONTRACT["predicate"], "source_node_uuid": "a",
               "target_node_uuid": "r", "valid_at": "2026-01-01T00:00:00Z",
               "invalid_at": None, "episodes": ["ep1"]},
        "e2": {"uuid": "e2", "name": CONTRACT["predicate"], "source_node_uuid": "a",
               "target_node_uuid": "n", "valid_at": "2026-10-30T00:00:00Z",
               "invalid_at": None, "episodes": ["ep1"]},
    }
    res_i, code_i = asyncio.run(gtv.run_transition(
        dict(CONTRACT, subject_uuid="a",
             transition={**CONTRACT["transition"], "episode_uuid": "ep1"}),
        records_path=_write_records("inconsistent", base_nodes, inconsistent_edges, ["ep1"]),
    ))
    # INCOMPLETE: ambiguous subject (two nodes share the subject name).
    amb_nodes = {"a": "Phase2 Service", "b": "Phase2 Service", "n": "NATS"}
    res_c, code_c = asyncio.run(gtv.run_transition(
        dict(CONTRACT, subject="Phase2 Service"),
        records_path=_write_records("incomplete", amb_nodes, {}, ["ep1"]),
    ))
    # INVALID_INPUT: malformed contract (missing transition.to).
    bad = {k: v for k, v in CONTRACT.items()}
    bad["transition"] = {"from": "Redis", "effective_at": CONTRACT["transition"]["effective_at"]}
    code_v = _invalid_contract_code(bad)
    return {
        "inconsistent": {"disposition": res_i.get("disposition"), "exit": code_i},
        "incomplete": {"disposition": res_c.get("disposition"), "exit": code_c},
        "invalid_input": {"exit": code_v},
    }


def _write_records(label, nodes, edges, episodes):
    path = Path(f"/tmp/opencode/issue70_tv_{label}_records.json")
    path.write_text(json.dumps({"nodes": nodes, "edges": list(edges.values()),
                                "episodes": [{"uuid": e} for e in episodes]}))
    return str(path)


def _invalid_contract_code(contract: dict) -> int:
    try:
        gtv.load_contract(_write_contract_file(contract))
        return 0  # unexpectedly valid
    except ValueError:
        return gtv.EXIT_INVALID


def _write_contract_file(contract: dict) -> str:
    path = Path("/tmp/opencode/issue70_tv_invalid_contract.json")
    path.write_text(json.dumps(contract))
    return str(path)


def main():
    disposable_root = Path("/tmp/opencode/issue70-graphiti-real")
    ing = ingest_transition(disposable_root)
    live = run_live_validation(ing["contract"]) if ing["journal_state"] == "completed" else \
        {"disposition": "SKIPPED_NOT_PERSISTED", "exit": None}
    deterministic = run_deterministic_outcomes()
    packet = {
        "ingestion": ing,
        "live_validation": live,
        "deterministic_outcomes": deterministic,
        "exit_outcomes_expected": {"PASS": 0, "INCONSISTENT": 1, "INCOMPLETE": 2, "INVALID_INPUT": 3},
    }
    print(json.dumps(packet, indent=2, sort_keys=True, default=str))
    # A reported validator failure stays visible; it does not fail ingestion.
    print(f"TEMPORAL_VALIDATOR_LIVE_EXIT={live.get('exit')}")
    print("TEMPORAL_VALIDATOR_DETERMINISTIC="
          f"INCONSISTENT={deterministic['inconsistent']['exit']}"
          f",INCOMPLETE={deterministic['incomplete']['exit']}"
          f",INVALID_INPUT={deterministic['invalid_input']['exit']}")


if __name__ == "__main__":
    main()
