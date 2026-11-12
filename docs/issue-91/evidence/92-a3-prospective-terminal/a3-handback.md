# Issue #92 — Authorized prospective A3 execution · terminal handback

`RESULT=A3_PROSPECTIVE_FAIL`

## Single authorized execution (one model-call intent)
- `A3_HOST_APPROVED=1 python3 /tmp/opencode/issue92-a3/a3-host-ex-launcher.py` under the canonical
  EX bridge (`004188b1…`, Hermes-exempt, EX flock + harness-exit + scheduler-idle + quiet-grace +
  no-unresolved admission proven). Driver bound to source head `50fd675` (7 execution-source blobs
  verified committed == on-disk == provenance).
- First launch fail-closed on scheduler busy (no inference). Re-run idle → admitted → **one**
  inference (inference_calls=1). rc=3 corrective path was **reconcile-only** (no re-inference) and
  settled: 13 writes queued by the driver, committed by the reconcile.
- **Zero-replay / once-only**: `.a3-host-ran` marker written after the single settled run.

## Positive UUID / source-index reconciliation
- 13 episodes in `graphiti-adr92-a3-prospective-v2`; each named `curated-v1:<write-outcome
  content-hash>`; all 13 write-outcome content-hashes present → **source index intact**.

## Independent fact-level adjudication (corrected `issue92-a3-score.mjs` only)
- 13 persisted facts adjudicated from the original authenticated native source (grounded, useful,
  duplicate_of, per-fact). 8 distinct useful facts (5 duplicates). A1 raw-opportunity denominator
  = 1,113 genuinely-new native turns / 619 sessions.

## Terminal scorecard

| Gate | Measured | Requirement | Pass |
|------|----------|-------------|------|
| Valuable-target recall | **7/10 (0.70)** | ≥ 9/10 | **FAIL** |
| Grounded precision | 1.00 | ≥ 0.90 | pass |
| Useful among grounded | **0.615 (8/13)** | ≥ 0.75 | **FAIL** |
| Distinct useful facts | 8 | ≥ 8 | pass |
| Zero authority breaches | 0 | 0 | pass |
| Terminal source integrity / ratified labels | yes | yes | pass |

Wilson 95%: recall 0.70 [0.397, 0.892]; precision 1.00 [0.772, 1.00]; useful 0.615 [0.355, 0.823].

## Why FAIL (exact)
- **Recall 7/10**: valuable cases **v3-02** (b75-journal decision), **v3-05** (release
  quality-gate decision), **v3-07** (fsm81 log-rotation decision) were **deferred, not persisted**
  → the frozen 10-target recall floor (9/10) is not met.
- **Useful-among-grounded 0.615**: 5 duplicate episodes (FFmpeg ×3, Issue-75 ×2, fsm81-terminal ×2,
  fsm81-export ×2, fsm81-pure ×2) drag the useful ratio below 0.75, even though 8 distinct useful
  facts meet the ≥8 floor.
- Grounded precision (1.0), zero authority breaches, source integrity, and label ratification all
  pass.

## Execution / evidence SHAs
- Driver result (execution provenance): `a3-execution-provenance.json`
  (batch_id `226621f63a7a6691d8408288b0d00714f14b7969a28a05931006c30107c2893d`; 66 model calls:
  discovery 46 / support 9 / utility 11; source binding `50fd675`).
- Scorecard: `a3-v3-scorecard.json` (persisted 0600 at `state-v3/a3-v2-adjudicated-scorecard.json`).
- Manifest `7b96a107…` · Label-freeze `96b9e51e…` (unchanged, pre-inference).

## Disposition
The single authorized A3 prospective inference is executed and terminally adjudicated. The cohort
**does not meet** the unchanged prospective acceptance criteria (recall 7/10 < 9/10; useful-among-
grounded 0.615 < 0.75), so it is **A3_PROSPECTIVE_FAIL**. No cohort replacement, label
regeneration, group clearing, or ambiguous model/Graphiti operation was performed. No PR/merge/
deploy/#92 closure. Central conducts the exact-head acceptance review against these criteria; the
evidence is evidence-only on the existing branch.
