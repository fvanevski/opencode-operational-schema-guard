# Issue #81 — Adjudicated Quality and Sealed-Holdout Qualification Report

Campaign `81-adjudicated-quality-v1`. Source authority: `issue/81` exact head `85c92809b04a25088d5b959626670f114d97d6b7` (base `d7c32f503eaa4cf4c52bb055b434e0ac71b76f45`).

This is **review-ready evidence**, not proof of installed post-merge fresh-native acceptance (that gate is `POST_MERGE_FRESH_NATIVE_PLAN.md`, a separate merged-main phase).

## 1. Frozen identities (byte-verified this campaign)

| Item | SHA-256 | Status |
|---|---|---|
| Development corpus (57) | `22ae11e64a7a9c443d6f13a79c363115a28b43a27620e5383449bfe32d9fb5b4` | VERIFIED |
| Sealed holdout corpus (9) | `f904411e51d0bd9674b7f756f3df5bf44452ca8f63362d75102ceb9df677fce4` | VERIFIED |
| Pre-result target proposal | `17ffb60515f5f96f2d546fd3abf951d0bc008325e38d83145ec4f75a8c76f049` | VERIFIED |
| Operator case-label adjudication (dev 57) | `0a6c657ac825f3bf33f7b7308698f6018eb42f94f2aa9705c791a5013920a18d` | OPERATOR_RATIFIED |
| Operator case-label adjudication (holdout 9) | `c7aafbd266711d4b02aacf56b61271e2b8668d8082523973f066067781fee9c7` | OPERATOR_RATIFIED |
| Operator fact-verdict worksheet (holdout, +1 fact) | `e432b47fd8af5529a959c04939868ead81105809f9c5600fed8e57dd5b280ecd` | OPERATOR_RATIFIED |
| Target ratification (unchanged proposal) | `ced9b984b17c1131984184b1bd9c666df3bdca9f20a3a067ee79763f4a05f3d4` | OPERATOR_RATIFIED |
| Dev observations receipt (13 decisions / 9 facts) | `543ad0100535790702b91b89743236506c7758d9f49ea7bc16fb917088fd2b53` | VERIFIED |
| Holdout observations receipt (3 decisions / 1 fact) | `6a441af31cd08bea1c528bf9590b5add069754b1fc7fc62d8f6193a03356ed75` | VERIFIED |

The operator (anonymized as "operator") ratified all 57 dev labels, all 9 holdout labels, the 9 dev facts, the 1 new holdout fact, and the unchanged target proposal. `case_label_changes_from_provisional = 0` for both splits (labels confirmed as-proposed, not revised post-outcome).

## 2. CPU preflight (exact head, node v26.13.0)

`node --check` OK on 7 modules; `node --test` all exit 0: evaluate 9/9, adjudicate 4/4, stage-holdout 2/2, curator 32/32, model-policy 2/2, efficiency-probe 2/2, candidate(#79) 15/15 → **66 pass / 0 fail / 0 skip**.

## 3. Three-path comparison (identical adjudicated cases)

### Development (57 cases, operator-adjudicated)

| Path | TP | FP | TN | FN | Precision | Recall |
|---|---|---|---|---|---|---|
| #75 baseline | 3 | 1 | 19 | 34 | 0.75 | 0.081 |
| #79 broad capture | 27 | 6 | 14 | 10 | 0.818 | 0.730 |
| Curator (model decisions) | — | — | — | — | — | — |

Curator: 13 records (9 EMIT / 3 DEFER / 1 SKIP), 0 invalid, 9 facts all human-judged, **grounded precision 1.0**, 9/9 remote-receipt-bound, 0 false-authority, 0 wrong-scope. Dev drain usage: 28,538 tokens, model time p50 3689 ms / p95 5885 ms.

### Sealed holdout (9 cases, operator-adjudicated + real post-exit model)

| Path | TP | FP | TN | FN | Precision | Recall |
|---|---|---|---|---|---|---|
| #75 baseline | 0 | 0 | 3 | 6 | — | 0.0 |
| #79 broad capture | 3 | 2 | 1 | 3 | 0.60 | 0.50 |
| Curator | 1 EMIT / 1 SKIP / 1 DEFER | — | — | — | — | — |

Curator: 3 records, 0 invalid, 1 fact human-judged (all four dimensions true), **grounded precision 1.0**, 1/1 remote-receipt-bound, 1 useful durable fact, 0 false-authority / 0 wrong-scope. Real post-exit drain: 3 model calls, 0 errors, 1 persisted Graphiti episode, 0 unresolved.

## 4. Target outcomes (unchanged, operator-ratified)

| Target | Development | Sealed holdout |
|---|---|---|
| candidate_recall ≥ 0.85 | **FAIL** (0.730) | **FAIL** (0.50) |
| durable grounded precision ≥ 0.90 | **PASS** (1.0) | **PASS** (1.0) |
| zero secret leakage / wrong-group / false-verified | PASS | PASS |
| semantic_recall ≥ 0.80 | UNVERIFIED (fresh-client gate) | UNVERIFIED (fresh-client gate) |
| context p95 ≤ 300 ms | UNVERIFIED (installed gate) | UNVERIFIED (installed gate) |
| post-exit terminal p95 ≤ 900 s | measured (dev: settled) | measured (holdout: settled, exit 0) |

**Honest negative result:** candidate recall is below the 85% proposal on both splits (0.730 dev, 0.50 holdout). This is a real measurement, not a tuning artifact. The 9-case holdout is a **small diagnostic sample** (recall 0.50 over 6 valuable events); it does not establish the installed fresh-client semantic gate, which remains `UNVERIFIED_UNTIL_FRESH_CLIENT`. Durable grounded precision passes on both splits because every EMIT fact was operator-accepted and remote-receipt-bound.

## 5. Graphiti quality

- Development: 9/9 EMIT persisted, verified_readback, 0 duplicates, 0 unresolved (prior receipt).
- Holdout: 1 EMIT persisted (episode `69fde784…`), 2 extracted nodes + 1 EXPORTS edge, source-index verified, 0 duplicates, 0 unresolved.
- Production invariance: `ghdev_gh_mcp` = 4 episodes, `cur81_dev_ce555621` = 9 episodes — both unchanged.
- Duplicates: 0. No blind replay (the re-drain re-curated local defers; no remotely-ambiguous write was replayed).

## 6. Tokens, latency, extraction cost

- Dev drain: 28,538 tokens; model time p50 3689 ms / p95 5885 ms.
- Holdout drain: 2,913 prompt / 1,677 completion / 1,454 reasoning tokens (aggregate, 3 calls); model time 6,219 ms.
- Efficiency probe (none/768): 7,991 tokens / 2.394 s vs 13,398 / 22.405 s baseline (−40% tokens, −89% time), 5/5 valid.
- **Graphiti extraction inference cost: UNVERIFIED** (shared NInfer counter mixes curator + extraction + other consumers; no per-request worker identification; no wall-time gap allocated to LLM time).

## 7. Source accuracy and protocol parity

Protocol chain verified end-to-end: `source → captured event → post-exit model → approved/DEFER → verified episode → extracted graph relationship`. The single holdout EMIT is a verbatim assistant-reported extract, persisted to a real episode with a real extracted relationship, source-index verified. No-thinking (probe) vs default (holdout) comparison: the probe's 3 changed EMITs were operator-accepted as source-grounded; the holdout ran on the unchanged default policy because the provider's `enable_thinking` change made the opt-in `none/768` request conflict (HTTP 400), per the campaign's "otherwise retain the unchanged default" rule.
