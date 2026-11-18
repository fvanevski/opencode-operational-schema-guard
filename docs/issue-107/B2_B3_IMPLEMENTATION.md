# #107 B2/B3 candidate: bounded format-sibling recovery and source-distinct local links

Base source: accepted #106 merged main `5efc2c27f9c95da67dfd750f3bcb7877b7d380d5`; implementation lives only on `issue/107` / PR #110 until independent review, merge/main verification and reversible activation. See `B1_MODEL_ADJUDICATION.md` for the completed local-model decision to **KEEP** the existing one-pass prompt; compact remains a nonproduction comparison artifact.

## B2: preserve valid fact and one bounded correctable sibling

A format-invalid model sibling may be silently omitted from the #100 accepted proposal while a valid sibling causes the native source to become owned. Re-running that source as a new parent would violate the #99 source-owner/Graphiti no-replay contract.

- The existing `validateAutonomousDecision` now returns `recoverable_siblings` **only** for blocked model-format classes with an authenticated `native-id` source reference. It does not retain invalid model quotes, unsupported claims, unsafe rationales, forged refs, or hard integrity blocks. Valid siblings continue unchanged.
- The existing `ReviewStore` writes a `issue107-format-sibling-bundle-v1` manifest **before** emitting children. It preserves ordinary individually addressable approved fact children and additional `deferred` pending-sibling children under the *same* immutable `origin_cluster_id` and source-event ownership. Existing `issue92-bounded-fact-bundle-v1` manifests remain accepted without rewriting/migrating them.
- Each pending child records its authentic source handle, failing model-format field and a two-attempt local-only allowance. A legitimate EX-admitted worker reserves an attempt durably **before** the model request, targets only that original source handle, uses the accepted strict autonomous validator, and accepts at most one independently sourced fact. A previously accepted sibling's assertion is never re-reviewed. Same-normalized-assertion duplicates are blocked against the original bundle's children before approval.
- Successful model-only reconsideration CAS-changes the pending child from `deferred` to `approved` with its own source-verifiable assertion, retention classification, revision and audit. The ordinary already accepted `promoteOne()` and positive remote UUID/index procedure subsequently governs any Graphiti submission; there is no special remote-write path, new queue or automatic remote retry.
- Failed model output leaves the source in a bounded `pending`/eventually `exhausted` local state, **never SKIP or submission_unknown**. One model-only call may be resumed after a process crash. A crash after the final reserved attempt is settled as exhausted by the next genuinely EX-admitted drain without another model or Graphiti call. Original accepted fact and source ownership remain unchanged.
- New-source consideration and terminal remote reconciliation remain higher priority than optional sibling retry. A child created in the current drain cannot immediately consume a second model call in that same drain. At most two older format siblings are reconsidered per admitted invocation, subject to the existing overall deadline/cluster caps.

Potential limitation: recovering a sibling requires a real compatible model/EX window. The accepted baseline gave no malformed siblings in the eight paired host cases; this is a source- and mock-regression-backed recovery capability, **not yet a measured live useful-fact uplift**.

## B3: recorded corroboration without gratuitous graph bloat

Previously `duplicateState()` treated same-normalized assertions from different native messages as `LOCAL_REPEATED_ASSERTION` without authenticating whether the original occurrence was the same. The host read-only audit's seven local-repeated deferrals therefore cannot be assumed to be same-source replays.

- `nativeFactOrigin` recognizes original native user-message identity (multiple `:span:<offset>` segments share one origin), assistant-message identity and tool-call identity. Session-scoped fallbacks do not qualify.
- A **source-distinct** equal normalized assertion may create a revisioned `ReviewStore` corroboration link **only** when the earlier record is `persisted`, same group/project/workspace, has one atomic fact, a valid UUID and matching **local positive episode-index entry**, and is neither logically retired nor superseded. The second source retains its own original evidence class and is deferred with explicit link metadata. No extra Graphiti episode, truth promotion, source join, or cross-group assertion occurs.
- Same-source repeats, uncertain/queued/`submission_unknown` origins, failed extractions, weak evidence, wrong scope and missing or stale index identities remain fail closed. The linked second source is **not** represented as a newly persisted episode in qualified recall; retrieval of the original indexed episode is unchanged. Graphiti remote membership is not independently reverified by this local-link operation.
- This is locally recognized reported-assertion overlap, **not** independent empirical verification of the statement. No new Graphiti relationships or physical deletion.

## B4: conditional non-change

Current read-only host audit found approximately zero eligible consolidation pairs. Future recall gain is unverified, so retain the existing two-per-drain conditional, locally CAS-reversible consolidation. No mandatory second model reviewer, sweep or speculative trigger is added.

## Deterministic Verify and required host gate

The trusted curator profile imports `docs/issue-107/{qualification,corroboration,sibling-reconsideration,sibling-worker}.test.mjs`. Tests cover strict source/origin checks; two sibling attempts and crash/restore; no improper second Graphiti submission; positive local index and distinct native source recognition; source ownership unchanged across multiple children; and a mock EX worker progressing from first fact to second independently indexed episode.

**Before merger** obtain a bounded live-host qualification on the exact candidate source that authenticates the installed current production baseline read-only, runs focused source tests, and executes a **disposable-group**, canonical EX-admitted real local-model/Graphiti positive run when supported. Check one-fact-per-episode, exact original-source-index UUID, local revision/no-replay, preserved production group/queue/archive, and service restoration if any maintenance window is used. A mock test is not actual remote persistence evidence. Do not silently execute model/Graphiti while persistent OpenCode/agy SHARED lease owners prevent EX. Separate source-only PASS from remote host PASS and report unavailable observations.

Only after these gates: exact current-head independent semantic/Codex review as applicable; merge with verified conditions; merged-main CI and reversible stock-V2 activation/fresh process; then issue #107 closure when independently accepted. Parent #105 and #108 remain open.
