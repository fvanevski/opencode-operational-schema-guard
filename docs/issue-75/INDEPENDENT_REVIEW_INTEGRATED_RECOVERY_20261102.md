# Issue #75 — Central independent handback review, integrated recovery

**Reviewed immutable head:** `4639aa0746c5c6359b7d1843d7099b3e72c53cfc`; tree `8653e709d9d6a5b8ee13a5be53b21e6cc72381fa`; parent `d5fef6b740eba317174a41b106e8952b2dead20b`. Original campaign commit is a single fast-forward; this review document does not alter that reviewed source.

**Disposition: FUNCTIONAL EXTRACTION ACCEPTED AS A BOUNDED QUALIFICATION; WHOLE ISSUE NOT YET PR-READY.** Do not merge/close the issue, remove the admission hold, or represent normal OpenViking commit processing as restored. This document is Central review, not an assertion of new host execution.

## Inspected publication and supported successes

Reviewed GitHub-published `docs/issue-75/evidence/20261102-integrated-recovery-oEAmIHhQ/` and `docs/issue-75/host-patches/20261102-integrated-oEAmIHhQ/`, including structured materialization/recall, recovery audit, host posture, maintenance ledger, SOURCE.diff, SOURCE_PINS, replay helper and focused test sources; compared commit `d5fef6b..4639aa0`.

The acceptance packet reports 3 named entities and 3 edges in new `g_issue75_qual_final_oEAmIHhQ` episode `4909cbad-a283-468e-9b34-3b613c26cd2b`. The `RUNS` edge is scoped to the new group and mapped by fresh-process `Memory.search` to `opencode:opencode-qual-oEAmIHhQ:user:397f295c8b1eb454` with `user-stated` class. Wrong-group negative case returned no facts. The maintenance ledger records EX admission, 30s quiet grace, terminal edges/recall before lock release and LiteLLM restart afterward. **These are published host-generated records, not a fresh Central execution on the host.**

The repair audit reports old attempt `unknown -> dead`, `submitted=1,resolved=1`, one immutable `rejection_repairs` entry, other 1,326 intents and 84 attempts unchanged, and a durable `recovery_hold(held=1,revision=1)`. The source-backed `repair_rejected` uses an owned hold, exact preimages, fingerprint comparison, and a database transaction; a simple `dead_letter` would not settle the old latch. Source patch provides gate/receipt integration, owner binding, and held admission checks. Recorded 7/7 memory core, 12/12 recovery, 1/1 binding and 19/19 service integration tests are credible *reported test results*, not a new CI approval.

## Blocking corrections before PR / ordinary-use admission

### B1. Publish and verify the ACTUAL Graphiti extraction fix (blocking reproduction gap)

The commit's only `v2-candidate` changes are 8 added lines to `memory-core.mjs` and its test. The published 7-file host `SOURCE.diff` contains ONLY OpenViking/gate changes. The handback says it also modified installed `/workspace/mcp_servers/graphiti/run_graphiti.py` to strip thinking markers/code fences and changed the isolated LiteLLM extraction configuration (`preserve_thinking:false`, `drop_params:false`). Neither Graphiti sanitizer's complete patch, preimage/deployed hash nor reusable nonsecret extraction config is in the published review tree. Therefore a clean reconstruction from the branch cannot currently reproduce the claimed runtime fix.

Required: publish exact diff with correct base identity, deployed host SHA and a testable helper/regression for `<think>...</think>`, an orphan `</think>`, fenced JSON, valid empty structured JSON and malformed/non-JSON safety behavior; bound the parsing path to actual Graphiti OpenAIGenericClient and ensure errors are not silently swallowed. Publish sanitized LiteLLM per-alias config / effective request shape with source-of-truth identity and tests. Preserve interactive `chat` profile. If the fix is only a runtime monkeypatch, migrate it into a reproducible scoped integration overlay rather than claiming a published full patch. Prove one clean-room reproduction of the candidate, not just the already run live sample.

### B2. The production gate remains globally held (blocking normal operation)

