# Issue #81 / PR #90 — semantic-recall quality follow-up (evidence-only)

Consolidated host qualification and evidence-publication campaign
`ISSUE81_PR90_SOURCE_EXACT_QUALITY` for the Central-authored semantic-first
recall candidate on draft PR #90 (`issue/81-semantic-recall`), executed at
exact source commit `f9b2f7b1f0a3509b4b04bbed0335b06691e28a26`
(tree `1fb4ba5fd22853c0da331f14d9057c99049ce5ca`).

Controlling contract:
`docs/issue-78/v2-benchmark/ISSUE81_PR90_QUALITY_HANDOFF.md`.

## Contents

| file | content |
|---|---|
| `source-and-tests.json` | Source/tree/CI authentication, `node --check` x5, focused 5-file test run (48/48, exit 0), strict-control blob identity, source review matrix |
| `paired-source-scorecard.json` | Fingerprint-only paired strict/semantic source-exact scorecard (Central scorer, unmodified): 20 cases (16 positive / 4 negative), digests and case IDs only |
| `relevance-loss-stage.json` | Coded stage attribution for the six positive misses and the four negative controls (no raw facts/prompts) |
| `precision-and-operations.json` | Human-precision status (`PENDING_OPERATOR_REVIEW`, 0/126 adjudicated), curator CLI read-only smoke, portal smoke status, live-install unchanged proof, mutation ledger |
| `command-shape-friction.json` | Canonical GHDEV-10 command-shape friction ledger |

## Key results (faithful, not relabeled)

- `STRICT_SOURCE_EXACT = 10/16`, `SEMANTIC_SOURCE_EXACT = 10/16`,
  `REGRESSIONS = none` (no strict→semantic source-exact regression).
- Six positive misses attributed to live host state: the curated index
  inventory (299 eligible episodes) exceeded the unmodified 288-episode
  inventory cap, so the index contributed zero rows to all 20 queries;
  five misses (S03, S05, S07, S10, S13) are index-only losses at that
  inventory stage, and S04 is a final-selection ranking loss. No source
  drift: live source refs are byte-identical to the frozen expectations.
- Negative controls: N03 (privacy) and N04 (length) held in both modes;
  N01 cost = 1 same-group semantic injection; N02 preserved as a known
  same-group content-policy negative (not a cross-group leak).
- Shadow `Memory.search` latency (not the native hook): strict
  p50 196.699 / p95 218.006 / max 427.090 ms; semantic
  p50 165.054 / p95 192.475 / max 469.057 ms. `NATIVE_HOOK_P95=UNVERIFIED`.
- Human precision: 126-fact operator batch packet prepared and
  `PENDING_OPERATOR_REVIEW`; no agent-signed verdicts; the
  `>=0.90` target is not accepted absent operator-signed evidence.
- No Graphiti, curation, journal, service, plugin, config, or EX-gate
  mutation; live install unchanged (installed plugin equals base-state
  blob; the candidate `semantic-recall.mjs` is not installed).

## Privacy

Raw private questions, facts, episode UUIDs, operator worksheets,
adjudications and credentials remain host-private (0600) under the
campaign root; this packet publishes digests, case IDs, coded stages,
counts and statuses only.
