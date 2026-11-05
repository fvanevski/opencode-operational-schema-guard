# Issue #81 — quality-evidence addendum (closeout v1)

Additive to the immutable `81-adjudicated-quality-v1` packet (evidence commit
`87bdc7320c2e291e55c882bef1b190b501644886`). That packet's files, labels, targets and
manifest are unchanged by this closeout (all 9 manifest SHA-256 values re-verified at exact
head `036017058a0abdbfc20dde1fd076926ce8ef6d4f`).

## 1. Corrected holdout curator token accounting

The post-exit holdout report double-counted reasoning tokens. The OpenAI-compatible usage
payload reports completion tokens **including** the reasoning subset:

| field | value |
|---|---|
| prompt tokens | 2,913 |
| completion tokens (includes reasoning) | 1,677 |
| reasoning subset (within completion) | 1,454 |
| **corrected total** | **4,590** |

The original `native-gap-analysis.md` wording (6,044) is historical evidence and remains
immutable; only the corrected 4,590 total is used in new comparisons.
`CORRECTED_HOLDOUT_CURATOR_TOKENS=4590`.

## 2. Recall failures stand

Unchanged predeclared threshold ≥0.85 candidate useful-event recall:

- development: 27/37 = 0.730 — **FAIL**
- holdout (exposed regression set, never "blind" again): 3/6 = 0.500 — **FAIL**

Durable grounded precision 9/9 (dev) and 1/1 (ho) passed, but precision does not repair
omissions. Natural fresh-client recall and installed p95 remain **UNVERIFIED** (require a
fresh-client/installed host receipt, not part of this CPU closeout).

## 3. Provenance boundaries

- Graphiti extraction-model costs remain **UNVERIFIED** without per-worker provider
  attribution (`GRAPHITI_EXTRACTION_COST=UNVERIFIED`).
- The 9-case holdout was scored pre-tuning; it is retained as a fixed
  diagnostic/regression corpus. Any post-correction replay must keep the exact pre-tuning
  result (this addendum) visible beside it.
- No labels, targets, frozen source bytes, EX admission or Graphiti history were altered.
