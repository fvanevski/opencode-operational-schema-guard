# Issue #70 — automatic temporal validation and final source-only integration

Central implementation base: `e60cb222e073f8042750ac620b1227a5a8c2b804` (accepted Phase 3 source package). This continuation is not a deployed runtime or a new PR. The current branch adds source + regression scaffolding for remaining declared exclusive-state transitions and safely handles the prior accidental live-DB fallback.

## Central-owned architecture

The existing gate **remains the one inference scheduler and SQLite receipt owner**. `Graphiti.add_episode` still runs in the directly awaited separate Graphiti interpreter under the original EX flock. No new graph-writing worker, durable queue, or model prompt sweep.

- `phase3/git_source_authority.py` accepts an optional exact `transition_contract` in a **committed, operator-allowlisted Git record** only for category `exclusive_state_transition`. Before permitting ingestion it verifies the exact canonical subject, predicate, outgoing/incoming states and effective time against the nominated event hints, source group and trusted Git content. An agent cannot self-declare verification by metadata.
- `phase2/graphiti_terminal.py` adds the trusted contract to the immutable source envelope (ordinary fact hash identities are unchanged). It remains a separate operation from model output.
- `candidate/gate/shared_work.py` inserts the source/contract digest into `temporal_transition_contracts` **inside the same SQLite transaction** that promotes independently attested work to queued. Thus no Graphiti operation can begin without its trusted pre-extraction transition declaration. The legacy queued and denied paths remain unchanged.
- `phase4/temporal_ledger.py` wraps the existing Core adapter. On exact Graphiti journal `completed` plus UUID it runs the **existing qualified read-only validator**, with the bound contract and episode UUID. Each validator result is durable in the existing SQLite database keyed to work, episode and contract. Supported exit codes are `0=PASS`, `1=INCONSISTENT`, `2=INCOMPLETE`, `3=INVALID_INPUT`, retaining Graphiti-specific detailed dispositions. On transport failure, interruption or missing outcome the validator is `UNVERIFIED`. Validation retries are bounded and read-only; **Graphiti ingestion is never automatically repeated**.
- `phase4/temporal_validator_child.py` loads the operator-pinned existing validator and calls its already-proven `run_transition()` API; `temporal_validator_transport.py` invokes it in the correct Python environment. The original Graphiti ingestion receipt remains successful if validation finds an inconsistency, missing coverage or invalid contract.
- `candidate/gate/graphiti_runtime_bootstrap.py` now permits the exclusive-state category **only** with an explicitly configured existing validator file and its exact operator-provided SHA-256. It keeps the default disabled; the new `Config` field is `graphiti_validator_path` plus `graphiti_validator_sha256`.
- `phase3/graphiti_recall_service.py` obtains temporal dispositions only by joining the completed, Git-attested receipt to the persisted validator result. Unknown/missing/disputed statuses never become a PASS. `candidate/openviking-v2/graphiti-recall.mjs` marks historical edges invalidated and surfaces missing/negative validation rather than declaring one current state.
- `SharedWorkQueue.status()` adds the separate `temporal_validation_status` and existing detailed fields in a bounded status result when the temporal ledger exists. A successful *graph write* and a successful *temporal check* remain distinct.
- `phase4/safe_test_paths.py` preflights every **disposable test gate TOML** and rejects missing explicit `[gate].database`/`lock_file`, a path escaping the disposable root, or a non-disposable graph target. This directly addresses the previous A3 live gate DB contamination, without breaking legitimate production defaults. The test run must invoke it BEFORE starting any disposable gate.

## Trusted Git source format

The source record remains strict JSON. For an exclusive transition it adds one extra `transition_contract`:
```json
{
  "schema_version": 1,
  "workspace_id": "/exact/operator-approved/disposable/workspace",
  "group_id": "issue70_temporal_disposable",
  "category": "exclusive_state_transition",
  "episode_body": "As of 2026-10-30 Service switched its job-queue backend from Redis to NATS; before that it was Redis, afterward it is NATS.",
  "reference_time": "2026-10-30T00:00:00Z",
  "transition_contract": {
    "group_id": "issue70_temporal_disposable",
    "subject": "Service",
    "predicate": "USES_AS_JOB_QUEUE_BACKEND",
    "transition": {
      "from": "Redis",
      "to": "NATS",
      "effective_at": "2026-10-30T00:00:00Z"
    }
  }
}
```
The nominated schema-v1 `transition` hint must match exactly: `subject_ref=Service`, `predicate=USES_AS_JOB_QUEUE_BACKEND`, `outgoing_state_ref=Redis`, `incoming_state_ref=NATS`, and the source effective timestamp. The record is an *operator-approved source declaration*, not proof that Graphiti correctly extracted/invalidated edges.

