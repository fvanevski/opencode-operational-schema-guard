# Issue #92 — V6 final prospective qualification (terminal, sanitized evidence)

Branch `work/91-memory-utility-r1` | PRIMARY_AGENT=Hermes/Build | CPU→GPU exposed run
AUTHORIZATION=A3_V6_PROSPECTIVE_APPROVED | EXECUTION_COUNT=ONE

## RESULT = **A3_V6_PROSPECTIVE_FAIL**

The authorized single v6 prospective run executed exactly once (one immutable model-call intent,
batch `17a72b92`, settled by reconcile-only, no re-inference) and persisted **3 clean, grounded,
valuable-target facts with 0 authority breaches, 0 duplicates, and 0 nonvaluable (control)
pollution**. It does **not** meet the unchanged gates because the finite-batch approved only 3 of
22 candidates: valuable-target recall is 3/10 (below the ≥9/10 gate) and independently-useful
persisted facts are 3 (below the ≥8 gate). Faithful terminal FAIL, recall-bound — not a
precision/admission/integrity fault.

### Source / evidence SHAs
- **VERIFIED_HEAD:** `3f84834ad9b045e1f83253ad3823d6c860b2ff61`
- **Treatment source (bound):** `cc6461de40cb63ce536ec88fbf00fe2744c93a55` (8/8 blobs + bridge `004188b1`)
- **Frozen corpus:** `70f02cefdb0cfeb92340a17a1b63203cb894b4645132e5796c29d4a9e5f3b715`
- **Frozen label:** `ceebf3f2fbde21cc1c601d997b5736bed9f2e88144da4c13f46aeced7711eecd`
- **Immutable batch ID:** `17a72b9223e9ee765aa6a83208480ca8aa02ad595666d2b57183a86dee1cc749`

### Model-call counts by stage (84 total, 0 errors)
discovery **54** · utility **20** · support **10**. Candidates 22 → approved 3 → deferred 19.
`inference_calls=1`; corrective path = reconcile-only (driver rc=3 → reconcile 3→0).

### Terminal ReviewStore → Graphiti UUID reconciliation
22 curation-v1 records: 3 `persisted`, 19 `deferred`, 0 `skipped`. 3 persisted facts →
**3 positive Graphiti v4 UUIDs** reconciled in `graphiti-adr92-a3-prospective-v6`:
- `61991ec8-…` (v-01 TBA-titled imports)
- `b20cfe84-…` (v-02 opencode plugin `@opencode-ai/plugin`)
- `651447b9-…` (v-06 fsm81 pilot `states.json` design history)

### Independent fact judgments (3/3)
All 3: grounded=true, useful=true, evidence_class=user-stated, temporal=observed, privacy/authority/
correct-group/no-false-verified all true, duplicate_of=null. Each maps to exactly one valuable target.
**0 nonvaluable/control facts persisted (no pollution); 0 duplicates.**

### Target-level coverage + negative controls
Covered valuable targets: **v-01, v-02, v-06 (3/10)**. Not covered: v-03..v-05, v-07..v-10
(deferred). All 10 controls correctly produced **0 persisted facts** (negative-control outcome clean).

### Acceptance gates (scorer `issue92-a3-score.mjs`, rc=3 → not pass)
| Metric | Value | Gate | Pass |
|---|---|---|---|
| Valuable-target recall | 3/10 (0.30) | ≥0.85 | **FAIL** |
| Grounded precision | 3/3 (1.00) | ≥0.90 | pass |
| Useful among grounded | 3/3 (1.00) | ≥0.75 **and** ≥8 useful | **FAIL** (3 < 8) |
| Authority/privacy/EX/wrong-group breaches | 0 | 0 | pass |
| Terminal source integrity | — | — | pass |
| Independently ratified labels | — | — | pass |

### Wilson 95% intervals
- valuable_coverage: 0.300 [0.108, 0.603] n=10
- grounded_precision: 1.000 [0.438, 1.000] n=3
- useful_among_grounded: 1.000 [0.438, 1.000] n=3

### Substantive friction
Pure **recall shortfall**: the v6 finite-batch deferred 19 of 22 candidates (all 7 remaining valuable
targets + controls), so 3 persisted facts cannot reach ≥9/10 recall or ≥8 independent useful. The
persisted set is high-precision (3/3 grounded+useful+valuable, zero breaches, zero control pollution).
The recall lever is candidate-approval coverage (persisting ≥9 valuable-target facts), which is a
source/finite-batch tuning decision for Central, not a source/EX/label defect.

### Execution note (disclosed)
The prepared launcher initially failed at rc=1 due to a host-bound driver-path typo
(`v6-prospective-driver.mjs` vs the actual `a3-v6-prospective-driver.mjs`), **before any inference**.
The one inference (batch `17a72b92`) ran the exact v6 driver + EX bridge + v6 state + frozen treatment
and was settled via reconcile-only (no re-inference); the launcher path is corrected. One inference,
honored.

### Invariants honored
No PR, merge, production activation, or Issue #92 closure. Historical S1–S6, v3, v4, v5 and
exposed-run records/groups preserved. Single sanitized evidence-only commit.
