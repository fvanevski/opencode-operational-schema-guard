# Issue #92 / PR #95 — Frozen V8d prospective execution (terminal evidence)

Branch `issue/92-v7c-accepted` | Hermes Build | one admitted inference, reconcile-only
AUTHORIZATION=A3_V8D_PROSPECTIVE_APPROVED | REQUIRED_HEAD=c402658e…

## RESULT = **A3_V8D_PROSPECTIVE_FAIL**

The approved, untouched 20-case v8d cohort was executed **exactly once** under
kernel-backed EX admission and scored with the canonical eight-argument
`scoreProspective` scorer against the immutable frozen cohort. The cohort did not
reach the numeric acceptance gates.

**BATCH_ID** = `6d7afb9de1f9f7e8c2af31022b0824b0a1762f48919672067856b49843a2b2b2`

## What happened
- 18 candidates → 8 approved / 10 deferred; 74 model calls (discovery 49, utility
  18, support 6, arbitration 1), 0 errors.
- 8 facts persisted to group `graphiti-adr92-a3-prospective-v8`; reconcile-only
  settled 8 persisted / 0 unresolved; state-scoped once-only marker written; no
  model replay.
- Positive remote reconciliation: all 8 persisted UUIDs present in the group,
  0 extra episodes, source index intact.

## Scorer verdict (gates)
| gate | value | threshold | pass |
|---|---|---|---|
| valuable_coverage | 5/10 (0.50) | ≥ 0.85 | **FAIL** |
| grounded_precision | 8/8 (1.00) | ≥ 0.90 | pass |
| useful_among_grounded | 5/8 (0.625) | ≥ 0.75 & ≥8 useful | **FAIL** |
| zero_authority_breaches | 0 | 0 | pass |
| terminal_source_integrity | — | — | pass |
| independently_ratified_labels | — | — | pass |

## Why it fails
- Only 5/10 valuable predicates were recovered as **independently useful** atomic
  facts: v-01, v-03, v-05, v-09, v-10.
- v-02 (plex media-state) was deferred; v-07 (nekoBT/Prowlarr) was bundled into the
  v-01 record (no independent fact); v-04 (proposed Tdarr network name), v-06
  (transient graphiti-MCP failure) and v-08 (tentative pairing-loop defect) were
  persisted but **not credited as independently useful** because their sources only
  reported a proposed configuration, a transient observation, or a tentative
  explanation.
- **Control pollution**: control v8d-c-01 was bundled as a source event into the
  persisted v-01 (plex) fact.

## EX admission / atomicity
Kernel-FLOCK inherited via `GHDEV_MEMORY_POST_EXIT_LOCK_FD`; scheduler idle,
harness-exit, 30s quiet grace; once-only marker; reconcile-only (1 attempt).
Production treatment carried `atomicity_review_v1=true` and
`atomicity_structural_v1=true`.

## Historical integrity / source changes
Frozen v8d manifest/labels/roster immutable (no label revision, no prompt change,
no re-inference); v8/v8c/v7c/r1/r2 records unchanged; no Graphiti writes beyond the
single batch. Additive terminal evidence only. No new PR, merge, deployment or
Issue #92 closure.
