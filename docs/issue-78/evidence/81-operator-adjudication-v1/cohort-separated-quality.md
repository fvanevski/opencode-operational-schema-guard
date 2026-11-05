# Issue #81 — Cohort-separated quality report (revised, accurate denominators) (81-operator-adjudication-v1)

Reconciled from the pinned original sources (SHA-locked corpora) and the ACTUAL persisted receipt-bound facts,
with the operator's durable-usefulness adjudication applied. **Cohorts are kept separate; no cohort result is
combined to manufacture acceptance of another.** `RATIFIED_QUALITY` remains **UNVERIFIED** pending operator
sign-off (packets 1 + 2) — the numerators/denominators below are the measured values.

## 1. Cohort identities (exact, preserved in every metric)

| Cohort | Group | Project | Corpus (sha) | Persisted Graphiti facts | Drained? |
|---|---|---|---|---|---|
| Development (prospective) | `cur81_native_a1f3c9d7` | fsm81 | `corpus81-dev.json` (`d3822a30…`, 12 cases / 6 valuable) | **12** | yes (settled) |
| Independent prospective blind holdout | `cur81_native_holdout_a1f3c9` | fsm81 | `corpus81-holdout.json` (`2435236a…`, 5 cases / 4 valuable) | **0** | **no** |
| Earlier qualified `prime.js` cohort | `cur81_holdout_4c3ab514` | qualified_project | (disposable drain state) | **1** (F13) | yes (review_required) |
| Historical (immutable) | — | — | dev 27/37, exposed holdout 3/6 (frozen) | — | n/a |
| Production / prior (non-mutation) | `ghdev_gh_mcp` (4), `cur81_dev_ce555621` (9) | — | — | unchanged | n/a |

**Correction (vs `81-post-exit-terminal-v1`):** F13 belongs to the **earlier** `cur81_holdout_4c3ab514`
cohort, NOT the new prospective `cur81_native_holdout_a1f3c9` holdout. The new prospective holdout has **0**
persisted facts. F13 is **not** used to ratify the new holdout, and its historical model decision does **not**
ratify the new holdout's provisional 4/4 source-case capture recall.

## 2. Source-case recall (candidate_recall, ≥0.85 binding)

| Cohort | Value | Status |
|---|---|---|
| Historical dev (frozen, immutable) | **27/37** | unchanged |
| Exposed historical holdout (frozen, immutable) | **3/6** | unchanged |
| **Development (staged source)** | **5/6 = 0.8333** | **FAIL** (< 0.85); sole cause = `dev-p-codeprose` (multi-line native prompt) lost by staged `promptText()` = defect #2 |
| **Development (patched counterfactual, scratch-evalfix)** | **6/6 = 1.0000** | PASS **only under** the bounded repair; counterfactual until Central applies & verifies defect #2 |
| **Independent prospective blind holdout (capture)** | **4/4 = 1.0000** | **provisional** (capture metric); source-case labels **pending operator ratification** (packet 1); **not** a substitute for development recall; F13 (earlier cohort) does not ratify it |

- Post-exit model acceptance does **not** establish installed fresh-native semantic recall. `semantic_recall`
  (≥0.80) remains **UNVERIFIED_UNTIL_FRESH_CLIENT** (a separate post-merge gate on merged main).

## 3. Fact-level grounded precision (durable_grounded_precision, ≥0.90)

- **Denominator = the ACTUAL persisted, receipt-bound model facts (13), per the evaluator's existing
  definition.** The 6 durable-non-useful facts are **not** removed from this denominator.
- **Grounded (exact source): 13/13.** **Authority-correct: 13/13.** **Scope-correct: 13/13.**
- **Measured grounded precision:**
  - dev cohort: **12/12 = 1.0000**
  - earlier `prime.js` cohort: **1/1 = 1.0000** (F13, conditional)
  - combined persisted-fact (dev + earlier cohort): **13/13 = 1.0000**
  - **new prospective holdout: UNVERIFIED** (0 persisted facts; not drained)
- **≥0.90 gate: NOT declared passed.** Measured 1.0000, conditionally met, **pending** (a) operator sign-off
  on the 13 fact verdicts, (b) packet-1 source-case ratification, (c) remote receipt bindings (verified:
  12 dev + 1 earlier-cohort episode UUIDs match the live Graphiti).

## 4. Durable-usefulness metric (SEPARATE from grounded precision)

- **7/13** durable-useful (F1–F5, F11, F13-conditional), conditional on the exact-source confirmation performed.
- **6/13** durable-non-useful (F6–F10, F12) — kept in the grounded-precision denominator; they are simply not
  preferred as durable memories. This is a **distinct finding** from grounded precision, not a precision
  failure.
- Cohort split: dev 6/12 durable-useful; earlier cohort 1/1 (conditional).

## 5. Three-path comparison (staged source, dev cohort)

| Path | TP | FP | TN | FN | Precision | Recall |
|---|---|---|---|---|---|---|
| baseline | 1 | 0 | 6 | 5 | 1.0000 | 0.1667 |
| broad_capture | 5 | 2 | 4 | 1 | 0.7143 | 0.8333 |
| **curator (verified post-exit)** | 5 | 2 | 4 | 1 | 0.7143 | **0.8333** |

- The `curator` path (previously `UNVERIFIED (post-exit pending)`) is now **verified**: the curator persisted the
  5 captured valuable cases' durable facts (12 dev facts) and did **not** add the missing `dev-p-codeprose`
  (still lost to defect #2). Curator recall = broad-capture recall = 0.8333 (staged). Under the patched repair:
  6/6 = 1.0 (counterfactual).

## 6. Other targets (staged source)

- `context_p95_ms_max` (≤300): **PASS** (observed dev/holdout p95 = 2 ms).
- `post_exit_p95_seconds_max` (≤900): **PASS** (dev drain wall-clock 8 min 2 s total across three bounded
  60 s passes, within the 600 s `--max-seconds` bound).
- `zero_secret_leakage`: **PASS** (dev secret-late + holdout secret both whole-source vetoed, 0 spans; the
  holdout secret control was SKIP/DEFER, not persisted).
- `zero_wrong_group`: **PASS** (cross-scope forged group rejected; no wrong-group case selected).
- `zero_false_verified`: **PASS** (invariant probe 16/16; evidence class user-/assistant-/tool-stated, never
  independently "verified").

## 7. Model-token accounting (separate from Graphiti extraction)

- Curator model-only tokens: campaign **41777** (prompt 37744 + completion 4033); **reasoning 1454 reported
  separately** (not double-counted). Graphiti extraction cost is separately attributable to the Graphiti
  runtime and is **not** included in these totals. See `81-post-exit-terminal-v1/model-usage.md`.

## 8. Unresolved items (honest, not waived)

1. **candidate_recall (staged) = 0.8333 < 0.85 → FAIL** — met only under the bounded defect-#2 repair
   (a candidate-adapter diff awaiting Central). Not waived.
2. **Human ratification PENDING** — operator packet 1 (source-case labels) and the 13 fact verdicts
   (packet 2 / this adjudication) are not signed; `RATIFIED_QUALITY` stays UNVERIFIED.
3. **New prospective holdout durable-fact precision UNVERIFIED** (0 persisted facts; not drained).
4. **semantic_recall UNVERIFIED_UNTIL_FRESH_CLIENT** — separate post-merge gate.
5. **Defects #1 and #2** remain Central's to apply/verify (independent review, implementation, regressions,
   exact-head CI on existing PR #83). Not implemented here.
