# Proposed Correction Contract — Issue #81 (scoring-policy only; optional)

**Status:** OPTIONAL. The evidence does **not** demonstrate that production
retrieval code needs correction. The seven wrong-source cases are dominated by
ordinary semantically-related recall, surfaced as failures by the **exact-source
scoring strictness**. This contract records the smallest *candidate* correction
(scoring-policy) and its reproducer/regression assertions for Central to
adjudicate. It is **not** a required production change and does not alter the
frozen 8/16.

## 1. What is (and is not) a demonstrated defect

- **Demonstrated:** the frozen evaluator scores a positive case PASS only when
  the injected source `source_ref` (episode) **exactly** equals the roster's
  `expected_source_ref`. A topically-related, verified, same-group source that
  supports a *nearby* proposition is scored `INJECTED_WRONG_SOURCE`.
- **Not demonstrated:** a provenance-binding bug in the retrieval path.
  `memory-core.mjs:366` (`ids.slice(0,12).map(byRemote.get).find(Boolean)`)
  correctly selects a resolvable source for the fact it is given; the topical
  offset originates in `search_memory_facts` returning a related (not exact)
  fact, which is expected semantic-search behavior.

## 2. Smallest candidate correction (scoring policy)

Relax the positive-case gate from "exact `source_ref` equality" to:
> PASS if the injected source is a **verified, same-group
> (`development-knowledge`)** source whose grounded proposition is **topically
> equivalent** to the expected proposition (operator-adjudicated equivalence),
> **or** exact `source_ref` equality.

This is a **scoring-policy** change in the frozen evaluator, not a change to
`Memory.search`, `sourcedEpisodeResolver`, `relevanceFilter`, the 300 ms guard,
or the group/scope filters.

## 3. Minimal root-cause reproducer

Given the merged source and the private curation store:

1. Pick a frozen prompt whose expected fact is persisted fact X (episode `E_x`).
2. Run the recall path; `search_memory_facts` returns related fact Y (episode
   `E_y`), and `memory-core.mjs:366` selects Y's source.
3. Exact-source gate: injected `E_y` != expected `E_x` ⇒ `INJECTED_WRONG_SOURCE`.
4. Lenient gate: if Y's grounded proposition is operator-adjudicated
   topically-equivalent to X's, ⇒ PASS.

Concrete instance from this audit: **S04** (injected `07f247f9…` "35 nodes /
per-group" vs expected `c48cd614…` "FalkorDB layout is per-group graphs") and
**S05** (injected `c48cd614…` "per-group graphs" vs expected `1a20d974…`
"development-knowledge has 353 nodes") — S05's *injected* source is S04's
*expected* source, showing the related-topology cluster the exact gate treats
as failures.

## 4. Proposed regression assertions (for Central)

- **R1 (preserve):** a case whose injected source == expected source still
  PASSes (the 8 currently-passing positives are unchanged).
- **R2 (new, lenient gate):** a case whose injected source is a verified,
  same-group source for a topically-equivalent proposition PASSes.
- **R3 (negative guard):** a case whose injected source is a **cross-group**
  fact (e.g. a `ghdev_gh_mcp`-grouped fact) still FAILs (protects N02-type
  semantics; see `negative-control-n02.md` — N02 is same-group, so a
  cross-group guard is the true leak test).
- **R4 (no retrieval-code change):** assert `Memory.search` /
  `sourcedEpisodeResolver` / `relevanceFilter` / 300 ms guard / group-scope
  filters are byte-unchanged (the correction is scoring-only).

## 5. What is explicitly NOT proposed

- No change to timeouts, relevance gates, or scope filters.
- No change to the 300 ms `Promise.race` (S13's boundary is unaffected).
- No re-labeling of N02 or of the 8/16 score.
- No human-certified grounded-precision computation (still UNVERIFIED pending
  operator adjudication of the 126 `human_verdict` fields).
