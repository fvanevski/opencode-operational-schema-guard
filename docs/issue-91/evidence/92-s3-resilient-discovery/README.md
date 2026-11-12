# Issue #92 S3 — resilient-discovery terminal completion (evidence-only)

**Result:** `TERMINAL_RECONCILED`
**Status:** terminal reconciliation settled post-exit under the canonical EX
gate; sanitized evidence published with this commit.

## Campaign
Completes the existing S3 resilient-discovery qualification of Issue #92
without inference replay, new Graphiti writes, a new disposable cohort, or a
new PR. The original S3 run (source head `626df9eace9e9b1b141466a5d69c20df06d0995e`) completed 55 model calls
(29 discovery + 26 utility), froze its plan (19 approved / 10 deferred;
18 episodes submitted) and failed closed (`rc=3`, `unresolved:18`) when the
remote readback was not yet reconciled into the local ReviewStore. Central's
corrective commit `9b98e0e40f60c4fad964182510664e703dc6f44d` (9-line `fact-review.mjs` isolate-branch fix: forged
source refs classified as `unattributed_or_weak_source` instead of
`invalid_fact_fields`) is verified by its focused regressions.

## Identities
- Repository: `fvanevski/opencode-operational-schema-guard`
- Branch: `work/91-memory-utility-r1`
- Original S3 execution head: `626df9eace9e9b1b141466a5d69c20df06d0995e`
- Corrective verification head: `9b98e0e40f60c4fad964182510664e703dc6f44d`
- Frozen batch: `003aa99faaa944cd81e83a6d7fd314815857cb0dafbd69d359244b6cfd28db1c` (group `graphiti-adr92-s3-resilient-discovery`)

## What was done
1. **Corrected-source CPU acceptance** (`s3-native-test-results.json`):
   `fact-review` 16/16 exit 0 (previously-RED S3 isolated-discovery suite
   now GREEN); `finite-batch` 47/47 exit 0 (incl. "S3 does not retry a
   forged source reference"); `npm run check` exit 0; `npm test` 524/524
   exit 0. No assertions weakened.
2. **Frozen S3 state verification** (`s3-source-digest-roster.json`):
   active pointer, snapshot digest (JSON.stringify semantics), plan
   (24 outcomes: 22 REVIEWED / 1 SKIP / 1 DEFER; 29 items; 55 calls),
   55/55 paired intent/result model-call files with field-level digest
   verification; ReviewStore pre-state {{queued: 18, deferred: 12}}.
3. **Cross-commit compatibility**: the reconcile-only path is
   byte-identical between `626df9eace9e9b1b141466a5d69c20df06d0995e` and `9b98e0e40f60c4fad964182510664e703dc6f44d` (7 shared blobs); the only delta is
   the corrective `fact-review.mjs` isolate branch, which reconcile-only
   never calls.
4. **Read-only remote membership audit** (`s3-remote-audit-pre-reconcile.json`):
   `get_episodes` with `group_ids` array, `max_episodes=500`, 3 consistent
   reads: 18/18 queued identities positively present remotely, 0 absent,
   0 invalid, 0 duplicate, 0 extra.
5. **Terminal reconciliation** (`s3-reconcile-receipt.json`): ONE
   EX-admitted `reconcile-only` pass after harness exit (canonical
   OpenViking flock, 30s quiet grace, scheduler idle, production-drain
   serialization). CLI result: {"mode": "reconcile-only", "group": "graphiti-adr92-s3-resilient-discovery", "reconciled_persisted": 18, "unresolved": 0, "review_count": 30, "queue_new": 0, "queue_reserved": 0, "pending_review": false, "status": "settled"}. Terminal state {persisted: 18,
   deferred: 12}; 18 distinct valid UUIDs with continuity against the
   pre-reconcile audit; post-reconcile remote re-audit clean. No drain, no
   model inference, no `add_memory`, no replay of the frozen 55 calls.
6. **Scorecard** (`s3-scorecard.json`): immutable 16 valuable / 11 control
   denominators (S1 7/16, S2 9/16) — S3 terminal: **valuable 9/16, controls
   10/11**. Per-target first-loss stages recorded. Episode existence is not
   credited as extraction: 18 episodes total, 45 entity nodes, 12 fact
   edges (9 episodes with substantive extraction, 9 trivial
   membership-only). Retrieval usefulness unverified (no retrieval test
   in this campaign).

## Findings
- **Original-run behavior**: 55 calls, 19 approved, 10 deferred; 18
  episodes submitted and positively present remotely; local terminal proof
  was the only missing piece (recovered here, no replay).
- **Corrected-source verification**: the forged-source classification fix
  is regression-verified (focused suites GREEN); the original run's one
  spurious `invalid_discovery` recovery trigger (forged ref misclassified
  as `invalid_fact_fields`, diagnostic `assertion`) is recorded as an
  experimental limitation — forged refs were never persisted as facts.
- **S3 recovery yield**: the 7 S2-missed valuable targets (g1 x2, g2, g3 x2,
  g4, sp9) are NOT recovered: their clusters deferred at utility
  (`not_substantive`) or discovery (SKIP / field validation). S3 terminal
  valuable retention is 9/16 (the 9 S2-retained targets, including both dj1
  targets via one dj1 cluster). Control retention 10/11 (sp7 lost: its
  record deferred locally).
- **Model usage**: 55 calls, 0 errors, 54811 prompt / 4768 completion tokens.

## Not done
No new model sweep, no inference campaign, no new cohort, no PR/merge,
no production installation, no issue closure, no changes to repository
logic/tests/validators or the EX gate, no mutation of historical campaigns.

## Friction
`COMMAND_SHAPE_FRICTION.encountered = yes`; `COMMANDS_MATCH_HANDOFF = yes`
— see `s3-command-shape-friction.md` (8 events, all caught by the
campaign's own fail-closed guards before acceptance).
