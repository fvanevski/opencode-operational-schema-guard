# Issue #100 | B1 architecture and B2/B3 first integration

**Authority:** #98/#100 prospective architecture; accepted #99 source-preserving F archive. **Working base:** 658c4c96abc392bf8a100c1afd1dcfacc3adf5b0. This is an opt-in implementation candidate, not a deployed policy or a replacement for historical scorecards.

## Actual source trace and decisions

Native stage `v2-candidate/events.mjs` / `queue.mjs` → `worker.runAdmitted` → `core.validateModelDecision` → `ReviewStore.create/createBundle` → `promoteOne` → EX-gated `add_memory` → positive `get_episodes` UUID → `_episode-index`. The post-#99 F archive reclaims pending capacity without deleting original source events. `fact-review.mjs` independent model pass and `finite-batch.mjs` recovery stacks are CLI opt-ins; actual installed argv/env require host readback.

| Component | Decision | Reason |
|---|---|---|
| Native source/queue and #99 F archive | KEEP | Original identity/dedup/archive and recovered capacity are accepted dependencies |
| ReviewStore per-fact JSON, revision CAS, bundle and UUID index | EXTEND | One durable retention authority plus terminal remote proof; no new database |
| Existing normal model prompt and durable utility veto | REPLACE for new opt-in mode | Uncertain usefulness is not integrity failure |
| Mandatory independent utility reviewer | RETIRE from new normal mode; optional comparator only | No evidence it must veto safe provisional knowledge |
| Original-source scope/privacy/temporal validation | KEEP | Hard authority, never learned utility |
| Portal DEFER/approve queue | RETAIN as exceptional repair/inspection; REMOVE normal throughput dependency | No routine human approval |
| Finite-batch, source repair, claim critique stacks | RETAIN only where measured recovery benefit is demonstrated | Historical fixtures are not production mandate |
| EX shared lease and unknown remote reconciliation | KEEP | No concurrent model writes or ambiguous replays |
| Graphiti one episode / one source-supported atomic fact | KEEP | Requires independent per-fact UUID/index |
| Graphiti metadata mutations / physical deletion | DO NOT ADD | Installed API and rollback unverified |
| Retrieval selectors and OpenViking | DEFER to #101 | Consumer changes need independent source/remote checks |

## New policy boundary

One model call discovers up to three atomic quoted facts and makes per-fact utility decisions: `established_retention`, `provisional_retention`, `skip_non_substantive`. Independent deterministic validator verifies source handle, literal span, scope, evidence class, time, safe quote and actual per-fact support. A provisional label never repairs an invalid quote or upgrades a user/assistant report. Malformed/absent model output leaves original work retryable, not silently SKIP. Bad siblings remain blocked with typed diagnostics; safely valid sibling facts proceed separately.

Retention metadata lives on the revisioned ReviewStore fact, initially `retention:{status,reason,source_span,revision,trigger,assessed_at}`. The original quoted assertion and source refs remain the fact body; normal promotion still requires positive terminal remote UUID/index. This is RETENTION decision confidence, not factual truth. Future B4 revisions must CAS the existing record, preserve source/episode identity, require new independent evidence or relationship trigger, and logically retire in local authority before contemplating physical changes.

## Activation fences and remaining issue work

The opt-in `--autonomous-curation on` only applies to `drain`; do not silently modify the installed production invocation. B4 still requires a bounded graph-aware, non-destructive consolidation trigger/transitions and later retrieval exclusion/presentation. B5 requires frozen prospective cases, predecessor comparison, model/token/correctness counts, host installed source/config/EX admission and rollback. #101 retains final dual-memory real-request/answer-level and hook-latency gate.

No new PR is needed for B4/B5. Complete them on issue/100 after the first CPU/host compatibility evidence, preserving any material fault findings.
