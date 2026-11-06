# Issue #81 Retrieval-Recovery Feasibility — v1 (ISSUE81_RETRIEVAL_RECOVERY_FEASIBILITY_V1)

Evidence-only campaign of the Central-authored read-only retrieval-feasibility
probe (`docs/issue-78/v2-benchmark/issue81-retrieval-feasibility.mjs`, blob
`5ca8fd0980c6721eeb37787848eef388210977e2`) at implementation head
`4060fa9403d3cb72fb4e7490a159d1564032cab5` (branch
`issue/81-source-recall-correction`, PR #89 draft). Adds one sanitized
evidence-only commit to `issue/81-recall-acceptance`
(parent head `def2be8f97463b0f6d1098286c4a2559032ebd85`).

No production install/config/runtime change, no Graphiti add/delete/retry,
no group migration, no curation reset, no GPU inference, no full native
20-case acceptance, no impl-branch push, no new PR, no merge, no issue
closure.

## Method

- **Frozen roster**: `semantic-recall-roster.json`
  (SHA256 `47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652`),
  16 positives + N01-N04 negatives. New 0600 private adapter
  (SHA256 `33912564b88de00e5b05078eea5bd1fa7ba80885d7db25a63b5db3985997ccd1`)
  projects S01/S03/S04/S05/S07/S10/S13 + N01-N04 in roster order; raw prompts
  stay on host.
- **Curator root**: `/home/filip/.local/state/ghdev-graphiti`, authenticated
  from the live plugin config (`stateDir`) matching group
  `development-knowledge`, workspace `/workspace/mcp_servers/gh_mcp`, project
  `gh_mcp`, endpoint `http://127.0.0.1:8766/mcp`. 274 review records scanned
  (bound 500), 165 episode anchors verified (bound 288).
- **One bounded read-only probe run** (rc=0, 18 Graphiti requests: 9×d24 +
  9×d12, 40 private stdout bytes-class JSON retained on host):
  - Graphiti full query depth 24, reduced derived query depth 12, both behind
    the native `safeText` privacy/length fence.
  - N03/N04: `NATIVE_SAFE_TEXT_REJECTED`, zero Graphiti calls, zero local
    selections.
  - Read-only local route: persisted curated records mapped through the
    existing positive persisted source-index resolver (`native-id` source
    strength), with bounded hypothetical union/blended selectors.
- Local curated-index evidence is **not** independent proof of current remote
  Graphiti persistence; Graphiti d24/d12 results are the remote-side evidence.

## Headline findings

- All five missing expected episodes (S03/S05/S07/S10/S13) **are present and
  resolver-verified in the persisted curated source index**; Graphiti
  `search_memory_facts` surfaces none of them at depth 12 or 24. The gap is
  Graphiti fact-search ranking/coverage plus the lexical eligibility gate —
  not curation-store coverage, and not the candidate cap.
- **Index route: exact recovery 1/5** (S07 via `local_only` and `blended`);
  S10 eligible-but-tie-broken; S03/S05/S13 fail the lexical eligibility gate.
  **Reduced d12 query: 0/5.** Union: 0 exact. Blended: 1 exact.
- S01/S04 selector misses persist (competing / proposition-equivalent
  siblings win the single-selection tie-break in all four selectors).
- Negatives: N01 no injection; N02 `FAIL_INJECTED` preserved (same-group
  content-policy miss); N03/N04 fenced with zero Graphiti calls. No group
  violations, private leaks, or false admissions elsewhere.
- Latency: Graphiti d24 p50/p95 = 144.4/293.0 ms (n=9), d12 = 83.9/92.5 ms
  (n=9), nearest-rank quantiles; curated scan 51.2 ms (n=1). Hook p95
  **UNVERIFIED**.
- `HUMAN_PRECISION=UNVERIFIED` (126-fact operator review outstanding). Prior
  8/16 and 9/16 results remain immutable; this probe is not a 13/16 native
  PASS.

## Files

| File | Content |
| --- | --- |
| `recovery-matrix.json` | Per-case recovery matrix: d24/d12 presence, local-index stage (index presence, resolver mapping, source strength, eligibility, top-8 rank), four-selector outcomes, classifications, negative fences, totals. |
| `latency-and-source-authority.json` | p50/p95 latency (n + quantile definition), hook status, and the source-authority verdict (local index vs remote persistence). |
| `central-recommendation.md` | Decision-quality summary and recommendation input for Central (do-not-merge, index-injection authority, quantified levers). |
| `command-shape-friction.json` | Command-shape friction ledger (3 agent-authored discovery/syntax events; 0 guard rejections; handoff command shape matched). |
| `SHA256-MANIFEST.txt` | SHA-256 manifest over all published files in this directory (excluding the manifest itself). |

## Sanitization

No raw frozen prompts, full fact/assertion text, operator worksheet, or
credentials are included. Episode UUIDs, record IDs, source-reference
identifiers, counts, latencies and booleans are published; raw prompt/fact
traces remain on host (private adapter and probe stdout, 0600).
