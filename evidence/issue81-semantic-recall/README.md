# Issue #81 — semantic-first recall integration qualification packet

CAMPAIGN=ISSUE81_SEMANTIC_RECALL_INTEGRATION
REPO=fvanevski/opencode-operational-schema-guard
BRANCH=issue/81-semantic-recall
SOURCE_COMMIT=74972845dcf885e8676d5845853bc590e742f137
SOURCE_TREE=3ec1ed417cfc54fcd5373236b0163752bfb322f1
BASE_COMMIT=6e5695da91974447c718e99757bc8a84d9de3e9d

One cohesive campaign: execution, deterministic validation, host-integration
evidence, focused diagnostics, and bounded mechanical remediation of the
already-authored Issue #81 semantic-first recall candidate. No redesign, no
new model/service/reranker, no PR.

## Contents

| File | Purpose |
|------|---------|
| `source-identity.json` | exact source commit/tree/base, 8-file blob inventory, strict-relevance control blob, installed live plugin identity |
| `deterministic-validation.json` | syntax checks, focused 9-file test set (94/94), `npm run check`, `npm test` (524/524) with producer exits |
| `shadow-replay-comparison.json` | strict-vs-semantic fingerprint-only comparison for S08/S07/N01/S06/N02/N03 with shadow-replay timings |
| `host-runtime-compatibility.json` | Node/MCP/group-state/installed-plugin compatibility facts |
| `invariants-and-findings.md` | 14 integration invariants, comparison table, false-context findings, privacy/provenance, proposed repairs (none) |
| `command-shape-friction.json` | canonical GHDEV-10 friction ledger |
| `SHA256-MANIFEST.txt` | packet manifest and checksums |

## Result summary

- SOURCE_INTEGRITY=PASS (exact commit/tree, clean tree, 8/8 files, strict relevance unchanged)
- FOCUSED_TESTS=94/94 pass exit 0; ROOT_CHECK=PASS (exit 0); ROOT_TESTS=524/524 pass exit 0
- STRICT_BASELINE_PRESERVED=yes (strict default in issue-75 plugin; explicit strict control in issue-78 wrapper)
- SEMANTIC_POLICY_INTEGRATION=PASS (all 14 invariants verified in source)
- SOURCE_AND_GROUP_ISOLATION=PASS (group scoping, no cross-group/secret leak in N02/N03)
- PRIVACY_AND_PROVENANCE=PASS (fingerprint-only packet; roster body kept host-private)
- ADAPTIVE_CONTEXT_BOUNDS=PASS (maxSelected≤5, no-anchor cap=1, char budget, dedup)
- SHADOW_REPLAY: semantic recovers every strict top fact and adds bounded related observations; N01 shows one bounded false-context observation (semantic only)
- FALKORDB_TARGET_RECALL: strict=1 fact (source-correct, roster S08 source digest); semantic=4 facts (same top fact + 3 related)
- HISTORICAL_TARGET_RECALL: strict=1 fact (S06 expected source, historical/superseded label); semantic=3 facts (same top fact + 2 related)
- NEGATIVE_CONTROL_RESULT: N01 strict=0/semantic=1 (bounded); N02 no cross-group leak; N03 0/0 via privacy fence
- SHADOW_LATENCY: 148–230 ms full Memory.search wall clock (shadow class; context_wait_ms NOT_MEASURED)
- NATIVE_HOOK_P95=UNVERIFIED; LIVE_NATIVE_ACCEPTANCE=NOT_ATTEMPTED; HUMAN_PRECISION=UNVERIFIED
- UNCOMMITTED_SOURCE_CHANGES=none; no source repair proposed
