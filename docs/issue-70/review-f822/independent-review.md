# Independent exact-head review: Phase 1 I1 integration (2026-10-30)

Reviewed commit: `f822e881905730d0da13e69aad5c94a8dd3cba1c` on `fvanevski/opencode-operational-schema-guard:issue/70`, direct parent `c4714d33f30ce6f3aa81eac1c9caabcdefd6a3b9`. GitHub comparison identifies 42 added files. Issue #70 remains OPEN; `main` is historical V1 at `afbb1d2ccc803af82e07fef2036ee84b8b5ca7dd`.

## Evidence assessed

- Source package: `docs/issue-70/implementation/i1-integrated/`, with gate, stock-V2 plugin, backend and launcher candidates; exact source manifest, forward/reverse patches, service fixture, tests, and disabled configuration. The host reports installed files remain unchanged.
- Published `qualification.json` claims 120/120: gate 48, Central receipt 7, capture 14, legacy OpenViking 24, compaction 7, offline validator 6, launcher 5, actual-backend 9. The nine backend tests use native Session/TaskTracker/SQLite QueueFS and disposable FastAPI backend with CPU-only extraction. **These are host reports, not independently rerun by Central on this exact commit.**
- Inspected `backend-new/openviking/service/commit_receipts.py`, receipt protocol, backend patch, gate `Worker.tick` and receipt functions, admission launcher/helper, actual-backend fixtures and coverage. Found meaningful attempt-key/digest reservation, archive binding, terminal fence, native publisher lock use, sticky interactive admission and fail-closed error paths.
- GitHub SHA/commit parent/file list verified independently. Host source SHA256 and all source file test output digests not rehashed centrally against a complete matching host install. No production database invariant established.

## B1: global admission conflict in multi-unknown recovery — CHANGES REQUIRED

Source: `candidate/gate/openviking_commit_gate.py` (`Worker.tick`, `_receipt_recovery_admitted`, `_process_receipted`). The initial unknown-row loop considers each ambiguous receipt and can request `GET ?recover=true` based on only scheduler running/waiting=0 and the quiet grace. Accepted but *queued and not yet inference-producing* work may leave those metrics at zero. The backend has **per-request** producer and publication locks, not a global inference-owner lease across unrelated request keys. Another ambiguous request can therefore be admitted for recovery/QueueFS enqueue while a previously accepted recovered task is waiting in QueueFS.

Concrete counterexample: A is already durable QueueFS pending with gate intent `inflight`, model metrics zero; B is a distinct `unknown` with Phase 1 ready but task not enqueued. After quiet grace, the unknown loop can authorize B's `recover=true` while A is outstanding. This permits two backend jobs to be queued under the same global single-inference admission policy; if their workers run concurrently, inference can overlap. No published regression exercises **two distinct unresolved keyed commit attempts** at this boundary.

This finding does not disprove the published *single-unknown* publication-race test, nor imply actual production overlap occurred. It does block acceptance of a general globally serialized coordinator.

### Central-authored proposed source remedy

`docs/issue-70/review-f822/multi-unknown-recovery.patch` is a **review candidate**, not a tested release patch. It adds a guard to `_receipt_recovery_admitted(current_row)`: do not request recovery when a different `unknown` or `inflight` commit exists. Ordinary receipt polling and exact terminal reconciliation remain permitted. When the last other unresolved operation becomes terminal, allow one request to recover under the existing idle/quiet/exclusive-lease conditions. Historical keyless unknowns remain fail-closed, rather than being silently ignored. The code change must be source-integrated with real tests, not rubber-stamped.

Required regression: stage A `inflight` with an accepted, *queued* task and idle metrics; stage B `unknown` with a prepared archive and no task. Exercise at least two gate ticks across quiet grace. Assert B's backend route never receives `recover=true` until A has terminal, non-replayable proof; verify a compatible interactive launcher stays blocked. Then resolve A, allow B's one recovery, and show unrelated pending work resumes without duplicate submission. Also test two ambiguous unknowns, an unavailable receipt, and recovery-grace reset on lease contention.

If the conservative guard blocks two unrelated ambiguous operations indefinitely because neither is terminal without an enqueue, preserve fail-closed safety and report that precise availability limitation; do **not** infer empty metrics prove either operation cannot run. A fuller scheduler design is outside this correction.

## Review disposition and source-home handling

`REVIEW_RESULT=CHANGES_REQUIRED` at `f822e881905730d0da13e69aad5c94a8dd3cba1c`, due to B1. Keep Graphiti automatic writes disabled; upstream Graphiti terminal receipt and production activation remain separately unqualified.

Do not merge the `docs/` evidence package as though it were an active production V2 installation. It can be kept in the existing tracker repository as a source-bound implementation record; an installable source tree/ownership contract and exact-head test instructions are required before a source implementation PR can claim production readiness. Prefer one cohesive remediation/qualification commit on `issue/70` over new issue/branch/PR fragmentation. After source repair, Central must review fresh exact HEAD, examine test coverage and remaining backend cases, and determine one Phase 1 draft PR to `main` if the repository is intentionally retained as the tracked source-home. No merge or deployment is authorized by this review.
