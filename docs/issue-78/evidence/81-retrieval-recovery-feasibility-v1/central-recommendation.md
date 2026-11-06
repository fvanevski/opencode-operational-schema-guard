# Issue #81 Retrieval-Recovery Feasibility — Central Recommendation Input

CAMPAIGN=ISSUE81_RETRIEVAL_RECOVERY_FEASIBILITY_V1
IMPLEMENTATION_HEAD=4060fa9403d3cb72fb4e7490a159d1564032cab5
EVIDENCE_CLASS=CURRENT_SNAPSHOT_DIAGNOSTIC_NOT_NATIVE_ACCEPTANCE

## What the probe established (one bounded read-only run, 18 Graphiti requests)

1. **The five "missing" expected episodes (S03, S05, S07, S10, S13) are all
   present in the persisted curated source index.** Every one is a persisted,
   in-scope (development-knowledge / gh_mcp / /workspace/mcp_servers/gh_mcp)
   review record with exactly one fact, resolver-mapped through the existing
   positive persisted source-index resolver with `native-id` source strength.
   The misses are therefore **not a curation-store coverage gap**.
2. **Graphiti `search_memory_facts` surfaces none of the five at depth 12 or
   24** (reproducing the prior 12-vs-24 finding). The binding constraint is
   Graphiti fact-search ranking/coverage, not the candidate cap. **Raising the
   cap further remains an unaccepted remedy.**
3. **The reduced d12 derived query recovered 0 of the 5** (all five absent at
   both depths). A second generic query to the same fact search does not close
   the gap.
4. **The read-only index route recovers exactly 1 of 5** (S07, rank 1 in the
   authenticated local index, selected exactly by both `local_only` and
   `blended`). S10 is eligible at rank 2 but loses the `maxSelected=1`
   tie-break; S03/S05/S13 are resolver-verified in the index but fail the
   lexical relevance-signal eligibility gate for their frozen queries
   (overlap count 2, named-term/number gates), so no selector admits them.
5. **Selector misses S01/S04 persist**: expected episodes are present in the
   d24 candidates and the local index, but competing / proposition-equivalent
   sibling episodes win the single-selection tie-break in all four selector
   alternatives.
6. **Negative fences held**: N01 zero selections (no injection); N02
   `FAIL_INJECTED` preserved verbatim (same-group content-policy miss, original
   score unchanged); N03/N04 rejected by native `safeText` admission with
   **zero** Graphiti calls and zero local selections (private markers /
   short-prompt fence). No group violations, no private-material leaks, no
   false admissions on the other negatives.
7. **Latency**: Graphiti d24 p50/p95 = 144.4/293.0 ms (n=9, nearest-rank; first
   call includes MCP session init), d12 p50/p95 = 83.9/92.5 ms (n=9); curated
   index scan 51.2 ms (n=1). **Context-hook p95 = UNVERIFIED** (no native hook
   start/end data).

## Recommendation to Central

- **Do not merge PR #89 on this evidence.** The 9/16 offline diagnostic and
  the probe both show the five residual misses are untouched by the staged
  correction; the prior 8/16 and 9/16 results remain immutable.
- **Source-index injection is an architectural choice for Central.** The probe
  demonstrates exact index recovery is feasible for at least one residual case
  (S07) and that all five episodes are resolver-verified local sources, but a
  product-level design must jointly establish source strength, positive remote
  persisted evidence, live scope, temporal validity and latency before index
  injection is recommended. This probe does not create that authority.
- **Two follow-on levers are now quantified for Central's design**:
  (a) Graphiti fact-search ranking/coverage for the five episodes (semantic
  side), and (b) the lexical eligibility gate plus the single-selection
  tie-break (selector side, S01/S03/S04/S05/S10/S13).
- **HUMAN_PRECISION remains UNVERIFIED** (126-fact operator review outstanding).

The probe outcome is a current-snapshot diagnostic; it must not be read as a
13/16 native PASS or any native acceptance result.
