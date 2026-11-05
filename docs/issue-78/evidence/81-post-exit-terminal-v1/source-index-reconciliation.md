# Issue #81 — Source-index reconciliation (81-post-exit-terminal-v1)

Reconciles the review-store curation records, the episode-index, and the live Graphiti episodes.

## Dev group `cur81_native_a1f3c9d7`

- **Curation records:** 13 (all `decision=EMIT`).
- **Episode-index entries:** 12 (local curation id → remote episode UUID).
- **Live Graphiti episodes:** 12.
- **Reconciliation:** 12 curation records have a remote episode UUID and a matching live episode.
  The 13th curation record (`f1a8c418fbffc30613c16de5a9d38cd6d43d418ee58b0230ce15ea240bb17a79`) is
  `decision=EMIT` but `state=deferred` with `reason=LOCAL_REPEATED_ASSERTION` and
  `remote_episode_uuid=None` — a clean local deferral (a repeated assertion already covered), **not**
  an ambiguous remote write. It correctly has no episode-index entry and no live episode.
- **Conclusion:** 12 persisted / 1 cleanly deferred / 0 ambiguous. All 12 live episode UUIDs match the
  episode-index exactly (verified by UUID).

## Holdout drain group `cur81_holdout_4c3ab514`

- **Curation records:** 3 → 1 `EMIT` (persisted), 1 `SKIP` (single-word instruction, no durable fact),
  1 `DEFER` (transient git-state observation).
- **Episode-index entries:** 1. **Live Graphiti episodes:** 1 (`69fde784-…`).
- **Conclusion:** 1 persisted / 1 skip / 1 defer / 0 ambiguous.

## Staged blind-holdout capture group `cur81_native_holdout_a1f3c9`

- **Live Graphiti episodes:** 0 (capture-only; the blind capture was not drained — its disposable drain is the
  separate `cur81_holdout_4c3ab514` group). 66 staged candidate events on host; no remote episodes. Correct.

## Production / prior groups (non-mutation)

- `ghdev_gh_mcp`: 4 episodes (baseline intact). `cur81_dev_ce555621`: 9 episodes (intact).
- No campaign write touched either group.

## Duplicate / ambiguity scan

- No duplicate episode UUIDs within or across the campaign groups.
- No `state=ambiguous` / unresolved remote submissions. The drain's single ambiguous-remote window
  (dev, after the first `persisted:5` pass) was closed by `reconcile-only` passes to `unresolved:0`
  before the EX lease released.
- **AMBIGUOUS_REMOTE_WRITES = 0.**