Published `HOST_POSTURE.json` reports `recovery_hold.held=1` with three preexisting blank-scope `pending` intents and no authorized disposition. `QueueDB.next_ready` selects eligible pending rows; hold prevents them from starting, but also prevents ordinary valid session commits. Maintaining this hold was a safe containment decision, not a completed return to normal operation. The integrated contract explicitly requires reporting partial normal-admission status if pending-work disposition cannot be proved.

Required: read-only classify each of the three distinct pending rows and generation gaps with stable identity, exact scope/body, any previous attempts and backend evidence. If honestly rejected, use separately guarded, auditable per-record terminal disposition with exact CAS; NEVER rekey, replay, fabricate receipt or discard history. If legitimately pending but fixable, require an explicit bounded safe admission strategy rather than indiscriminate automatic drain. With no unresolved risks and adequate owner tests, perform an authorized owner/CAS hold release and prove that a **new valid authenticated session** can progress from queued acknowledgment to actual backend receipt/publication terminal completion, while old invalid rows never run. If no safe disposition, retain hold and report PARTIAL; no PR/issue closure.

### B3. Receipt GET reconciliation during hold: focused security/control gap

Published `gate/openviking_commit_gate.py` patch wraps `_proxy` only for receipt POST or GET with `recover` truthy. An ordinary `GET /api/v1/admin/commit_receipts/{session}/{key}` with default `recover=false` is forwarded via `_proxy_unheld`. The patched backend `get_commit_receipt` still calls `owner.reconcile(...,allow_recovery=False)`; an earlier host forensic handback reported this can seal receipt/task durable state even without `recover=true`. This may be a mutating route reachable during `recovery_hold`, contrary to the claim that **all reconciliation paths** are fenced. **Actual side effects on a specific receipt are not independently established by the published packet.**

Required: on a disposable copy with an extant terminal-but-unsealed receipt, verify whether default GET changes receipt/task/queue/gate state while hold=1. If so, block/serialize that mutating GET under the hold, while preserving truly read-only status and binding lookup as necessary. Confirm race/hold-release semantics and negative tests for `recover=0,false,true`, encoded paths, admin POST, and direct backend ingress controls. Do not skip this merely because original rejected request returned 404.

## Important verification and publication gaps

- The published `TEST_RESULTS.json` is a summary, not a complete new-head execution receipt with raw producer status, command lines, runtime version, and test logs. Publish a bounded sanitized commands/exit/hashes receipt from the final candidate after B1-B3.
- `NINFER_DECODED.json` contains full generated freeform model traces from a synthetic qualification. No obvious credential leak was identified in a bounded inspection, but future public packets should prefer the smallest necessary sanitized shape/tail and explicit privacy screening before publication.
- Model transport and request isolation were inferred and reported from host process observations; the maintenance ledger provides concrete lock and 30s grace timestamps, but Central cannot independently re-read mutable host state via GitHub. Re-authenticate live state at the next consequential operation.
- The historic accepted reranker findings (7/7 frozen, 5/5 older holdout, 9/12 new) remain accepted with known limitations: do not reopen relevance calibration.

## Next execution: one bounded closure campaign, not another broad issue

The operator already authorized appropriate host actions and scoped source/testing changes. The local controller (Codex or Agy) may address B1, B2, B3 coherently, including safe reversible service actions and exact-key guarded repair after fresh preflight, without asking Central for each ordinary substep. It must keep existing gate policy and historical data, preserve hold until safe to release, avoid parallel GPU model traffic, and publish **complete GitHub-readable sanitized artifacts** on `issue/75` in cohesive exact-head fast-forward commit(s). Do not create PR/merge; Central will independently review the exact newly published head.

If the three pending rows cannot be safely disposed, keep the hold deliberately active, preserve restored services and report `RESULT=PARTIAL`, not normal-operation PASS. If complete, provide a clean valid-session commit receipt/readback and fresh no-replay demonstration, alongside reproducible Graphiti extraction fix and updated tests.

Required final readback: branch/patch SHAs, exact source identities, B1 test receipts and extraction config, B2 disposition for each pending key, B3 GET hold regression, original rejection audit unchanged, gate after-state and held/released status, new valid commit receipt, Graphiti source-attributed recall, service restoration and private/public SHA256 manifests.
