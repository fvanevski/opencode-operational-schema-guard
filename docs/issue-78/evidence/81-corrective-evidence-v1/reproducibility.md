# Reproducibility — Issue #81 Corrective Evidence v2

## Service identity

- Graphiti MCP: `http://127.0.0.1:8766/mcp`; `get_status` → `ok — "Graphiti MCP server is
  running and connected to falkordb database"` (observed 2026-11-06, UTC).
- Production plugin: `/home/filip/.config/opencode/plugins/ghdev-graphiti-memory`
  (main `docs/issue-78/v2-candidate/plugin.mjs`), options: `group=development-knowledge`,
  `workspace=/workspace/mcp_servers/gh_mcp`, `project=gh_mcp`,
  `stateDir=/home/filip/.local/state/ghdev-graphiti`, **no `rerankEndpoint`** (ranker = null).
- Installed source files verified byte-identical to `b39e1ff7` (digests in
  `input-identities.json`).

## Graph population snapshot (read-only observation, 2026-11-06T16:22:18Z..19Z UTC)

- curation-v1/development-knowledge: 237 records (140 persisted, 95 deferred, 2 skipped),
  140 `_episode-index` files, 140 persisted — **no growth vs the prior 140/140**.
- `episode_index_set_sha256 = 75dc74af08152157c32b4e0fd7de4435a945070951100803b35f9a98692a1e56`
  (SHA-256 over the sorted 140 index UUIDs).
- Legacy issue-75 journal (`stateDir/development-knowledge`): **0 rows** — all source
  resolution in production flows through the curated resolver.
- Legacy `curation-v1/ghdev_gh_mcp` (historical pre-cutover set): present, 79 files;
  **not** a source of any returned fact (all returned facts have
  `group_id = development-knowledge`).

## The nine-case probe (Phase 3)

- Invocation (authenticated from the installed MCP surface):
  `graphiti.search_memory_facts({ query: <frozen prompt>, group_ids: ["development-knowledge"], max_facts: 12 })`.
  The production search bounds the query with `safeText(prompt, 500)`
  (`memory-core.mjs:316`); for all nine prompts the bound text is the prompt itself
  (each < 500 chars, no private patterns), so `input_to_search_sha256 == frozen_prompt_sha256`
  (the 20 frozen hashes were recomputed from the roster and match, ALL_MATCH).
- One call per case; all nine succeeded on the first attempt (elapsed 84–283 ms).
  S13's two-permitted repetitions were **not needed** (no transient/malformed response).
- Raw capture: `/tmp/opencode/issue81-corrective-evidence/private/raw/graphiti-probes-raw.json`
  (SHA-256 `962424daf516ec348b85accab6ba9e239afa420da907c1bf9497cbb46674de70`);
  public excerpts carry `raw_fact_sha256` per fact.

## The replay trace (Phase 4)

`helpers/trace-recall.mjs` (private identity in `input-identities.json`) imports the
**installed** production modules — `safeText` (`memory-core.mjs`),
`relevanceFilter`/`relevanceSignals` (`relevance.mjs`), `sourcedEpisodeResolver`
(`sourced-recall.mjs`) — and re-derives, per case: bounded text → wanted episode set
(first 12 per fact) → `byRemote` (empty legacy journal + resolver extras) → per-fact
first-resolvable source (`memory-core.mjs:366` logic) → `relevanceFilter(text, candidates,
null)` → 1400-char budget. No competing retrieval implementation was written.

`helpers/run-resolver.mjs` calls the real `sourcedEpisodeResolver` read-only with the
production binding for the S13 episode (result in `s13-index-readback.json`).

## Observational limitations

- The **historical** Graphiti top-12 ordering was not recorded in the frozen run;
  current-replay ordering is NOT evidence of historical ordering (labeled
  `UNVERIFIED` wherever it matters). The *selected* fact identities do match the
  historical frozen injections (DIRECTLY_OBSERVED_IN_CURRENT_REPLAY +
  REPRODUCED_WITH_REVIEWED_SOURCE_LOGIC).
- No reranker was configured in production, so no reranker scores exist to record or
  reconstruct; ranking is fully deterministic (lexical + priority cues).
- S13's historical 300 ms `Promise.race` censored path cannot be excluded (no timing
  evidence in the frozen run).
- The historical injected fact **texts** are in the private litellm trace
  (`PRIVATE_EVIDENCE_REQUIRED`); this packet publishes source refs and digests.
