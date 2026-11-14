# Issue #92 / PR #95 — V8d terminal first-loss forensics (sanitized evidence)

Branch `issue/92-v7c-accepted` | Hermes Evidence | CPU-only, read-only Graphiti, no inference,
no source/test/scorer/label edits
CONTRACT=docs/issue-91/adr-acceptance/ISSUE92_V8D_FIRST_LOSS_HERMES.md

## RESULT = **V8D_FIRST_LOSS_RESOLVED**

The frozen V8d terminal FAIL (5/10 valuable, 5/8 useful, 5 useful independent
facts, 8/8 remote membership) was forensically decomposed from the immutable
discovery/plan/ReviewStore/remote records. No inference was repeated, no labels
or the scoring standard were changed, and no historical state was mutated.

**BATCH_ID** = `6d7afb9de1f9f7e8c2af31022b0824b0a1762f48919672067856b49843a2b2b2`

## A. Provenance
Required head `1a5ed42…` verified; production source head `d3d66bb…` and frozen
execution head `c402658…` + terminal evidence head `5303409…` all in ancestry.
Frozen digests confirmed: manifest `aa42941a…`, labels `c9befd79…`, roster
`3414d767…`; one-shot marker present (1 reconcile); 74 model-call pairs intact;
scorer re-run (read-only) reproduces the FAIL.

## B. Ten-case first-loss ledger
| case | FIRST_LOSS | frozen handle |
|---|---|---|
| v-01 | COVERED | plan approved / record 56bd9e5c (useful) |
| v-02 | UTILITY_DEFER | plan deferred `source_only_utility_transient_execution` |
| v-03 | COVERED | plan approved / record d6046831 (useful) |
| v-04 | PERSISTED_NOT_USEFUL | record 0d2314ab; proposed network-name policy |
| v-05 | COVERED | plan approved / record 6f758877 (useful) |
| v-06 | PERSISTED_NOT_USEFUL | record fd02f051; transient MCP-failure observation |
| v-07 | CLUSTER_CAP_OR_FALLBACK | absorbed into v-01 shared-session cluster; no own item |
| v-08 | PERSISTED_NOT_USEFUL | record 1227b814; tentative "appears to have been" defect |
| v-09 | COVERED | plan approved / record 57eaa8c7 (useful) |
| v-10 | COVERED | plan approved / record fa0007ce (useful) |

Tally: 5 COVERED, 3 PERSISTED_NOT_USEFUL, 1 UTILITY_DEFER, 1 CLUSTER_CAP_OR_FALLBACK.

## C. v-01 / v-07 / c-01 shared-session
All three share native session `ses_f778e7103ffeQpw0IzHBwX37Fb`. The persisted
plex record `56bd9e5c` has `fact.source_refs=[v-01]` only, while
`source_event_ids=[c-01, v-07, v-01]`. Read-only `get_episodes` shows the episode
body cites **only** `msg_089998671001` (v-01); c-01 and v-07 are **absent** from
the episode body.

**c-01 = REVIEW_CONTEXT_OVERINCLUSION** (a sibling in the review-record
provenance, not a fact source, not in the episode) — NOT `CONTROL_FACT_PERSISTED`.
**v-07** first loss is `CLUSTER_CAP_OR_FALLBACK`: the cluster had
`approved.length=1`, so the source-only fallback (`approved.length===0 &&
entries.size===0`) did **not** fire; v-01 simply won finite-batch representative
selection.

## D. Independent-usefulness discrepancy (v-04 / v-06 / v-08)
Adjudications inspected, not rescored:
- **v-04** (Tdarr network, excerpt `241aa02c…`): CONFOUNDS unverified deployment
  with no durable value (a desired network name is a durable architectural fact).
- **v-06** (graphiti MCP, excerpt `2451067c…`): CONFOUNDS a transient observation
  with no durable value (a reported post-restart MCP failure is a diagnostic signal).
- **v-08** (pairing-loop, excerpt `7bf6d339…`): GENUINE source uncertainty (the
  hedged "appears to have been" is a tentative explanation, not a verified defect).

**Scorer discrepancy**: `issue92-a3-acceptance.mjs` tracks
`nonvaluable_persisted_cases` (a control-sourced fact increments it) but has **no
pass gate** over it; its own reference test persists 9 valuable + 1 control and
asserts `pass===true`. This is a validation-control gap, not a modified standard.

## E. Historical integrity / code edits
Frozen v8d manifest/labels/roster, 74 call-result hashes, 8 persisted Graphiti
episodes and the FAIL score are all unchanged (read-only). **No code, test,
scorer, label, prompt, cohort, inference, merge, deploy or Issue #92 closure.**
Additive evidence-only commit.
