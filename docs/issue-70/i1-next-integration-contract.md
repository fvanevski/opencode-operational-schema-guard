# Issue 70: next cohesive Phase 1 integration — I1 and publishable candidate

Status: Central-authored implementation primitive + pinned integration contract, **not a deployed patch**. Main is historical V1, so all new files remain under `docs/issue-70/`. New code is for copying into isolated current-V2 source copies after authenticating host source ownership.

## Authority and evidence

- Tracker HEAD before this commit: `728cabb18fa352c35e3e81558aceaf71f33d5b52`. Issue 70 OPEN; no production activation authorized.
- Corrected source packet: user-uploaded `issue70-phase1-correction.tar.gz`, SHA-256 `08442b4b6fc89173314cc0a48ef12982487fb42e38c6fc15e69173ed9fc3d00c`. Central replayed 92/92 gate/capture/legacy/compaction tests on isolated sources, plus 48/48 gate tests after the I2 amendment. Offline validator 6/6 is host-reported.
- Current source homes reported: gate `~/.local/share/openviking-commit-gate/openviking_commit_gate.py`; V2 plugin `~/.config/opencode/plugins/openviking-v2/index.mjs` **path unverified**; backend uv OpenViking `~/.local/share/uv/tools/openviking/lib/python3.14/site-packages/openviking/{session/session.py,server/routers/sessions.py,service/session_service.py}`. Authenticate current full SHA-256 before integration, and resolve any path discrepancy. Do not patch the historical V1 root.
- Inspected upstream `volcengine/OpenViking@230aa7e2b82636479c1862ed91796ff1386c60b2` proves archive preparation precedes TaskTracker creation/QueueFS enqueue. Upstream identity is **not** installed host identity.
- Separate Graphiti terminal-completion proof is still absent. Graphiti capture and writes remain disabled.

## Architectural decision: backend-owned durable receipt, not task-list polling

The existing gate tracks claimed generation and stores unknown requests. On initial submission, derive an immutable request key from `(account,user_id,actor_peer,session_id,claimed_generation)` and freeze the submitted canonical body/digest **in durable gate state before sending POST**. Existing `requested_generation` may advance while a claim is inflight; do not recompute an outstanding request's identity/digest from the mutable newest payload.

A backend receipt must be reserved and durably journaled **before any commit_async side effect**. A second request with the same key returns the existing receipt without rerunning commit_async. A conflicting payload under that key fails closed. The supplied `receipt_protocol.py` implements these identity, journal, and conservative gate-decision primitives and has seven local CPU-only tests; it does **not** by itself prove QueueFS quiescence. Integrate it into the actual backend and gate source, not as a public mutation endpoint.

### Backend route and lifecycle integration

1. Use a versioned, authenticated, privately scoped POST/GET receipt interface on the existing OpenViking backend (or an equally authoritative in-process extension). Enforce root/backend scope; the capture nomination credential cannot use it. Validate one stable request key, tenant/account/user/peer/session and canonical immutable body digest. Do not alter ordinary clients' commit semantics without compatibility tests.
2. Reserve the receipt transactionally before the actual commit operation; only the first claimant may call `commit_async`. Keep duplicate calls attached to the same durable receipt. Do not create another inference scheduler or retry an ambiguous operation.
3. On `accepted` with exact `task_id`, mark receipt accepted; on genuine no-archive `skipped`, seal never-scheduled only after verifying that exact operation has no future work. On a timeout, crash or publication gap, leave `preparing` and **BLOCK**. Propagate the request key into a durable archive/task metadata binding where needed so late result can be reconciled with no source-identity guess.
4. Implement backend-owned reconciliation of a `preparing` receipt using the existing archive Phase 1 marker, publication lease, TaskTracker, durable QueueFS and terminal `.done`/`.failed` markers. Never treat task-list emptiness or idle metrics as evidence. If authoritative finality is unavailable (including after process restart), remain ambiguous, not released. Any explicit operational resolution must use backend-owned proof, not SQL edits.
5. Only mark the receipt `terminal/release_proven` after the backend has verified its exact task has stopped inference **and** cannot later enqueue, resume or replay. Prove `skipped` has no archive; treat `failed` as terminal only after the relevant worker and recovery work are fenced. The `backend_quiescence_verified` parameter in the primitive is an **internal assertion boundary**, not a verifier: wiring it to HTTP status, task-list count or scheduler idle is prohibited.