## Disposable gate config additions

Only for an explicitly opted-in disposable gate with its own database, lock and graph, under the existing `[worker]`:
```toml
graphiti_enabled = true
receipts_enabled = true
graphiti_runtime_dir = "/absolute/reviewed/checkout/docs/issue-70/phase3"
graphiti_source_policy = "/absolute/disposable/approved-source-policy.json"
graphiti_core_python = "/absolute/authenticated/graphiti-venv/bin/python"
graphiti_group = "issue70_temporal_disposable"
graphiti_validator_path = "/absolute/authenticated/graphiti_temporal_validator.py"
graphiti_validator_sha256 = "<64 lowercase hex characters of the inspected script>"
```
And explicitly under `[gate]`: `database` and `lock_file` must resolve within the **same declared disposable root**. Run `safe_test_paths.py CONFIG_TOML DISPOSABLE_ROOT` before every gate start. The real live gate stays disabled and untouched.

## One-campaign qualification contract

1. **Preflight** current OpenCode V2 installed entrypoint and event shape, Graphiti 0.31.2-compatible Core and FalkorDB, original exact validator source/API, gate source/binary ownership, source hashes, effective active metrics, available inference resources, and *explicitly isolated* DB/lock/token/config paths. Read the named source and inspect diff before edits. The actual installed validator must be audited and hashed, then passed unchanged in disposable config.
2. **CPU-only** run new Phase 4 tests, affected Phase 3 Git-source/auto-admission/recall/transport suites, Phase 2 terminal/admission regressions, V2 context/capture suites, and existing gate/launcher/actual-backend suites in their matching interpreters. The new Phase 4 test root needs `PYTHONPATH` including phase2, phase3, phase4, gate and gate/tests. Execute all four validator outcomes through the durable ledger tests, including pending/running restart, ambiguous child success, missing contract, contradictory Git candidate, mismatched group, and no re-ingestion.
3. **One actual disposable transition:** on a fresh `issue70_*` graph, with opt-in Git record, drive the complete actual stock-V2 nomination -> independently verified Git source -> transactional contract binding -> shared coordinator EX lease -> awaited child Graphiti persistence -> exact episode readback -> existing read-only validator (live mode) -> durable work/episode/outcome status. Validate that source declaration is bound **before** graph extraction. Capture its actual disposition honestly. Do not tune the model to force PASS. Concurrent OpenViking or interactive harness inference must remain excluded until the Graphiti child completes. Graphiti terminal success must remain intact even for an inconsistent or incomplete temporal result.
4. **Actual read-only recall:** query the disposable graph with an exclusive-state question. Verify source, group, exact receipt, temporal ledger join, historical `invalid_at`, conflict/unverified labels, bounded context and OpenViking coexistence. A positive PASS may be asserted only if the validator actually returned code 0 and the status row is durable. Test all 0/1/2/3 outcomes with deterministic graph/validator inputs; do not fabricate genuine live results for unsupported outcomes.
5. **Source-bound package:** rebuild the full gate/V2 patches and new phase4 runtime file mapping; verify forward/reverse byte identity against authenticated installed bases; renew `SHA256SUMS`, changed-file inventory, manifests, qualifications, installation/reproduction and rollback; explicitly retain historical Phase 2/3 evidence under its original exact commit/source identity where unaffected.
6. **Single publication:** publish a cohesive source+evidence commit to `issue/70-temporal-final`, with exact remote fast-forward/readback. No PR creation, merge, production plugin install, live graph write or production capture activation in the local campaign. Central independently reviews the handback, then resolves PR #71 merge authorization and opens **one** remaining consolidated Phase 2–4 PR.

## Safety and escalation

The prior Phase 3 test harness accidentally wrote three records to the live gate database by relying on the Config production default. Its scoped deletion was **host-reported**, not proof no write occurred. Treat this as a verified risk: any missing or unbounded disposable path must cause a **pre-start BLOCK**, never a fallback to production. This is not a request to alter the live DB.

Ordinary source-specific Graphiti/validator schema or import corrections are within local implementation scope; keep the central architecture and existing validator unchanged. Stop only if the actual validator cannot provide a read-only live `run_transition` or the host cannot isolate a genuine disposable graph/gate. Do not create a new scheduler, fork Graphiti, turn off admission checks, invent PASS, delete live records, or open unrelated issues.

**Verification boundary:** Central has authored this candidate but has NOT run these new Phase 4 modules or live graph tests. Those proofs belong to the host campaign; do not infer PASS from file existence or the historical Phase 2 manually executed validator.
