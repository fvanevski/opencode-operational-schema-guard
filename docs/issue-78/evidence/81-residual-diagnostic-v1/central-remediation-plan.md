# Central Remediation Plan — Issue #81 Residual Recall Failures (ISSUE81_RESIDUAL_DIAGNOSTIC_V1)

Status: **PROPOSED — for Central disposition.** This plan consolidates the root-cause
findings of the 7-case residual diagnostic. It proposes production changes only; none of
them was made on this evidence branch (evidence-only scope). Thresholds are fixed by the
ratified target-ratification receipt and are **not** revised here.

## Evidence basis

- 7-case root-cause matrix: `seven-case-root-causes.json` (this evidence directory)
- Observer erratum: `observer-erratum.json` (S12 duplicate-count observer error)
- Source-equivalence findings: `source-equivalence-review.json` (S04/S05, S10, S13)
- Relevance module under analysis: `relevance.mjs`
  (SHA-256 `9767486ef71fa6cf88497a1af801540dc401550a0a472c98cef64f9b4b380100`)
- Candidate-set evidence class: **current-snapshot** reconstruction via read-only
  `search_memory_facts` (group `development-knowledge`, `max_facts=12`), NOT
  request-time historical evidence. `relevanceFilter` run with `ranker=null`
  (installed plugin config has no `rerankEndpoint`), so selection order is
  `priority → lexical.count → lexical.score → candidate index`.

## Root-cause summary

| Category | Cases | Share of 7 |
| --- | --- | --- |
| LEXICAL_ADMISSION (named-entity fence over-rejection) | S01, S04 | 2/7 |
| RETRIEVAL_COVERAGE (expected episode absent from top-12) | S03, S05, S07, S10, S13 | 5/7 |
| Pure RANKING failures | none | 0/7 |
| Secondary LEXICAL_ADMISSION | S03 (sibling proposition-equivalent facts fence-rejected) | 1/7 |
| Secondary SOURCE_EQUIVALENCE | S05, S10 | 2/7 |

No ranking-stage failure: in every case where an expected (or proposition-equivalent)
candidate was present in the candidate set, it was lost at **retrieval coverage** or at
the **lexical admission fence**, never at the final selection sort.

## Fix 1 — Named-entity fence over-rejection (`relevance.mjs`)

### Defect

`relevanceSignals` hard-gates every candidate on:

```js
names.some(name => !content.toLowerCase().includes(name))  // → eligible: false
```

where `names = namedQueryTerms(query)` (capitalized query terms, lowercased). **All**
named terms must appear verbatim as substrings of the fact. Two diagnosed failures:

- **S01**: query term `FalkorDB` → `falkordb`. Expected fact
  `"The environment variable GRAPHITI_RECALL_FALKOR_PORT is set to 6382."` tokenizes to
  `falkor`/`port`; the literal substring `falkordb` is absent → expected candidate
  (present in top-12 at index 2) rejected; a competing fact containing `FalkorDB`
  verbatim (index 3, a different proposition — query routing) is injected.
- **S04**: query term `MCP` → `mcp`. Expected fact
  `"A script queries the 'graphiti_live' graph filtered by group_id='development-knowledge'."`
  (present at index 10) contains neither `mcp` (overlap 4/0.308) → rejected; a
  proposition-adjacent fact from a different source (index 2) is injected.
- **S03 (secondary)**: proposition-equivalent sibling facts (`560d782f`, `cb399069`)
  are present in the candidate set but lack the literal token `graphiti` → same fence
  rejects them, so the expected *proposition* is still unanswerable from memory.

### Proposed change (bounded)

1. **Majority gate instead of all-required gate**: a fact satisfies the named-entity
   fence when it contains at least `ceil(names.length / 2)` distinct named terms
   (for `names.length == 1`, at least 1).
2. **Strong-identifier fallback for the single-name case**: when `names.length == 1`
   and that name is absent, the fence is satisfied if the fact contains a *strong
   identifier* — a query token of length ≥ 4 that is not a common word, is not itself a
   named term, and appears verbatim in the fact (e.g. `graphiti_live`,
   `development-knowledge`) — AND `lexicalSupport` score ≥ 0.30. This keeps the fence
   strict for generic facts while admitting facts that unambiguously identify the
   referenced system.
