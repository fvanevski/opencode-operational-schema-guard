# #100 B4: selective, local-authoritative retention consolidation

Accepted predecessor: #99 source-preserving F archive; canonical EX/quiet grace; existing `ReviewStore` with one independently attributable source fact per positive Graphiti episode. **No new state store or graph update API.** This source is an opt-in candidate until exact-head and host acceptance.

## Why the Graphiti API does not own status

The 2026-11-16 host-attested Graphiti MCP tool catalog has 13 methods but no non-destructive episode metadata-update/tag method. Existing `delete_episode` and `add_memory` are *not* acceptable mechanisms for revising status or achieving logical retirement. Source facts, original class and terminal remote episode UUID remain immutable. The local ReviewStore fact controls retention and associated recall authorization.

## Trigger and decision

`docs/issue-100/consolidation.mjs` proposes at most **two** pairwise model reconsiderations per admitted drain. The old record must be terminal/persisted and initially `provisional_retention`. New context must be another *independently sourced* terminal fact in the same group/project/workspace, with a different origin source, positive remote UUID, source timestamp newer than the previous observation, created no earlier than the old retention assessment, and either explicit source relationship or bounded informative-token overlap. Overlap is a **prompt-selection heuristic only**, not semantic truth or a veto on future knowledge.

For each pair, the worker reads the live same-group `get_episodes` inventory and confirms BOTH exact name/UUID identities before asking the local model. At the 1,000-result bounded list limit, missing/incompatible responses fail closed without remote mutation or assumptions about absence. Historical source or identical replay cannot initiate another model call without new source evidence.

The local model chooses one of `retain_provisional`, `promote_retention`, `supersede`, `logical_retire`, supported by a short private/safe utility rationale. It **never** asserts factual verification. `ReviewStore.applyRetentionConsolidation` verifies the source trigger again under per-record revision CAS and EX admission, atomically updates local retention metadata/audit, and leaves fact text, source evidence class, original events, Graphiti episode UUID and source index byte-preserved. A separate one-step CAS rollback reverses the retention status without replaying Graphiti. Unchanged or invalid model output is an actionable technical retry, not a destructive move.

## Public retrieval

`sourcedEpisodeResolver` rejects logically retired/superseded records even if their old Graphiti episode still exists. `curatedRecallCandidates` independently excludes those records and labels provisional knowledge as provisional source-reported material, while retaining the exact remote-membership check in the final consumer. Existing historical records without retention fields remain valid and are not recategorized. Source classes and temporal qualifiers remain unchanged. #101 owns broader retrieval-route simplification and final shared-memory context/answer performance.

## Cost and safety controls

- New capture/curation and terminal-UUID reconciliation take priority. Optional consolidation runs only after the current EX drain settles eligible new/retry work; no nightly full-graph reranking.
- At most two consolidation model attempts per admitted run; aggregate model calls/tokens and status transitions are counted separately.
- The **existing** Python `post-exit-drain.py` wrapper now has an opt-in `--autonomous-curation` flag, passed on both first drain and exit-4 local-work resumption. Its historical filename does not require an unexcluded Hermes orchestrator to exit; the gate still enforces classified harness exclusions, protected model idleness, quiet grace and the exclusive EX lease. It remains off for all pre-existing production service invocations; incompatible `--finite-batch-v2` is rejected.
- Graphiti submission_unknown/queued never becomes a trigger. No physical node/edge/episode mutation for consolidation.
- New model `utility_reason` is sanitized and **not included in remote Graphiti episode bodies**. They contain only exact source assertion, source/temporal evidence labels and retention classification.
- No fresh host evidence for a prospective real model utility rate, automatic consolidation frequency or verified same-request recall has yet been claimed.

## Scope limitations and required next proof

This first implementation covers **new source-triggered reconsideration of existing provisional facts**. It does not automatically retire every older established fact upon a reported contradiction, infer a graph relationship solely from unlabeled semantic neighbors, or update Graphiti metadata. Such extensions require evidence of material incremental benefit and source-safe semantics; #100 acceptance need not be inflated into a full graph-ontology migration. #101 retains consumer/ranking and final shared-service acceptance.

Next qualification: exact-head trusted Actions and focused CPU tests, **then** a genuine EX-admitted model-backed disposable group comparison orchestrated directly by unexcluded Hermes (including normal/predecessor plain drain vs new auto mode, immutable original-source/UUID and blocked invalid cases), central exact-source review, late Codex review only where authorized, merge/main Verify, and reversible installed-module/config activation with fresh native capture/curation and Graphiti readback. Actual answer/context utility remains #101.
