# Diagnostic Summary — Issue #81 source-binding completion and recall-failure diagnosis

Two problems are evaluated separately. No production repair was made; the
frozen results are preserved.

## Problem 1 — Source quality

**Q: Is the published 126/126 automated source-match claim reproducible
against the original native events?**
**Yes.** All 126 assertions are **verbatim UTF-8 substrings** of the
source-ref-consistent event's excerpt in the private curation store
(`fact-source-bindings.jsonl`: 126 `EXACT_NATIVE_SOURCE_MATCH`; byte offsets
verified for all 126). The earlier "only 8 independently matchable" figure
refers only to the **single displayed** `native_source_excerpt` in the operator
packet; each record carries 2–8 source events, and the assertion is verbatim in
the source-ref-matched (often non-displayed) event. So the 126/126 claim is
reproducible from the original native events.

**Q: Are event actor / timestamp / source offsets complete?**
- **Actor (role):** independently present for all 126 via `event.kind`
  (`user_turn`/`assistant_turn`/`tool_outcome`). No separate account-actor id
  is recorded; the actor is the role, stated not inferred.
- **Timestamp:** `events[].observed_at` present for all 126 (the native-event
  observation time); distinct curation `created_at`/`updated_at` are kept
  separate and not substituted for the native time.
- **Source offsets:** verified for all 126 (`start_utf8_byte` …
  `end_utf8_byte_exclusive` reproduce the assertion exactly).

**Q: Which records rely only on assistant assertions, interrogative user text,
obsolete runtime observations, or unsupported authority upgrades?**
- 103 `assistant-reported` (the assistant said this; not independent
  verification of the proposition).
- 18 `tool-reported` (observed tool output; authority limited to the tool run).
- 5 `user-stated`, of which **items #55 and #79 are user interrogative text
  ("What FalkorDB layout is …") promoted into factual assertions** — the
  specific concern flagged by the task. They are a **duplicated
  graph-topology observation** (the FalkorDB per-group-graphs topology also
  appears across ~29 related items, mostly assistant-reported).
- No record's authority is upgraded beyond its source `evidence_class`; the
  `automated_source_match` is extractive only (verbatim membership), never a
  claim the proposition is true.

**Q: Is the 126-item record denominator usable as an item metric while the
atomic-claim denominator remains separately uncertain?**
Yes as an **item** metric (record count == fact count == 126 in this
snapshot). The **atomic-claim** denominator (splitting compound assertions into
atomic propositions) is separately uncertain and is **not** computed here.

**Human-certified grounded precision:** not computed. All 126 `human_verdict`
fields are null (awaiting operator adjudication).

## Problem 2 — Retrieval correctness

**Q: Do the seven wrong-source cases show provenance-binding defects, ordinary
semantically-related recall, evaluation-policy overconstraint, or a
combination?**
A **combination**, dominated by **ordinary semantically-related recall**:
`search_memory_facts` returns a topically-related (not exact) fact, and
`memory-core.mjs:366` (`ids.slice(0,12).map(byRemote.get).find(Boolean)`)
correctly picks a resolvable source for that fact. The frozen evaluator's
**exact-source gate** then scores the related-but-different verified source as
wrong. It is not a pure provenance-binding defect: every injected source is a
legitimate persisted fact with real native provenance.

**Q: What is S13's first supported failure boundary?**
The **absent** `[GHDEV_GRAPHITI_CONTEXT]` block. Per `native-context-latency.json`
this is **censored-or-no-match and indistinguishable** without plugin
modification (300 ms `Promise.race` timeout is observationally identical to
no-match). **Missing source index is ruled out** (expected episode
`009974d2-…` is in `_episode-index` and its record is persisted). The specific
cause (no-match vs timeout vs relevance-filter) is **UNVERIFIED** from the
unmodified-plugin evidence.

**Q: Was N02 genuinely a source-group leak?**
**No.** The injected N02 fact is in the **active** `development-knowledge`
group (not the superseded `ghdev_gh_mcp` group); it is a development-knowledge
fact *about* the historical `ghdev_gh_mcp` scope. It is a **correctly-grouped,
undesired topic-relevance** admission, not a cross-group source leak.

**Q: What is the smallest necessary correction, if any?**
No **retrieval-code** correction is demonstrated necessary. The smallest
*candidate* correction is a **scoring-policy** change (credit a topically-related,
verified, same-group source; see `proposed-correction-contract.md`). It is
proposed, not implemented, and does not change the frozen 8/16.

## Preserved historical results (unchanged)

- **Semantic recall: 8/16, FAIL** (required ≥ 13/16).
- **N02: FAIL_INJECTED.**
- **Human grounded precision: UNVERIFIED.**
- **Episode integrity: last host report 140/140.**
- **Installed source: merged main `b39e1ff7…`.**