3. **Unchanged**: issue-reference exact-ID checks and multi-digit number checks stay
   hard gates (they are identity fences, not relevance fences). The reranker path
   (`hasRerankScore`) already bypasses the fence via `qualifiedChoice`; document that
   explicitly.
4. **Validation**: re-run the frozen 16-case roster in a **new** campaign after the
   change (never rescore this campaign's 8/16 → 9/16 history); add the three
   fence-rejected expected facts (S01 idx 2, S04 idx 10, S03 siblings) as regression
   fixtures; require the 9/16 post-fix level not to regress and confirm S01/S04
   expected facts become eligible.

## Fix 2 — Top-12 retrieval coverage (retrieval stage)

### Defect

For S03, S05, S07, S10, S13 the expected episodes are **present in the graph**
(verified by direct episode lookup) but **absent from the current top-12**
`search_memory_facts` candidate set for the frozen queries. The loss happens before
relevance admission; no admission change can recover them.

### Proposed options (priority order)

1. **Bounded candidate expansion**: raise `max_facts` from 12 → 24 for the automatic
   injection path, with a measured host CPU-latency readout (the recall-control bound
   is the configured 300 ms `Promise.race`, not a measured latency — the expansion must
   be latency-verified on this host before adoption).
2. **Deterministic context pre-pass**: for queries carrying an issue/commit identifier
   (e.g. `52863ae`, `#81`), pre-include the most recent episodes from the referenced
   session/group into the candidate set before cross-encoder ranking, so sibling and
   expected episodes (S10 sibling `c059ab8f`, S05 expected `1a20d974`) survive to the
   relevance stage.
3. **Curation check (no change expected)**: the expected episodes are retained in
   `development-knowledge`; the defect is ranking/coverage, not retention. Confirm
   retention in the pre-pass validation.

### Acceptance

- Expected episode present in the candidate set for all 16 positive roster cases in a
  new campaign.
- No regression of the 9/16 post-fix score; no new false-positive injections beyond
  the operator-adjudicated precision threshold (`durable_grounded_precision_min=0.9`,
  ratified — fixed).

## Fix 3 — Observer correction (diagnostic harness)

The original observer counted `[GHDEV]` **substring** occurrences and double-counted a
quoted reference inside an OpenViking memory fact, producing
`S12 duplicate_block_in_request=true`. Corrected observer (shipped as
`analyze-case-corrected.py` in the campaign root):

- counts **complete** `[GHDEV]...[/GHDEV]` block pairs, not marker substrings;
- requires `source=opencode:` in the fact metadata before counting a duplicate;
- corrected S12 duplicate verdict: `false`; distinct-fact counts drop from the inflated
  values (e.g. S01 38 → 1) to ~1 per positive case.

The 9/16 post-fix score is preserved under the corrected observer (corrected source
references match the frozen matrix for all 16 positive cases). See
`observer-erratum.json` for the full per-case correction.

## Fix 4 — N02 policy disposition (no code change)

N02 (`FAIL_INJECTED`, retained unchanged) is a **policy false positive**: the injected
episode `e1d8e764` persisted in the `development-knowledge` group (not legacy
`ghdev_gh_mcp`) and states a proposition-correct cutover fact. The negative-control
assumption ("a legacy-group question has no development-knowledge memory") is too
strict — the cutover group legitimately contains facts mentioning the legacy group.
Document in curation policy; no recall-code change.

## Out of scope for this plan

- Production install / deployment of any fix (Central's release process owns that).
- Any revision of the ratified precision threshold (`0.9`) or target receipt/proposal
  hashes.
- Rescoring this campaign's 8/16 baseline or 9/16 post-fix score (both preserved
  verbatim in the evidence directory).
- New native recall runs as part of this evidence campaign (the new-campaign
  validation above runs after Central's fix is deployed).
