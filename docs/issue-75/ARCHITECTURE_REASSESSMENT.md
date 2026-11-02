# Issue #75: architecture reassessment and external code review

Status: **design proposal / implementation hold** (2026-11-01). No production migration or activation authorized by this document. Supersedes the retrieval-only kickoff in `implementation/LOCAL_AGENT_CONTRACT.md`.

## Corrected objective

Use Issue #70 as a working demonstration, **not** as a binding compatibility or preservation contract. Optimize everyday personal OpenCode developer memory for utility, simple operation, responsiveness, correct scope, correction and appropriate privacy. Adversarially compare retaining each working mechanism against replacing it. Functional invariants are not equivalent to preserving their past implementations.

The original issue still contains contrary preservation requirements; revise it when the new design is chosen. Previously staged lexical adapters are experimental baseline candidates, not presumptive production direction.

## External primary-source inspection (exact repository heads)

1. [artemfomin/opencode-graphiti @ a900aeaf](https://github.com/artemfomin/opencode-graphiti/tree/a900aeaf6a40d279c38274a6ae912c0aa5818097), MIT, especially [index](https://github.com/artemfomin/opencode-graphiti/blob/a900aeaf6a40d279c38274a6ae912c0aa5818097/src/index.ts), [compaction](https://github.com/artemfomin/opencode-graphiti/blob/a900aeaf6a40d279c38274a6ae912c0aa5818097/src/services/compaction.ts), [project grouping](https://github.com/artemfomin/opencode-graphiti/blob/a900aeaf6a40d279c38274a6ae912c0aa5818097/src/services/namespace.ts). Adapt: direct Graphiti MCP `search_nodes` plus `search_memory_facts`, explicit save/search/forget, repo-derived group names, privacy tags. Reject: first-message-only recall and keyword-dependent explicit storage as complete auto-discovery; heavy compaction-specific logic; V1 hook pattern for stock V2.
2. [happycastle114/opencode-graphiti @ 863a7d17](https://github.com/happycastle114/opencode-graphiti/tree/863a7d17f41cd41ee5b244bfff708b0184684ed9), MIT. Inspect [turn capture](https://github.com/happycastle114/opencode-graphiti/blob/863a7d17f41cd41ee5b244bfff708b0184684ed9/src/services/memory-capture.ts), [dedup](https://github.com/happycastle114/opencode-graphiti/blob/863a7d17f41cd41ee5b244bfff708b0184684ed9/src/services/memory-storage.ts), [Graphiti client](https://github.com/happycastle114/opencode-graphiti/blob/863a7d17f41cd41ee5b244bfff708b0184684ed9/src/services/graphiti-client.ts). Adapt: automatic finished-turn discovery trigger, group separation, explicit preferences and user-facing forget/list, small dedupe. Reject: persisting most substantive conversation pairs (Graphiti bloat/privacy/overlap with OpenViking); fail-open graph dedup (memory-storage.ts lines 57-85) and exact-text-only dedup as sufficient; unsupported assistant assertions treated as verified state.
3. [vicary/opencode-graphiti @ ed5ea69](https://github.com/vicary/opencode-graphiti/tree/ed5ea69b32e80e0a8ec491bdba05719c4dd9b298), MIT. Inspect [event handler](https://github.com/vicary/opencode-graphiti/blob/ed5ea69b32e80e0a8ec491bdba05719c4dd9b298/src/handlers/event.ts), [async Graphiti](https://github.com/vicary/opencode-graphiti/blob/ed5ea69b32e80e0a8ec491bdba05719c4dd9b298/src/services/graphiti-async.ts), [cache](https://github.com/vicary/opencode-graphiti/blob/ed5ea69b32e80e0a8ec491bdba05719c4dd9b298/src/services/redis-cache.ts). Adapt: isolate slow Graphiti ingest/refresh off prompt path; cache small relevant facts with bounded freshness, group-scoped parallel node+fact search, graceful no-Graphiti operation. Reject: duplicative Redis/FalkorDB short-term event/snapshot system already served by OpenViking, universal tool interception and huge event-extraction framework; unqualified staleness of previous-topic cached memories.
4. [thedotmack/claude-mem @ c239a048](https://github.com/thedotmack/claude-mem/tree/c239a048a8a07607148f4c1f26b258ccfb28b80d), Apache-2.0 per current LICENSE/package.json. Inspect [native V2 hooks](https://github.com/thedotmack/claude-mem/blob/c239a048a8a07607148f4c1f26b258ccfb28b80d/src/integrations/opencode-plugin/v2.ts), [core](https://github.com/thedotmack/claude-mem/blob/c239a048a8a07607148f4c1f26b258ccfb28b80d/src/integrations/opencode-plugin/core.ts), [observation handling](https://github.com/thedotmack/claude-mem/blob/c239a048a8a07607148f4c1f26b258ccfb28b80d/src/cli/handlers/observation.ts), [search bridge](https://github.com/thedotmack/claude-mem/blob/c239a048a8a07607148f4c1f26b258ccfb28b80d/src/cli/handlers/memory-search.ts). Adapt: V2 `prompt`, `execute.after`, `context`, `compaction` hooks and completed-turn event handling; non-blocking deferred worker, privacy/exclusion policy; progressive disclosure search index -> optional timeline -> selected detailed sources, small context. Reject: always ingesting all observations, a second complete SQLite/FTS5+Chroma archive and independent LLM worker when OpenViking/Graphiti already exist.
5. [Graphiti MCP tool contract](https://github.com/getzep/graphiti/blob/main/mcp_server/README.md), read 2026-11-01. Native `search_memory_facts` and `search_nodes` support semantic/keyword retrieval, `group_id`, centered search and temporal filtering; `add_memory` accepts episode inputs and queues processing, not necessarily synchronous persistence. Evaluate native search **before** writing custom multi-Cypher lexical machinery. Read back outcomes rather than assuming `add_memory` means fully indexed. MCP server documentation warns default HTTP binding is unauthenticated: use loopback or appropriately restricted network exposure.

## Adversarial mechanism decisions (proposals, not hidden preservation requirements)

| Issue #70 mechanism | Keep value? | Retain vs replace decision |
| --- | --- | --- |
| Full Git-commit source materialization before Graphiti | Source attribution matters; Git identity does not suit ordinary decisions | **Replace as default** with session/turn/tool message anchors; use exact repo/commit/test references only for objective code claims. Optional Git-authorized publication for export/audit |
| SQLite work ledger and multi-stage source-attested receipts | Restart-safe deduplication and observability matter | **Simplify** to one small persisted candidate/episode journal if needed; idempotency from stable event identity; reconcile ambiguous Graphiti queue outcomes before retry. Benchmark against Graphiti-native status first |
| Four fixed categories + exclusive temporal contract | Some distinctions useful, but taxonomy must suit observed work | **Reconsider**. Start with user decision, confirmed implementation fact, dependency/relationship, solved issue and project preference. Attach event time, source class, confidence/status; use Graphiti's temporal model and mark conflicting/current state uncertain rather than manufacturing truth |
| Separate gate + shared GPU scheduler and strict quiet grace | Slow extraction must not block coding or compete destructively with LLM | **Replaceable**; simplest cooperative, bounded deferred worker or reuse existing host worker. Exact lock/gate/receipt implementation not mandatory. No need for independent inference service |
| FalkorDB raw lexical Cypher and regexp trigger | Demonstrates cheap bounded read, but weak natural retrieval | **Do not promote as default**. Benchmark native Graphiti hybrid edges+nodes and limited neighborhood first. Lexical fallback optional |
| OpenViking broad session recall | Already provides general continuity | **Keep the function**; avoid new short-term archive. Graphiti specializes in useful durable facts and relationships |
| Group isolation, sensitive-text exclusion, non-blocking hooks, bounded context, disable/forget | Directly protects daily personal use | **Retain these user-visible properties**; mechanisms may change |

## Proposed minimal design

```text
Stock OpenCode V2 (prompt, completed tool, turn/compaction events)
       |  bounded metadata + content excerpts only (opted in)
       v
  Selective fact candidate filter (rules + optional deferred local model)
       |  source anchor + type + confidence + content hash
       v
  Tiny durable candidate journal / idempotent deferred processor
       |  user consent policy, privacy exclusion, local model resource limit
       v
  Graphiti episode API (group-scoped) -> Graphiti-native hybrid indexes
       |                                          ^
       |                              OpenCode V2 prompt/tool search
       v                                          |
  Memory search: compact top facts + source handles ----> optional detail
       |
  Budgeted non-instructional context, deduped against OpenViking context
```

Source policy: a direct user decision may be recorded as user-stated with message ID; a completed tool action is evidence of the tool's **reported** result, not a proof of application correctness; a codebase claim is verified only against inspected source/commit/runtime evidence. An LLM proposal is never automatically promoted to verified fact. Prefer source anchor to existing OpenCode/OpenViking event, not another copy of every conversation. Stored Graphiti episode metadata should permit navigating to the associated local source and identifying correction/supersession.

Capture policy: scoped opt-in, selective default categories, exclude secrets/private tags and large/raw outputs, do not silently publish to Git, bounded local retention and correction/forget. Classifier runs after the turn or idle/compaction, not inside interactive context hook. Avoid duplicated OpenViking summaries unless they contain a distinct useful durable fact.

Retrieval policy: query-relevant native `search_memory_facts` + `search_nodes`, group filters, small result budget, optional centered expansion, correct temporal qualifiers, rerank for evidence/usefulness/novelty, short-lived cache and fallback when unavailable. Prefer a tiny automatic context plus an explicit on-demand search/detail tool over flooding every turn. Use existing embedding resources only after confirming availability/latency.

## Challenging questions to resolve with tests, not inheritance

1. Can Graphiti MCP native hybrid search satisfy fixed paraphrase, indirect and historical benchmark cases without custom Cypher? Measure recall, precision, p50/p95, token costs, cache staleness.
2. Which OpenCode V2 events are sufficiently reliable to attach a durable source anchor? Verify message/tool identity, completed execution, compact/restart and worker recreation, including same-source duplicate deliveries.
3. Can Graphiti's existing episode metadata and API reconcile an unknown queue result after restart? If not, determine the **minimum** persisted journal needed; do not automatically replay ambiguous writes.
4. Can the existing memory worker/lease serve both OpenViking and Graphiti under real RTX 5090 model load without visible latency? Keep/reuse/replace only on empirical evidence.
5. Which stored material belongs in Graphiti at all rather than OpenViking? Measure useful fact yield, duplication, false certainty, private-content exclusion and ease of correction.
6. Preserve accessible pre-redesign episodes non-destructively; decide whether read-compatibility, export or one-time migration is simplest after new schema test. Avoid universal legacy adapters as a permanent constraint.

## Proposed acceptance direction

One opt-in ordinary coding session yields a small durable useful Graphiti fact without purpose-built Git JSON; trace fact to real source event; absence of invented verification; privacy exclusion; repair/idempotency over restart and ambiguous queue outcomes. Native/hybrid search beats baseline on frozen direct/paraphrase/dependency/history/irrelevant cases without breaking group isolation or falsely declaring current state. Remembrance, inspection and correction take one simple user-facing command/tool, not serial controllers. OpenViking continues providing ordinary session continuity. No destructive live changes during design/benchmarks.

No build/merge/deploy handoff should use the superseded first-pass `implementation/` contract. Central should choose final architecture and stage an **integrated** capture+retrieval source candidate on this existing branch; then issue one practical host-local Build qualification handoff (not separate micro-slices).
