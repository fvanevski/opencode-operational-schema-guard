# Issue #81 — Prospective Benchmark (81-recall-remediation-v1)

A representative real-native development + **independent** blind-holdout benchmark was registered **before** result inspection (SHA pins in `corpus81-registration.json`). The prior exposed 9-case holdout (`f904411e…`) is not reused as blind.

## Registration (before inspection)

| Split | File | SHA-256 | Cases | Valuable | Group | Workspace |
|---|---|---|---|---|---|---|
| development | `corpus81-dev.json` | `d3822a30…f0cd7` | 12 | 6 | `cur81_native_a1f3c9d7` | `native-ws/fsm81` |
| independent holdout (blind) | `corpus81-holdout.json` | `2435236a…bed2a` | 5 | 4 | `cur81_native_holdout_a1f3c9` | `native-ws-holdout/fsm81` (fresh copy of the initial fixture) |

Roster controls present: long user decision, code+prose, secret-late, SELF, shell fail/fix/pass, out-of-workspace read, duplicate, chatter, historical, superseded, negative. **Source-case grain:** one native user message = one case; its 1–6 staged spans are not counted as separate useful events. Span-level source-index identity is reported separately (event IDs in `logs/three-path-prospective.json`).

## Three-path comparison — STAGED source (`7b7d626`)

Source-case confusion (valuable = truth):

| Path | TP | FP | TN | FN | Precision | Recall |
|---|---|---|---|---|---|---|
| Baseline (#75 selector) | 1 | 0 | 6 | 5 | 1.000 | 0.1667 |
| Broad capture (candidate spans) | 5 | 2 | 4 | 1 | 0.714 | **0.8333** |
| Curator (post-exit) | — | — | — | — | pending | pending |

- **Dev candidate_recall = 0.8333 < 0.85 → FAIL** (honest, not waived). Sole FN = `dev-p-codeprose` (multi-line, defect #2). FPs = `dev-p-chatter1` (session-open probe) and `dev-p-dup` (verbatim duplicate of a valuable decision).
- **Independent blind holdout counterfactual (provisional labels, not a ratifiable blind score yet):** TP=4 FP=0 TN=1 FN=0 → recall 1.000, precision 1.000. The secret control is correctly rejected (0 leakage).
- `no_privacy_wrong_group` = PASS (no privacy/wrong-group case selected).

## Three-path comparison — bounded-repair counterfactual (`scratch-evalfix`)

With the defect #1 + #2 minimal patches: dev broad capture TP=6 FP=2 TN=4 FN=0 → **recall 1.0000**, candidate_recall target **PASS**. This is the bounded proposed repair (a substantive candidate-adapter diff to Central, with focused regressions), not a silent product change.

## Historical replay (exposed regression, immutable)

Frozen dev (22ae11e6, 57 cases) and exposed holdout (f904411e, 9 cases) replayed against the staged source (`logs/historical-replay.json`):

- **Historical (immutable):** dev 27/37, holdout 3/6 (visible failures preserved).
- **New counterfactual (staged source):** dev baseline tp3/fp1/tn19/fn34 (recall 0.0811); new candidate tp29/fp6/tn14/fn8 (recall 0.7838, precision 0.8286) → dev candidate_recall target FAIL (<0.85). Holdout counterfactual tp4/fp2/tn1/fn2 (recall/precision 0.6667).
- FP/FN root causes: chatter/duplicate/assistant FPs; shell FNs lack `result` bytes in the frozen corpus (source-record limitation, not a code bug); privacy/SELF/strict-JSON-decode FNs.

## Durable-fact precision (post-exit path)

UNVERIFIED until the bounded post-exit model drain (chat-fast) + independent operator fact verdicts (operator packet 2). See `model-graphiti.md` and `quality-results.json`.
