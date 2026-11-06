# Retrieval Pipeline Analysis — Issue #81 recall diagnostics

Source-backed invariant analysis of the recall path at the merged source
(`main @ b39e1ff7`, tree `7c5486fe`), with exact current-code locations and the
minimal implicated surface. No code was changed.

## 1. The recall path (exact locations)

1. **Prompt hook** — `docs/issue-75/v2-candidate/plugin.mjs:116-147`
   - `nativePromptID(event)` (`plugin.mjs:36-41`) resolves the native message id.
   - `bounded = safeText(text, 500)`; requires `bounded.length >= 10`.
   - Stores `{ nativeID, text: bounded, request: memory.search(bounded).catch(()=>[]) }`
     per session (bounded to 8 prompts/session, 100 sessions).
2. **Context hook** — `docs/issue-75/v2-candidate/plugin.mjs:155-174`
   - `requestForContext(...)` (`plugin.mjs:50-73`) selects the most recent native
     user message and matches by exact `nativeID`, else text-exact.
   - `Promise.race([selected.request, setTimeout(resolve([]), 300)])`
     (`plugin.mjs:169-171`) — the 300 ms guard.
   - `formatContext(items)` (`memory-core.mjs:386-391`) builds the
     `[GHDEV_GRAPHITI_CONTEXT]` block.
3. **Search + source selection** — `docs/issue-75/v2-candidate/memory-core.mjs:315-384`
   - `search_memory_facts({query, group_ids:[this.group], max_facts:12})`
     (`memory-core.mjs:321-323`).
   - `wanted` = union of returned facts' `episodes` (slice 0,12)
     (`memory-core.mjs:327-329`).
   - `byRemote` built from the legacy journal (persisted, matching group)
     (`memory-core.mjs:331-338`) **plus** the curated
     `extraSourceResolver` = `sourcedEpisodeResolver`
     (`memory-core.mjs:343-358`; `docs/issue-78/v2-curator/sourced-recall.mjs:7-32`).
   - **Source selection** (`memory-core.mjs:366`):
     ```js
     const source = ids.slice(0, 12).map(id => byRemote.get(id)).find(Boolean);
     if (!source) continue;
     ```
     This is the **first-resolvable-episode** rule: for a returned fact, the
     source is the first of its `episodes` (up to 12) that has a persisted,
     source-grounded mapping in `byRemote`.
4. **Relevance / dedup / budget** — `docs/issue-75/v2-candidate/relevance.mjs:152-189`
   - `admitFact`/`lexicalSupport`: `count >= 2 && score >= 0.34`
     (`relevance.mjs:33-36`).
   - `relevanceFilter`: `maxSelected = 1` by default (`relevance.mjs:152`),
     lexical + optional reranker; injects **at most one** fact.
   - 1400-char budget in `Memory.search` (`memory-core.mjs:375-382`).

## 2. Invariant that explains the seven wrong-source cases

`search_memory_facts` is a **semantic** fact search. It returns up to 12
facts that are *semantically near* the prompt, not the single "expected" fact.
For each returned fact, `memory-core.mjs:366` picks the **first resolvable
episode's source**. Therefore:

- If the topically-correct fact is not the one `search_memory_facts` returns
  first (or is not returned at all), the injected source is a **different but
  related** persisted fact.
- All seven wrong-source cases (S01, S03, S04, S05, S06, S07, S10) show exactly
  this: the injected source is a real persisted fact with legitimate native
  provenance, topically related to the prompt, but **not** the exact expected
  fact (see `recall-case-diagnostics.json` → `injected_source` vs
  `expected_source`; none share an assertion or episode).

This is **not** a single shared provenance-binding defect. The implicated
surface is minimal and bounded:

- **`memory-core.mjs:366`** (`ids.slice(0,12).map(byRemote.get).find(Boolean)`)
  — the first-resolvable-episode selection. It is *correct* for picking a source
  for a *given* fact; it does not cause the topical offset.
- **The semantic search returning a related-but-different fact** — the upstream
  cause of the topical offset.
- **The frozen evaluator's exact-source gate** — see
  `recall-evaluator-analysis.md`.

## 3. S13 no-injection

- The GHDEV block is **absent** in S13's model request
  (`semantic-recall-results.json`: `verdict=MISS`, `injected_source_refs=[]`).
- Per `native-context-latency.json`, an absent block is **censored-or-no-match
  and indistinguishable** without plugin modification (the 300 ms `Promise.race`
  at `plugin.mjs:169-171` resolves to `[]` on timeout, which is observationally
  identical to "no relevant fact").
- **Missing source index is ruled out:** S13's expected episode
  `009974d2-…` is present in `_episode-index` (140 index files) and its record
  is `persisted`. Group/project/workspace all match
  (`development-knowledge` / `gh_mcp` / `/workspace/mcp_servers/gh_mcp`).
- First supported failure boundary: the absent GHDEV block. The specific cause
  (no-match vs 300 ms timeout vs relevance-filter) is **UNVERIFIED** from the
  unmodified-plugin evidence. No timeout, relevance gate, or scope filter was
  changed.

## 4. N02 (see `negative-control-n02.md`)

The injected N02 fact is in the **active** `development-knowledge` group (not
the superseded `ghdev_gh_mcp` group); it is a development-knowledge fact *about*
the historical `ghdev_gh_mcp` scope. This is a correctly-grouped, undesired
topic-relevance admission, not a cross-group source leak.

## 5. Minimal implicated surface (no speculative fix)

No production correction is demonstrated as *necessary* by the evidence:

- The seven wrong-source cases are a combination of (a) semantic search
  returning a related-but-different fact and (b) the evaluator's exact-source
  strictness. Both are behavior, not a demonstrated code defect.
- The smallest *candidate* correction surface, if Central chooses to act, is
  the evaluator's exact-source gate (score a related verified source as
  acceptable) — a **scoring-policy** change, not a retrieval-code change.
  See `proposed-correction-contract.md`. No retrieval-code change is required
  by the evidence.
