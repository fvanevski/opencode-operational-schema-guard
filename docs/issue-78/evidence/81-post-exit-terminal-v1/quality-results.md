# Issue #81 — Measured quality results (81-post-exit-terminal-v1)

Reconciled from the pinned original sources (SHA-locked corpora) and the actual persisted facts.
**Pending operator ratification** — the numerators/denominators below are the measured values; the final
`RATIFIED_QUALITY` is UNVERIFIED until the operator signs packets 1 and 2.

## Source-case recall (candidate_recall, ≥0.85)

| Split | Value | Status |
|---|---|---|
| Historical original dev (frozen, immutable) | **27/37** | unchanged |
| Exposed historical holdout (frozen, immutable) | **3/6** | unchanged |
| Prospective **staged** development | **5/6 = 0.8333** | **FAIL** (< 0.85); sole cause = `dev-p-codeprose` (multi-line native prompt) lost by staged `promptText()` = defect #2 |
| **Patched** development (counterfactual, scratch-evalfix) | **6/6 = 1.0000** | PASS **only under** the bounded repair; counterfactual until Central applies & verifies defect #2 |
| Prospective **independent blind holdout** | **4/4 = 1.0000** | **provisional** until operator adjudication; **not** a substitute for development recall |

- Denominators (SHA-pinned): dev 12 cases / 6 valuable (`d3822a30…`); independent holdout 5 cases / 4 valuable,
  blind (`2435236a…`).
- **Post-exit model acceptance does NOT establish installed fresh-native semantic recall.**
  `semantic_recall` (≥0.80) remains `UNVERIFIED_UNTIL_FRESH_CLIENT` (a separate post-merge gate on merged main).

## Fact-level grounded precision (durable_grounded_precision, ≥0.90)

- **13 persisted durable facts** (12 dev + 1 holdout). All 13 are **grounded** in their cited native sources
  (13/13) and **scope-correct** (13/13). No leakage, no wrong-group, no false-verified (evidence class is
  user-/assistant-/tool-stated, never independently "verified").
- If the operator EMITs all 13: **13/13 = 1.0000** (≥0.90 PASS).
- If the operator DEFERs the transient test outcomes (F6–F10) and F12: durable set = 7 facts, **7/7 = 1.0000**.
- **Either way the ≥0.90 target is met, pending the operator's actual signatures.** (Was UNVERIFIED pre-drain;
  now computable from the terminal readback.)

## Three-path comparison (staged source)

| Path | TP | FP | TN | FN | Precision | Recall |
|---|---|---|---|---|---|---|
| baseline | 1 | 0 | 6 | 5 | 1.0000 | 0.1667 |
| broad_capture | 5 | 2 | 4 | 1 | 0.7143 | 0.8333 |
| **curator (NOW verified post-exit)** | 5 | 2 | 4 | 1 | 0.7143 | **0.8333** |

- The `curator` path was `UNVERIFIED (post-exit pending)` in the pre-drain snapshot; the terminal drain
  **verified** it: the curator persisted all 5 captured valuable cases' durable facts (12 dev facts) and did
  **not** add the missing `dev-p-codeprose` (still lost to defect #2). So curator recall = broad_capture recall
  = 0.8333 (staged). Under the patched repair it is 6/6 = 1.0.
- **Patched three-path (counterfactual):** broad_capture TP 6 / FP 2 / TN 4 / FN 0 → recall 1.0, precision 0.75.

## Other targets (staged source)

- `context_p95_ms_max` (≤300): **PASS** (observed dev/holdout p95 = 2 ms).
- `post_exit_p95_seconds_max` (≤900): **PASS** — the dev drain wall-clock was 8 min 2 s total (three bounded
  passes: 60 s + 60 s + ~53 s), well under 900 s per the 600 s `--max-seconds` bound.
- `zero_secret_leakage`: **PASS** (secret-late dev + secret holdout both whole-source vetoed, 0 spans; the
  holdout secret control `ho-p-secret` was SKIP/DEFER, not persisted).
- `zero_wrong_group`: **PASS** (cross-scope forged group rejected; no wrong-group case selected).
- `zero_false_verified`: **PASS** (invariant probe 16/16; evidence class never "verified").

## Model-token accounting (separate from Graphiti extraction)

- Curator model-only tokens: campaign **41777** (prompt 37744 + completion 4033), **reasoning 1454 reported
  separately** (not double-counted). Graphiti extraction cost is separately attributable to the Graphiti
  runtime and is **not** included in these totals. See `model-usage.md`.

## Unresolved items (honest, not waived)

1. **candidate_recall (staged) = 0.8333 < 0.85 → FAIL** — met only under the bounded defect-#2 repair (a
   candidate-adapter diff awaiting Central). Not waived.
2. **Human ratification PENDING** — operator packets 1 and 2 are READY_FOR_OPERATOR_REVIEW; no AI-invented verdicts.
3. **semantic_recall UNVERIFIED_UNTIL_FRESH_CLIENT** — separate post-merge gate.
4. **Defects #1 and #2** are Central's to apply/verify (independent review, implementation, regressions, and
   exact-head CI on existing PR #83). Not implemented in this evidence-only campaign.
