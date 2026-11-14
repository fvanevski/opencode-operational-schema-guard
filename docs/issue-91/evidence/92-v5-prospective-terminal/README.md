# Issue #92 — Final v5 prospective qualification (terminal, sanitized evidence)

Branch `work/91-memory-utility-r1` | PRIMARY_AGENT=Hermes/Build | CPU_ONLY
AUTHORIZATION=A3_V5_PROSPECTIVE_APPROVED | EXECUTION_COUNT=ONE

## RESULT = **A3_V5_PROSPECTIVE_FAIL**

The authorized single prospective run executed exactly once (1 immutable model-call intent,
settle-via-reconcile-only, no re-inference) and persisted **7 clean, grounded, valuable-target
facts with 0 authority breaches and 0 duplicates**. It does **not** meet the unchanged
acceptance gates because the finite-batch approved only 7 of 15 candidates: valuable-target
recall is 7/10 (below the ≥9/10 gate) and independently-useful persisted facts are 7 (below the
≥8 gate). This is a faithful terminal FAIL, not a setup/admission fault.

### Execution-source and evidence SHAs
- **Execution-source head (bound, unchanged):** `5d8fdcf3aea63193a8b5b8f88148848944987c0d`
  (8/8 execution-source blobs + bridge `004188b1` verified on-disk == committed at 5d8fdcf).
- **Evidence base HEAD (VERIFIED_HEAD):** `c3742a8d52d56ee3466a445abe0edeafbdb7c927`
- **Immutable batch ID:** `bcd5f003c912302c4644aca681b15313d6b459b46fc4bc02c04c227b7f424ed5`
- **Snapshot SHA-256:** `827979dd879c943c03d49e2d9191a80b1a07ede9d2279132354ef7705ec3dbad`
- Frozen v2 manifest `56f1dacc…`, label freeze `85b30fbd…` (unchanged from the correction commit).

### Model-call counts by stage (76 total, 0 errors)
| stage | calls |
|---|---|
| discovery | 49 |
| support | 11 |
| utility | 13 |
| specificity | 1 |
| arbitration | 2 |
| **total** | **76** |

Candidates 15 → approved 7 → deferred 8. `inference_calls=1`; corrective path = reconcile-only.

### Terminal ReviewStore + Graphiti reconciliation
- 22 curation-v1 records: 7 `persisted`, 9 `deferred`, 6 `skipped` (all terminal, correct group).
- 7 persisted facts → 7 positive Graphiti v4 UUIDs in `graphiti-adr92-a3-prospective-v5`
  (readback `get_episodes` = 7 episodes; each `curated-v1:<write_outcome>` maps to a live episode).
  - `3cebcf20-…` (v-09 FFmpeg nv-codec-headers), `83ad1352-…` (v-07 litellm proxy 8008→8002),
    `b6ceb00c-…` (v-03 OPENVIKING_ROOT_API_KEY no-revert), `e45e89de-…` (v-02 opencode.json modular),
    `147cfb87-…` (v-01 SEARXNG_URL ~/.zsecrets), `b99c49a1-…` (v-06 rtk proxy),
    `f6389714-…` (v-08 openviking cli.env key removal).

### Independent fact judgments (7/7)
All 7: grounded=true, useful=true, evidence_class=user-stated, temporal=observed, privacy_ok,
authority_ok, correct_group, no_false_verified, duplicate_of=null. Each maps to exactly one
valuable target (its native source case). 0 nonvaluable/control facts persisted.

### Target-level coverage
Covered valuable targets: **v-01, v-02, v-03, v-06, v-07, v-08, v-09 (7/10)**.
Not covered: **v-04, v-05, v-10** (their candidates were deferred, not persisted).

### Acceptance gates (scorer `issue92-a3-score.mjs`, rc=3 → not pass)
| Metric | Value | Gate | Pass |
|---|---|---|---|
| Valuable-target recall | 7/10 (0.70) | ≥0.85 (≥9/10) | **FAIL** |
| Grounded precision | 7/7 (1.00) | ≥0.90 | pass |
| Useful among grounded | 7/7 (1.00) | ≥0.75 **and** ≥8 useful | **FAIL** (7 < 8) |
| Authority/privacy/EX/wrong-group breaches | 0 | 0 | pass |
| Terminal source integrity | — | — | pass |
| Independently ratified labels | — | — | pass |

### Wilson 95% intervals
- valuable_coverage: point 0.700, [0.397, 0.892], n=10
- grounded_precision: point 1.000, [0.646, 1.000], n=7
- useful_among_grounded: point 1.000, [0.646, 1.000], n=7

### Substantive GHDEV-10 friction
The only friction is **recall, not precision**: the v5 finite-batch deferred 8 of 15 candidates
(including 3 valuable targets v-04/v-05/v-10), so 7 persisted facts cannot reach the ≥9/10 recall
or ≥8 independent-useful thresholds. No privacy, EX, wrong-group, false-verified, duplicate, or
terminal-integrity breach. Historical manifests, markers, source groups, and this scorecard are
preserved.

### Invariants honored
No PR, merge, production activation, or Issue #92 closure. No additional exploratory runs.
Source/tests/EX architecture/labels/cohort unchanged. Single evidence-only terminal commit.
