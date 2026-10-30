"""Real Graphiti Core qualification harness (disposable graph, local models).

Drives ONE genuinely source-authorized episode through the coordinator-owned
``AwaitedCoreAdapter`` and the *installed* Graphiti Core client, into a
**separate disposable FalkorDB graph** (never the live ``graphiti_live`` graph),
using the configured local LLM/embedder services. It proves:

  * exact request/source/group identity,
  * that Graphiti extraction genuinely executed (LLM + embedder + graph write),
  * that the episode was read back by its exact persisted UUID + group,
  * that the durable terminal receipt was sealed (status=completed),
  * that no duplicate submission occurred, and
  * that a competing OpenViking job did not enter inference first.

This is a Phase 2 implementation-qualification artifact. It writes only to the
disposable graph and a throwaway gate SQLite DB; it never touches production.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import sys
import tempfile
import threading
from dataclasses import replace
from datetime import datetime, timezone
from pathlib import Path

PHASE2 = Path(__file__).resolve().parent
GATE = PHASE2.parent / "implementation" / "i1-integrated" / "candidate" / "gate"
sys.path.insert(0, str(GATE / "tests"))
sys.path.insert(0, str(GATE))
sys.path.insert(0, str(PHASE2))

import importlib.util

_SPEC = importlib.util.spec_from_file_location("openviking_commit_gate", GATE / "openviking_commit_gate.py")
gate = importlib.util.module_from_spec(_SPEC)
sys.modules["openviking_commit_gate"] = gate
assert _SPEC.loader
_SPEC.loader.exec_module(gate)

from shared_work import SharedWorkQueue, work_key, source_key, normalized_candidate
from graphiti_terminal import EpisodeEnvelope, AwaitedCoreAdapter
from source_authority import PinnedSourceResolver
import graphiti_core_bridge as bridge


GROUP = bridge._DISPOSABLE_DEFAULTS["group_id"]  # == the disposable graph name


def _config(root: str):
    return replace(
        gate.Config(
            listen_host="127.0.0.1", listen_port=0, backend_host="127.0.0.1",
            backend_port=1, metrics_url="http://127.0.0.1:1/metrics",
            lock_file=str(Path(root) / "agent.lock"), database=str(Path(root) / "queue.sqlite3"),
            drain_enabled=True, quiet_grace_seconds=0, poll_seconds=0.01,
            task_poll_seconds=0.05, task_timeout_seconds=120, request_timeout_seconds=1,
            max_commit_body_bytes=65536, retry_base_seconds=1, retry_max_seconds=10,
            process_names=(), graphiti_enabled=True, receipts_enabled=True,
        )
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
        "policy_revision": "operator-r1", "destination": "graphiti", "fact_ref": "repo:commit:fact-" + suffix,
        "logical_digest": digest,
    }


def run(disposable_root: Path, episode_body: str, fact_ref: str, reference_time: str):
    tmp = tempfile.TemporaryDirectory()
    try:
        cfg = _config(tmp.name)
        db = gate.QueueDB(cfg.database)
        shared = SharedWorkQueue(db)

        # --- Genuine source-backed record in an authorized disposable workspace ---
        workspace = disposable_root / "workspace"
        workspace.mkdir(parents=True, exist_ok=True)
        candidate = _candidate("real")
        original = normalized_candidate(candidate)
        key = work_key(original)
        ev_key = source_key(original)
        record = {
            "source_event_key": ev_key,
            "workspace_id": "/work",
            "group_id": GROUP,
            "category": "verified_architecture_fact",
            "fact_ref": original["fact_ref"],
            "episode_body": episode_body,
            "reference_time": reference_time,
        }
        record_path = workspace / "source_record.json"
        record_path.write_text(json.dumps(record, indent=2))
        record_sha = hashlib.sha256(record_path.read_bytes()).hexdigest()

        # PinnedSourceResolver: operator-owned, digest-pinned policy.
        policy = {
            "enabled": True, "revision": "operator-r1", "workspace_id": "/work",
            "group_id": GROUP, "categories": ["verified_architecture_fact"],
            "approved_events": {ev_key: {"file": "workspace/source_record.json", "sha256": record_sha}},
        }
        resolver = PinnedSourceResolver(
            policy=policy, source_root=disposable_root,
            work_key_fn=lambda c: work_key(c), source_key_fn=lambda c: source_key(c),
        )

        # 1) Nominate (deferred) then promote via independent attestation.
        nom = shared.enqueue(candidate)
        assert nom["status"] == "deferred_unverified", nom
        envelope = resolver(original)
        assert envelope.work_key == key and envelope.source_event_key == ev_key
        admission = shared.admit_attested(original, envelope, source_authority="operator-policy")
        assert admission == {"work_key": key, "status": "queued"}, admission

        # 2) Coordinator-owned adapter wired to the REAL Graphiti Core client.
        adapter = AwaitedCoreAdapter(
            db,
            resolve=resolver,
            identity_fn=lambda event: (work_key(event), source_key(event)),
            client_factory=bridge.make_client_factory(),
            read_episode=bridge.make_read_episode(),
        )

        # 3) A competing OpenViking job must NOT enter inference before Graphiti.
        ov_job = db.enqueue(
            {"account": "garion", "user_id": "filip", "actor_peer": "opencode"},
            "ov-session-competing", 3, {"keep_recent_count": 3}, "compact", now=1,
        )
        ov_job_key = ov_job.get("intent_id")

        worker = gate.Worker(cfg, db, threading.Event(), adapter)
        worker._active_harness_processes = lambda: []
        worker._metrics = lambda: (0, 0)
        # "Graphiti then OpenViking" order: the last processed class was an
        # OpenViking commit, so the gate selects the Graphiti job next while the
        # competing OpenViking job stays queued (cannot enter inference first).
        worker._last_class = "OPENVIKING_SESSION_COMMIT"

        # First tick starts the quiet grace; second tick processes Graphiti.
        assert worker.tick() is False
        processed = worker.tick()

        state = shared.status()[0]
        # 4) No duplicate: a second submit of the same work key must not
        #    re-execute Graphiti (the journal short-circuits it).
        dup_submit = adapter.submit(original)
        dup_state = shared.status()[0]

        # 5) The real persisted Graphiti episode UUID is sealed in the durable
        #    journal (graphiti_ingest_receipts), not the work-key backend identity.
        with db.connect() as conn:
            ep_row = conn.execute(
                "SELECT episode_uuid, state FROM graphiti_ingest_receipts WHERE work_key=?",
                (key,)).fetchone()
        episode_uuid = ep_row["episode_uuid"] if ep_row else None
        journal_state = ep_row["state"] if ep_row else None

        # 6) Read the persisted episode back by its exact UUID from the disposable graph.
        readback = asyncio.run(_read_persisted(episode_uuid)) if episode_uuid else None

        # 7) The competing OpenViking job must not have entered inference.
        ov_rows = [r for r in db.list_rows() if r.get("session_id") == "ov-session-competing"]
        ov_state = ov_rows[0].get("state") if ov_rows else None
        # 8) Count persisted episodes in the disposable graph (must be 1: no dup).
        episode_count = asyncio.run(_episode_count())
        result = {
            "processed": processed,
            "work_key": key,
            "source_event_key": ev_key,
            "group_id": GROUP,
            "episode_uuid": episode_uuid,
            "journal_state": journal_state,
            "memory_work_status": state["status"],
            "backend_identity": state.get("backend_identity"),
            "dup_submit_returned": dup_submit,
            "dup_memory_work_status": dup_state["status"],
            "ov_job_key": ov_job_key,
            "ov_job_state": ov_state,
            "readback": readback,
            "disposable_episode_count": episode_count,
            "candidate_sha256": record_sha,
        }
        return result
    finally:
        tmp.cleanup()


async def _read_persisted(uuid: str):
    client = bridge.build_core_client()
    await bridge.prepare_core_client(client)
    try:
        _, driver, _ = client._resolve_request_scope(GROUP)
        from graphiti_core.nodes import EpisodicNode
        node = await EpisodicNode.get_by_uuid(driver, uuid)
        return {
            "uuid": node.uuid,
            "group_id": node.group_id,
            "name": node.name,
            "content_len": len(node.content),
        }
    finally:
        await bridge.close_core_client(client)


async def _episode_count() -> int:
    client = bridge.build_core_client()
    await bridge.prepare_core_client(client)
    try:
        _, driver, _ = client._resolve_request_scope(GROUP)
        rows = await driver.execute_query("MATCH (n:Episodic) RETURN count(n) AS c")
        # FalkorDB execute_query returns (records, headers, metadata).
        records = rows[0] if isinstance(rows, tuple) else rows
        for record in records:
            if isinstance(record, dict) and "c" in record:
                return int(record["c"])
            if isinstance(record, list) and record:
                first = record[0]
                if isinstance(first, dict) and "c" in first:
                    return int(first["c"])
        return 0
    finally:
        await bridge.close_core_client(client)


def main():
    disposable_root = Path("/tmp/opencode/issue70-graphiti-real")
    body = (
        "The coordinator-owned Graphiti completion boundary transitions a work item "
        "durably to 'processing' before any Graphiti side effect, directly awaits "
        "Graphiti.add_episode, and seals a terminal receipt only after the exact "
        "persisted episode is read back by authoritative UUID and group lookup."
    )
    result = run(
        disposable_root,
        episode_body=body,
        fact_ref="repo:issue-70:phase2-coordinator-boundary",
        reference_time="2026-10-30T00:00:00Z",
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    if result["memory_work_status"] != "completed":
        raise SystemExit(f"real Graphiti qualification FAILED: status={result['memory_work_status']}")
    if result["journal_state"] != "completed" or not result["episode_uuid"]:
        raise SystemExit(f"durable receipt not sealed: {result}")
    rb = result["readback"]
    if not rb or rb["uuid"] != result["episode_uuid"] or rb["group_id"] != GROUP:
        raise SystemExit(f"persisted-episode readback mismatch: {rb}")
    if result["ov_job_state"] in ("committed", "complete"):
        raise SystemExit(f"competing OpenViking job entered inference: {result['ov_job_state']}")
    # No duplicate: the second submit returns the same key, leaves the work
    # completed (not re-queued), and the disposable graph holds exactly one
    # persisted episode for this source event.
    if result["dup_submit_returned"] != result["work_key"]:
        raise SystemExit(f"duplicate submit returned a different identity: {result}")
    if result["dup_memory_work_status"] != "completed":
        raise SystemExit(f"duplicate submit re-queued the work: {result['dup_memory_work_status']}")
    if result["disposable_episode_count"] != 1:
        raise SystemExit(f"expected exactly 1 persisted episode, found {result['disposable_episode_count']}")
    print("REAL_GRAPHITI_QUALIFICATION=PASS")


if __name__ == "__main__":
    main()
