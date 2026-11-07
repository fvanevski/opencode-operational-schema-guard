# Issue #81 / PR #90 — baseline-retention final semantic-recall qualification (host, read-only)

CAMPAIGN=ISSUE81_PR90_BASELINE_RETENTION_VERIFICATION
REPO=fvanevski/opencode-operational-schema-guard
BRANCH=issue/81-semantic-recall
SOURCE_HEAD=6504f7ae7be9ed9256182d818d17ff7d4c6c5c73
SOURCE_TREE=d223202c8ef42438a76bf7fda4781a1f16f63c19
MAIN_CONTROL=6e5695da91974447c718e99757bc8a84d9de3e9d
PRODUCTION_GROUP=development-knowledge
RESULT=PASS_CORE (S04 regression resolved; semantic 13/16 >= 0.8 frozen target; strict unchanged; human precision pending operator; native hook p95 UNVERIFIED)

One consolidated read-only host qualification of the baseline-retention
correction (6504f7a "retain sourced strict-control fact in semantic context").
No production source/test/scorer edits, no plugin install, no Graphiti writes,
no drain invocation, no EX-gate alteration, no new PR, no merge, no issue
closure, no artificial human adjudication, no acceptance-target change.

## Contents

| File | Purpose |
|------|---------|
| `exact-source-and-tests.json` | source authentication (remote branch/PR head/tree/main-control/ancestry/detached clean worktree), 7/7 node --check, focused 65-test node --test (exit 0), exact-head CI receipt reuse (run 42424396991), frozen-roster SHA |
| `replay-matrix.json` | 20 frozen cases (16 positive + 4 negative) under strict+semantic; query/source SHA-256, per-mode count/hit/rank, miss-stage coding; strict 12/16, semantic 13/16 |
| `baseline-retention-and-safety.json` | S04 regression RESOLVED, S10 improvement RETAINED, S03/S05/S13 raw-pool gap, censoring check, negative controls, source/scope/integrity, host-mutation state |
| `timing-and-quality.json` | shadow p50/p95/max (n=20), index timings, char/count budgets, dedup, native gates UNVERIFIED |
| `precision-and-operations.json` | 0/126 operator worksheet (snapshot digest bound), PENDING_OPERATOR_REVIEW, prior CLI/portal evidence reuse |
| `command-shape-friction.json` | GHDEV-10 friction ledger |
| `SHA256-MANIFEST.txt` | packet manifest and checksums |

## Key results

- S04_REGRESSION=RESOLVED: baseline 6eae66a regressed_strict_source_cases
  ['S04']; at 6504f7a the list is [] and S04 is source-exact at rank 1 in
  both policies.
- SEMANTIC_SOURCE_EXACT=13/16 (0.8125 >= 0.8 frozen target, MET in shadow
  fingerprint replay); STRICT_SOURCE_EXACT=12/16 unchanged (no degradation;
  at-first 12/12 both modes).
- RESIDUAL_MISSES (coverage gaps, not roster tuning): S03, S05, S13 —
  expected sources absent from the 24-slot raw remote pool in both policies
  (search-recall gaps, multi-event/named-entity class). S10 improvement
  retained (semantic-only, rank 3, curated query-local index path).
- CENSORING=ABSENT: all 16 expected episode UUIDs present in the 311
  persisted curation UUIDs (513 candidate docs; 367 durable facts).
- NEGATIVES: N01 semantic 4 obs (irrelevant-context cost, unchanged),
  N02 strict 1 / semantic 3 obs (frozen label preserved), N03 0/0 (privacy
  fence PASS), N04 0/0 (short-query floor PASS).
- LATENCY (shadow Memory.search, n=20): strict p50 266.066 / p95 287.108 /
  max 287.977 ms; semantic p50 216.453 / p95 242.536 / max 887.137 ms
  (S12 cold-scan outlier).
- HUMAN_PRECISION=PENDING_OPERATOR_REVIEW 0/126 (worksheet 126 rows,
  snapshot digest c8d5053c... bound, PENDING_OPERATOR_ADJUDICATION).
- NATIVE_HOOK_P95=UNVERIFIED; ASSEMBLED_MODEL_REQUEST=UNVERIFIED until the
  authorized merged-main fresh-process stage.

Fingerprint-only shadow replay establishes review readiness for the
baseline-retention correction, not native fresh-process acceptance,
deployment, merge authorization, or closure of #81/#78.
