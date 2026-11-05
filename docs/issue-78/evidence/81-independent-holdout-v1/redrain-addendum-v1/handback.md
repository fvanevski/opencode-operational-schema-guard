# Handback — Issue #81 independent holdout, corrected re-drain addendum (Phase B)

**Packet:** `81-independent-holdout-v1-redrain-addendum` · campaign `ISSUE81_INDEPENDENT_HOLDOUT` · parent packet `81-independent-holdout-v1` (commit `e238e6bd…`)

```text
CAMPAIGN=ISSUE81_INDEPENDENT_HOLDOUT
PHASE=B_POST_REDRAIN
REPO_ID=fvanevski/opencode-operational-schema-guard
PR=83
TESTED_SOURCE_SHA=3271a97be43d25f6646a63cce71fc0e907fd1059
EVIDENCE_PARENT=e238e6bd53ff89be8973a2a02d8050eea2051131
CORPUS_PRIVATE_SHA256=524de3ff36877442c6dc4e75edf5da9f317ba1c2e25e267b117233514e425863
HOLDOUT_GROUP=cur81_holdout_cc5349fc
UNIT=ghdev81-holdout-cc5349fc.service (second post-exit execution, operator-started)
EX_ADMISSION=run-2 EX admission proven 2026-11-05T00:16:26Z; terminal 00:17:24Z (admission→terminal 58 s; wall 88.046 s); lease released; no outstanding exclusive drain lease
MODEL=chat-fast (non-thinking); 3 attempts / 3 successful calls / 0 errors; 2334 ms; 6548 prompt + 564 completion tokens; 0 reasoning
DECISIONS=curated 3; EMIT 2; DEFER 1 (model_assertion_not_source_extract); SKIP 0; queue 22 rows (16 approved / 6 deferred); 0 submission_unknown / 0 unresolved
REEVALUATE_FLAGS=all 3 consumed (false on all records); each record genuinely re-evaluated by the model
PERSISTED_EPISODES=2 (d4b8fff6-e89f-40c4-a81b-f3c2bf7723a1; 56b75c2c-e2f8-404f-baed-531ef76ce260) — group-scoped durable readback verified (episodes, names, content bindings, 4 nodes, 3 edges, _episode-index agreement); no deletes/rewrites
REMOTE_UNRESOLVED=0 (reconcile-only: settled, exit 0)
GRAPHITI_SOURCE_INDEX=verified (episode content binds exact source references + scope; local index agrees)
PRODUCTION_NONMUTATION=PASS (ghdev_gh_mcp 4 episodes unchanged, UUIDs identical; historical cohorts unchanged)
FACT_VERDICTS=operator-ratified (FACT 1 grounded/useful=false/authority/scope; FACT 2 all-true; 1 amendment); worksheet 26c7692d…; operator confirmation recorded verbatim
QUALITY=held-out candidate recall 14/14=1.00 PASS (frozen); durable grounded precision 2/2=1.00 PASS (≥0.90, receipt-bound, operator-judged, n=2 — not proof of usefulness or statistical strength); useful-persisted 1/2=0.50 (separate metric); false authority 0; wrong scope 0; privacy/wrong-group leakage 0; post-exit p95 58.2 s PASS (≤900 s); semantic recall UNVERIFIED_UNTIL_FRESH_CLIENT; context latency UNVERIFIED_UNTIL_INSTALLED
SOURCE_CODE_MUTATION=none
EVIDENCE_PUBLICATION=this addendum commit on issue/81 (evidence-only path docs/issue-78/evidence/81-independent-holdout-v1/redrain-addendum-v1/)
REMAINING_GATES=Central independent exact-head review; late Codex if available; authorized merge; main CI; fresh installed client (semantic recall ≥0.80, context p95 ≤300 ms) + OpenViking coexistence; final #81/#78 closure (Central)
NEXT=Central independent review of the addendum on PR #83
```

## What this addendum establishes

- The single authorized corrected re-drain **succeeded**: 3/3 records
  re-evaluated, 2 EMITs persisted with durable, independently read back remote
  receipts, 1 DEFER accepted, 0 unresolved, EX lease released.
- The operator's fact adjudication (one amendment: FACT 1 `useful=false`) is
  bound to the unchanged corpus, case labels, targets, and receipt-bound
  observations; the frozen scorer (`adjudicate.mjs score`, digest-pinned inputs)
  yields the final three-path score in `final-score.json`
  (SHA-256 `c0fcb59982fdbc1f327ec2d4dd2ee0bea9c5a5b395fc225374f53a00e645b823`).
- Durable grounded precision is now a **measured 1.00 over 2 receipt-bound
  operator-judged facts** (previously `UNVERIFIED` with an empty denominator).
  It rests on two assertions; it is reported as meeting the ≥0.90 threshold,
  not as proof of high durable-memory usefulness, statistical confidence, or
  end-to-end Issue #81 acceptance.
- Useful-persisted fraction is **1/2 = 0.50**, kept separate from grounded
  precision; the known prior six transient EMITs of the historical development
  cohort remain reported there, not merged into this denominator.

## What remains genuinely outstanding

- Fresh installed-client semantic recall (≥ 0.80) and interactive context
  latency (p95 ≤ 300 ms) — distinct later gates on an installed client.
- Central's exact-head independent review, late Codex if available, authorized
  merge, main CI, and final #81/#78 closure.

## Boundaries honored

No new model inference, no re-drain, no restaging, no new PR, no production
source change, no merge, no deployment, no issue closure. No Graphiti deletion
or rewrite; the two episodes and their receipts are preserved exactly as
written by the run-2 drain. One sanitized evidence-only addendum commit on
`issue/81` with exact-parent verification.
