# #101 C1/C2: source-qualified recall simplification

**Inspected exact base:** `main@0bdff06ce164545bd96f913278d08fe91dc55f0e`. The controlling prospective design is #98/#101; accepted #99/#100 provide source-preserving capture and AI-authoritative established/provisional retention with selective non-destructive consolidation. This branch is a **pre-merge source candidate**, not installed-runtime or final answer-utility acceptance.

## Source and authority trace

1. `docs/issue-75/v2-candidate/plugin.mjs` hooks a source-checked native prompt and asynchronously prefetched context. `memory-core.mjs:Memory.search` issues bounded `search_memory_facts` (24 facts) and starts curated local lookup concurrently; Graphiti RPCs serialize through the shared client.
2. The **legacy journal** pages its persisted records only to qualify Graphiti-returned episode anchors. It can contain older distinct original-source evidence, so this patch **does not remove it**.
3. `docs/issue-78/v2-curator/curated-recall-candidates.mjs` previously scanned <=4096 entire review JSON files on each automatic query, including deferred/skipped reviews that cannot pass final source proof. At >4096 reviews it already used the episode index. This was a branching algorithm based on irrelevant review-count growth, with a single malformed review blacking out the <=4096 candidate lookup.
4. `_episode-index/<uuid>.json` is a *candidate identity lookup*, not source authority. `sourcedEpisodeResolver` rereads a persisted exact-id one-fact review, original native-ID `opencode:` source refs, group/project/workspace, evidence class and retention/temporal status. Logical retirement/supersession excludes recall; provisional utility retains explicit label alongside original temporal status.
5. `Memory.search` merges native and indexed candidates. **Only** positively confirmed same-group live `get_episodes(max_episodes=1000)` membership can inject indexed source. A full 1000-item result fails closed. This patch does not alter the remote authority, per-hook budget, or model-facing selector.

## Decision record

| Route | Decision | Reason |
|---|---|---|
| Full review-directory scan in normal query recall | **RETIRE** | Injectible indexed candidate already requires its episode index; unindexed/deferred history adds no unique qualified fact |
| Query-free bounded compatibility inventory | **KEEP** | Explicit tool/test interface, not the interactive prompt path |
| Legacy journal resolution for native Graphiti facts | **KEEP** | Potential unique valid older source records, not proven redundant |
| Curator index + positive persisted ReviewStore/source evidence | **KEEP** | Local proof of original identity, scope and retention; never remote authority |
| Fresh live same-group remote UUID proof | **KEEP** | No cached-positive shortcut |
| Strict relevance, semantic presentation and optional rerank | **MEASURE** | Do not remove until unique paraphrase/source-exact/negative utility is quantified |
| OpenViking recall | **KEEP DISTINCT** | Separate session/experience memory; must coexist in the final same native request |

## Changes and regression design

The query-scoped retrieval path now always enumerates up to 4096 indexed episodes, irrespective of total review count. The query-free compatibility path retains its historical inventory and 500-record return bound. Both isolate individual JSON syntax and envelope identity/state corruption, but leave fatal read/permission errors visible. Nested invalid facts/events cannot upgrade source identity or abort unrelated candidates; malformed sources are non-authorizing.

The existing `curated-recall-candidates.test.mjs` is now included in `curator.test.mjs`, already invoked by normal CI's curator suite, without changing workflow, profile, controllers or dependency locks. It includes source-index overflow/fallback, remote 1000-item fail-closed, source/named-identity selection, plus #101 negative cases: bad siblings under 4096, nested corruption, target bad record exclusion, actual read-count bound with 513 unrelated deferred records, and fatal `EACCES` propagation.

**Unchanged:** normal capture/EX, AI/autonomous curation and one fact/episode, post-exit submission/unknown recovery, temporal/provisional source authority, journal content, native Graphiti transport serialization, 70-ms optional index enrichment, strict/semantic rank scores, selected-context 1400-character/at most five facts, 300-ms callback allowance and OpenViking.

## C3 measurement questions, not assumed results

The index route is still O(number of indexed episodes) and reads a source review per episode. Measure real cold/warm CPU time and total reads at 512, 4096, 4097 total reviews and approaching 4096 indexed episodes; do not assume improved hook p95 from fewer review files. Verify that no valid, indexed, positively sourced record visible under the old route is missed by the new route; preserve baseline failures independently.

Strict/semantic candidate paths and double shortlisting remain because they have not been proven redundant. Compare their marginal unique authorized fact reach, paraphrase and negative abstention, temporal/provisional/retired handling and actual model context before deciding removal. The 1000-result remote list cap remains a known hard availability limit; inspect an installed targeted read-only membership tool before any change. No local index may replace a live positive remote proof.

**Pre-merge host evidence is not C4/C5 final activation.** Hermes' first campaign validates source/test and performs bounded read-only host profiling. Central will then resolve any material findings, independently review the final head and enforce merge/main CI. Only after accepted post-merge source may final reversible combined A+B+C activation, genuinely fresh service/client/native session, post-exit curation, OpenViking same-request and real callback/answer proof proceed. Parent #98 is independently gated. No new PR per C3 measurement or per case.
