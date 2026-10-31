# Issue #70 / PR #73 — final host-evidence closeout and review-readiness contract

**Authority:** Central-owned bounded acceptance method, not proof of host execution.
No runtime source, configuration, memory policy or Graphiti activation is authorized by this document.

## Exact starting baseline

- Existing draft PR #73: branch `issue/70-host-activation`, starting revision `28000cc05edcb9d95c6531e7319f99062e3049ee`; merged baseline `4d4825b8151a1d8272af9da89701954d7ab27822`. Re-fetch exact GitHub head after this document's commit.
- Independently reviewed installed **disabled-capture** source: `b126b6d415a3f8706e0c8c22b219cca2161a7465`, tree `dacb27120deef3e8bfa27b50222bf20cb60c450c`.
- Actual fresh-process test: `/tmp/opencode/issue70-accept-20261031214134`; audited sanitized ZIP SHA-256 `68448389b8de634f40cd9a4efeb2953d6b7418e304c4eb560a5fef0dfd4f1407`.
- Installed V2 plugin loading, context and subscribed session event, stub nonce/response, isolated endpoint, observed lease hold/release probes and 15/15 source readback have independently audited PASS evidence. The original receipt misidentifies stub port `27611` as private server port; actual private server was `41677`.
- The validator-authority P1 is corrected at source level by bootstrap-only `select_active_validator`, without constructor re-selection; delayed-old-adapter regression is present. Its original Codex GitHub thread remains unresolved. The 2/2 manual Codex review request cap is exhausted. `node-contract` passed at the prior head; verify it again on any new one.

## One consolidated local host investigation

**Goal:** resolve what can be recovered from original-run operational history and qualify the **current** disabled-capture installation for final PR readiness. This is not an implementation/deployment/activation campaign.

### Phase 1: retained originals and limited retrospective

Read original 21:41 run artifacts and `fresh-process-receipt.json` against the independent sanitized audit. Preserve all original artifacts and source hashes. The original run took place approximately 2026-10-31 21:41–21:42 PDT, or 2026-11-01 04:41–04:42 UTC. Use a small clock-skew buffer rather than broad logs.

Inspect, only if already retained, pre/post readback/verifier logs, gate/backend user/system journals, gate's read-only durable work and Graphiti receipt/status projections, and existing FalkorDB/Graphiti audit/journal records. First establish log ownership, relevant time window, retention, and read capability; stop looking after one bounded pass. Never export private memory content, tokens, full session logs or datastore copies.

Distinguish (a) host-reported graph count `27 → 27`, (b) verified disabled Graphiti policy and isolated stub endpoint, and (c) absence of **all possible graph writes**; only a genuine mutation audit could establish (c). A current graph count does not prove historical content immutability. Later current health does not prove old-time health. Missing historical logs produce `NOT_PROVABLE_FROM_RETAINED_EVIDENCE`, not false PASS/FAIL.

Use only existing read APIs and bounded read-only host inspection. For SQLite use `mode=ro` with `PRAGMA query_only=ON` or supported service read API; no checkpoint, vacuum, migration, deletion, synthetic work or WAL changes. For FalkorDB, only bounded read-only metadata/count/history queries supported by the existing authenticated interface. No exhaustive graph scans.

### Phase 2: current operational safety

Read and bind exact live identities for:
- installed critical source/config vs 15-file map and approved disabled-source identity;
- `graphiti_enabled=false`, `graphiti_production_approved=false`, Graphiti candidate capture/source policy and exact group authorization, without printing secrets;
- gate and OpenViking backend health/status, shared admission and scheduler safety, pending/inflight/terminal Graphiti work and unexpected durable receipts;
- bounded FalkorDB graph inventory/count or existing mutation audit, and relevant process/endpoint identities;
- when available, a read-only indication of no unexplained Graphiti production work since disabled deployment.

Current health/scheduler state can naturally change. Do not interpret a different PID, quiet-grace state, or absence of pending work as a failure. Do not launch a fresh OpenCode process, inference workload or Graphiti write to test health.

**Material blockers:** installed source mismatch; unexpectedly enabled Graphiti capture; unauthorized Group/worker policy; unexplained production memory writes or pending work; unhealthy services/current admission violation; mismatch or corruption of accepted evidence; current validator authority inconsistency. Preserve precise evidence and stop before any mutation.

### Phase 3: explicit decision rather than endless recovery

Return separately:
`FRESH_V2_CAPABILITY`, `DISABLED_CAPTURE_POLICY`, `HOST_HEALTH_CURRENT`, `HISTORICAL_GRAPH_NONMUTATION`, `HISTORICAL_GATE_HEALTH`, `SOURCE_P1_REMEDIATION`.

Historical graph nonmutation/health may be `NOT_PROVABLE_FROM_RETAINED_EVIDENCE`. That alone is not an indefinite block for **PR #73 disabled-capture source/host readiness**. Recommend `READY_FOR_CENTRAL_FINAL_REVIEW / QUALIFIED_WITH_EVIDENCE_LIMITS` if current source/config are correctly disabled, key current services healthy, previously demonstrated public V2 capability remains accepted, and no concrete material defect or production-write anomaly exists. Explicitly preserve historical limitations. Recommend `BLOCKED` only for concrete material violation or inability to establish current critical safety predicates. This is a host recommendation, not formal PR approval.

Do not let the previous acceptance's event-trace prefix/full-file hash distinction, stub/private-server port mismatch, or managed-Codex-app-server ancestry become recurring diagnosis campaigns; those are already classified and require accurate attribution only.

## Output, permissions and next authority

One cohesive read-only **host evidence** pass. Write only a collision-safe private audit directory and sanitized report, compact manifest and SHA-256. Return source locations, timestamps, precise current readbacks, present/absent evidence classes and any blockers in the agent handback, plus canonical GHDEV-10 `COMMAND_SHAPE_FRICTION`. No new GitHub PR, local repo modification, service/config/database change, unnecessary CPU/GPU test repeat, production ingestion, full graph export, review-thread mutation, merge or issue closure.

Central will inspect the handback, re-fetch current PR/CI/review-thread identities, finish the final exact-head review, then request separate approval for PR draft transition/squash-merge. Production Graphiti opt-in and genuine source-authorized **post-write** qualification are separate subsequent Issue #70 gates; no retrospective evidence pass grants live capture authority.