### Coordinator and interactive harness integration

6. Add durable request key and frozen-body digest to the existing SQLite gate record or an atomic adjacent table. Gate sends the key to the backend receipt interface, with explicit opt-in to the new protocol. Any legacy unknown without such a key stays blocked pending separately authorized reconciliation. Do not mint a retrospective key and infer safety.
7. For each unknown row, authenticate an exact matching backend receipt. Use `gate_decision`: `TRACK` adopts one matching real task ID and polls it under the current exclusive flock; `RELEASE` durably reconciles the unknown with explicit terminal evidence; otherwise `BLOCK`. A release of unrelated work is **not** permission to resubmit the original request. Honor generation, scope and digest in every transition. Reconcile before testing global unknown suppression and retain quiet grace for new work.
8. Preserve the gate's existing exclusive `flock` over submissions, polls and terminal decisions. The interactive OpenCode/Codex/Antigravity launch admission path must also acquire/hold the matching shared lease, check durable unresolved inference state while holding it, and fail closed on unknown. Resolve the race across gate crash/restart. Simply releasing the exclusive flock while an unknown backend operation could later produce inference is unsafe. Keep shim changes surgical and reversible; do not replace the existing launcher stack.
9. Integrate the already staged I2 no-task-ack patch `docs/issue-70/patches/i2-no-task-terminal-proof.patch` against the isolated corrected candidate with its test unchanged.

### CPU-only qualification and authority

Use the original phase1 packet's reconstructed source/patches and test suites. Add a disposable **backend route/QueueFS** scenario that genuinely pauses after archive metadata becomes ready and before tracker.create, shows empty task-list and idle scheduler, and verifies the gate and a competing interactive shim cannot start. Then resume, prove matched terminal status, and verify unrelated work starts under quiet grace without retrying the original. Include accepted-task response lost, duplicate POST, conflicting digest, crash/restart before/after publication, persistent queue replay, task cancellation and `skipped` no-archive. At least one scenario must use the actual installed backend implementation in an isolated test process, not only a fabricated receipt dict. Assert all prior 98 checks, including seven Central tests, still pass (subject to maintaining exact test provenance and known unavailable host environments).

Do not claim I1 PASS if the installed backend cannot supply an authoritative receipt or late-publication fence. Do not silently remove the unknown block. Keep the real Graphiti adapter disabled; live database, global configuration, deployment and service restart are not part of this work.

### GitHub publication (explicitly authorized)

Local Build may commit sanitized implementable source and tests **directly to existing `issue/70`**, preferably one cohesive source/evidence commit, under a distinct `docs/issue-70/implementation/{gate,openviking-v2,backend,shim}` tree (paths within this issue are examples). Do not commit full host installs, raw credentials/logs, databases, unrelated plugins, or the historical V1 runtime. Check remote exact HEAD immediately before work; after Central's next commit, the expected HEAD will be communicated in the handoff. Re-fetch immediately before pushing. Non-force fast-forward only. If the branch advanced, reconcile without overwriting Central changes. Read back the actual remote SHA and diff inventory. PR creation/merge/deploy remain Central-owned.

## Acceptance for one consolidated local return

Provide source ownership/complete hashes, actual corrected code, reproducible targeted tests with live/disposable distinction, one backend publication-window and one harness-interlock trace, safety/failure/rollback evidence, and GitHub commit SHA. If a genuinely blocking dependency prevents closure, return its minimum concrete missing interface and the passing safe implementation so Central can decide; do not start an unrelated research/architecture campaign.
