# Issue #81 / PR #90 — curated index growth verification (host, read-only)

CAMPAIGN=ISSUE81_PR90_INDEX_GROWTH_VERIFICATION
REPO=fvanevski/opencode-operational-schema-guard
BRANCH=issue/81-semantic-recall
SOURCE_HEAD=6eae66a3f19c0af15c212e51faee4243cc656c55
SOURCE_TREE=599718095216528034261359069ad70869fcd02f
BASE_SHA=6e5695da91974447c718e99757bc8a84d9de3e9d
INDEX_FIX_SOURCE_COMMIT=defb9da668cae03dcdbaa9255b7ed5cfdf296fd2
PRODUCTION_GROUP=development-knowledge
RESULT=PARTIAL (source-correct growth proven; recall 12/16 < 13/16 target; human precision pending operator)

One cohesive read-only host verification of the Central-staged indexed-recall
correction (defb9da) against the live 299->304->509 eligible-episode inventory.
No source/test changes, no new PR, no production install, no Graphiti mutation,
no extraction-worker invocation, no EX-gate change, no corpus rewrite, no merge
or issue closure.

## Contents

| File | Purpose |
|------|---------|
| `exact-source-and-tests.json` | exact source commit/tree/base, fix ancestry, exact-head CI, syntax checks, focused 62-test node --test (exit 0), frozen-roster SHA, operator-batch identity |
| `replay-matrix.json` | 20 frozen cases (16 positive + 4 negative); query/source SHA-256, per-mode count/hit/rank, per-miss stage; strict 12/16, semantic 12/16 |
| `index-growth-and-safety.json` | growth-boundary proof (query-scoped candidates positive, fresh remote get_episodes membership, out-of-scope/malformed controls), live-host provenance |
| `timing-and-quality.json` | shadow p50/p95/max (n=20), N01/N02 irrelevant-context cost, N03/N04 0/0, 0/126 operator batch, native-hook p95 UNVERIFIED |
| `command-shape-friction.json` | canonical GHDEV-10 friction ledger |
| `SHA256-MANIFEST.txt` | packet manifest and checksums |

## Key results

- GROWTH_BOUNDARY=PASS: query-scoped curatedRecallCandidates returns positive
  source-verified candidates (not []) for the >288/>500 inventory in both policies.
- FOCUSED_TESTS=62/62 pass exit 0; EXACT_HEAD_CI=success (run 42421882693: check+test).
- STRICT_SOURCE_EXACT=12/16 (miss S03, S05, S13); SEMANTIC_SOURCE_EXACT=12/16
  (miss S03, S04, S05, S13). One strict->semantic regression (S04).
- RECOVERED vs prior 10/16: S07 (both modes) and S10 (semantic) now hit.
- REMAINING_MISSES (coverage gaps, not roster tuning): S03 index-shortlist
  truncation (both); S05 strict-shortlist/semantic-final-rank; S13
  strict-shortlist/semantic-final-rank; S04 semantic final-rank regression.
- NEGATIVES: N01 semantic 4 same-group obs, N02 strict 1/semantic 3 same-group obs
  (irrelevant-context cost, no cross-group/secret leak); N03/N04 = 0/0.
- HUMAN_PRECISION=PENDING_OPERATOR_REVIEW 0/126 (worksheet 9f9152cc...,
  PENDING_OPERATOR_ADJUDICATION, snapshot bound c8d5053c...).
- NATIVE_HOOK_P95=UNVERIFIED; PRODUCTION_MUTATIONS=none (live post-exit-drain
  host process grew the inventory, not this campaign).

Source-correct evidence establishes review readiness only, not native
fresh-process acceptance, installation, merge authorization, or closure of #81/#78.
