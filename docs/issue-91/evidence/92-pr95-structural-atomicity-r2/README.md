# Issue #92 / PR #95 — structural atomicity, final exposed slice (R2, sanitized evidence)

Branch `issue/92-v7c-accepted` | Hermes Build | CPU + one EX-admitted exposed GPU probe + v8 freeze
CONTRACT=docs/issue-91/adr-acceptance/ISSUE92_PR95_STRUCTURAL_ATOMICITY_R2_HERMES.md

## RESULT = **READY_FOR_V8_CENTRAL_RATIFICATION**

The new model-independent `atomicity_structural_v1` veto correctly rejected the
bundled v7-v-08 quotation, accepted the genuine atomic v7-v-07 fact, kept the
controls out, and persisted exactly one fact with the new attestation. Phase B
qualifies, so the untouched v8 prospective cohort was frozen and staged
(no v8 inference).

## A. Source identity + CPU boundary
- SOURCE_HEAD = `d3d66bb3694d71fd4e73a1dc7d80cc4a1ca93f24` (remote head, verified)
- 8 execution-source blobs verified:
  - events.mjs `3a3d1577…593e`, queue.mjs `25289164…5b3d`, finite-batch.mjs
    `719b4f09…f21a`, fact-review.mjs `d4f1b487…8121`, claim-evidence.mjs
    `3c29c4ff…2bd6`, core.mjs `f2188640…795f`, ex-admission-proof.mjs
    `07b42800…3e3b`
- `sourceAtomicityStructuralRisk` + frozen plan identity `atomicity_structural_v1`
  present (fact-review.mjs + finite-batch.mjs). CPU-level: v7-v-08 →
  `independent_clause_boundary`; v7-v-07 / SQL procedure / coordinated installation → pass.
- Focused native suites corroborate host: candidate+long-prompt 31/0, curator 99/0,
  A3 19/0 (149 PASS). Trusted exact-head CI run `43482932702` covered the full
  673-test root profile; not duplicated on the host.

## B. Exposed r2 (one EX-admitted inference, fresh disposable group)
- Group `graphiti-adr92-exposed-atomicity-r2` (verified 0 episodes pre-stage).
- 4 candidates → **1 approved, 3 deferred**; 16 model calls (discovery 11 /
  utility 4 / support 1), 0 errors.
- **Bundled v7-v-08: NOT persisted as one fact** — structurally rejected and
  DEFERRED, ReviewStore reason `source_only_utility_source_structural_independent_clause_boundary`
  (model-independent veto, even though the model attested `independent_predicates=1`).
- **Atomic positive v7-v-07: PERSISTED** (episode `4a8f6bd8-af5d-44a2-9aa9-e089b32edadb`);
  attestation `independent_predicates=1`, `structural_review=no_independent_clause_v1`,
  assertion SHA-256 `292674d5…80cf0`.
- **Controls v7-c-01 / v7-c-02: DEFERRED** (stayed out of Graphiti; 0 control
  pollution, 0 authority breaches).
- Plan certificate: `atomicity_review_v1=true` AND `atomicity_structural_v1=true`;
  per-item SHA-256-bound attestation. Positive Graphiti UUID readback confirmed.

## EX admission
- Kernel flock on `/run/user/1000/openviking-agent.lock`; the launcher's locked fd (3)
  was inherited by the Node driver via `pass_fds` and proven kernel-backed
  (fd present in `/proc/self/fd`, fdinfo FLOCK held by the launcher PID) via
  `GHDEV_MEMORY_POST_EXIT_LOCK_FD`. Scheduler idle at admission; harness-exit OK;
  no-unresolved OK; 30s quiet grace honored. Once-only marker written after a settled
  run. Reconcile-only: driver rc=3 (1 write queued) → attempt 1 → `reconciled_persisted=1,
  unresolved=0, status=settled`. No model replay.

## C. v8 prospective cohort (frozen + staged, no inference)
- Group `graphiti-adr92-a3-prospective-v8` (verified 0 episodes; genuinely empty).
- 20-case native freeze: 10 single-predicate valuable + 10 controls, authentic
  native source identity, 0600 manifest + roster, digests:
  - private_manifest_sha256 = `dcd723a60deceae511a7838a9d736f88c59b3571f2959597afcbd7da35cdaf8e`
  - label_freeze_sha256 = `27159112f60deaaefa54a588c968cd1674f7bdd1e431771efb649c219c060c86`
- 20 exact native events staged (one per case) under a fresh 0700 state; 24-cluster /
  72-candidate / 3600s limits; EX preflight passed; once-only marker absent;
  scorer fail-closed (no plan, no model-calls, no curation records).
- **No v8 inference executed.** Central will ratify the freeze.

Ten privacy-safe verbatim valuable quotations (no credential values) and ten
control rationales are recorded in `summary.json` (`v8_freeze.valuable_quotes`
and `v8_freeze.control_rationales`).

## Historical integrity / local changes
- v7c corpus SHA-256 `9356e663…` and v7c label-freeze `401e57ab…` unchanged; all
  prior v2-v7/B/exposed-r1 records unchanged; no historical inference replay; no
  writes to the v7c or any production group.
- No semantic source edits; only a fresh disposable r2 group/state, a fresh v8
  prospective group/state, and throwaway `/tmp` launcher/driver (not committed).

## Command-shape friction
- EX lock-fd env var is `GHDEV_MEMORY_POST_EXIT_LOCK_FD` (the R1 run first used
  `EX_LOCK_FD` and failed at `requireKernelExAdmission: missing_lock_fd`); R2 used
  the correct var directly. No source semantics changed.

## Decision blockers
- None. Phase B qualified; v8 is frozen and staged for Central ratification.
