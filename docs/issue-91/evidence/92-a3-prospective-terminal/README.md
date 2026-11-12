# Issue #92 — Authorized prospective A3 execution · terminal evidence (evidence-only)

PRIMARY_AGENT=Hermes (build) · REPO=fvanevski/opencode-operational-schema-guard · BRANCH=work/91-memory-utility-r1
AUTHORIZATION=A3_PROSPECTIVE_APPROVED · EXECUTION_COUNT=ONE · AGENT=Hermes/Build
Source binding HEAD = `50fd675bf9d86a7505c18bbba510eae8f41544cd` (evidence-only publication)
Manifest `7b96a107…` · Label-freeze `96b9e51e…` · Group `graphiti-adr92-a3-prospective-v2`

Sanitized, evidence-only publication of the **single authorized A3 prospective inference** and its
independent fact-level adjudication. One model-call intent, one group, no replay, no PR/merge/
deploy/#92 closure.

## Result

`RESULT=A3_PROSPECTIVE_FAIL`

The single inference ran and settled (one model-call intent; rc=3 corrective path was
reconcile-only, no re-inference). The corrected fact-level scorer
(`issue92-a3-score.mjs`) independently adjudicated all 13 persisted facts:

| Gate | Measured | Requirement | Pass |
|------|----------|-------------|------|
| Valuable-target recall | **7/10** (0.70) | ≥ 9/10 | **FAIL** |
| Grounded precision | 1.00 | ≥ 0.90 | pass |
| Useful among grounded | **0.615** (8/13) | ≥ 0.75 | **FAIL** |
| Distinct useful facts | 8 | ≥ 8 | pass |
| Zero authority breaches | 0 | 0 | pass |
| Terminal source integrity | yes | yes | pass |
| Independently ratified labels | yes | yes | pass |

**Why FAIL:** valuable recall 7/10 — cases **v3-02** (b75-journal decision), **v3-05** (release
quality-gate decision) and **v3-07** (fsm81 log-rotation decision) were **not persisted** (the
treatment deferred them), so the frozen 10-target recall floor is not met. Useful-among-grounded
(0.615) is dragged below 0.75 by 5 duplicate episodes (the 8 distinct useful facts still meet the
≥8 floor). Grounded precision is perfect (1.0) and there are zero authority breaches.

Wilson 95% intervals: valuable_coverage 0.70 [0.397, 0.892]; grounded_precision 1.00
[0.772, 1.00]; useful_among_grounded 0.615 [0.355, 0.823].

## Files

| File | Purpose |
|------|---------|
| `a3-v3-scorecard.json` | Terminal `issue92-a3-adjudicated-acceptance-v1` scorecard (gates, stats, Wilson 95%). |
| `a3-v3-remote-readback.json` | Positive post-inference `get_episodes` readback: 13 episode UUIDs, source-index intact (13/13 write-outcome content-hashes present). |
| `a3-v3-fact-adjudications.json` | One independent per-fact verdict (13) keyed on ReviewStore record id: grounded/useful/duplicate_of + source case + bounded rationale. |
| `a3-v3-authority-audit.json` | EX/replay/write/privacy/group/verified + `first_model_intent_at` (after ratification) + one-immutable-intent + reconcile-only corrective path. |
| `a3-v3-scoring-addendum.json` | Frozen (pre-first-model-intent) source-supported interpretations of cases 07/09/10 (option-C decisions with named exports/state changes). |
| `a3-v3-raw-opportunity.json` | A1 raw-opportunity denominator (1,113 turns / 619 sessions) + admission rates. |
| `a3-execution-provenance.json` | Driver result: batch id, model metrics (discovery 46 / support 9 / utility 11 = 66 calls), write outcomes, source binding. |
| `a3-host-attempt-receipt.json` | Once-only marker: rc, inference_calls=1, corrective_path=reconcile-only. |

Private (0600, host-side, referenced by digest): `issue92-a3-v3-corpus.json` (manifest),
`issue92-a3-v3-ratification.json`, ReviewStore records under
`/tmp/opencode/issue92-a3/state-v3/curation-v1/graphiti-adr92-a3-prospective-v2/`.
