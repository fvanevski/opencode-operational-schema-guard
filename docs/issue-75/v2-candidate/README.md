# HISTORICAL: first integrated V2 candidate (superseded by README_NEXT.md)

Do not use this document as current execution or API authority. The corrected code and next integrated Build campaign are governed by README_NEXT.md and LOCAL_AGENT_CONTRACT_NEXT.md. The first local-agent handback identified remote UUID and inference-scheduling defects superseding parts of this original design.

## Original first-campaign record

**Status: staged Central-authored experimental source, NOT deployed, host-qualified or CI-tested.**
Work on branch `issue/75`; supersedes `docs/issue-75/implementation/`. Follow the [architecture reassessment](../ARCHITECTURE_REASSESSMENT.md) and updated [Issue #75](https://github.com/fvanevski/opencode-operational-schema-guard/issues/75).

## Design delivered

- `memory-core.mjs`: strict bounded capture from explicit user decisions and completed successful test commands; source class `user-stated` or `tool-reported`, never independently verified. No blanket transcript logging, no Git source-file requirement, no worker/LLM classifier.
- `Journal`: one private JSON file per deterministic episode UUID, atomic create, lock-guarded status changes. `pending -> submission_unknown -> queued -> persisted` via explicit Graphiti `get_episodes` readback. An ambiguous submission is **not automatically replayed**.
- `GraphitiMcp`: loopback-only MCP HTTP client; native `add_memory`, `search_memory_facts`, `get_episodes`, `delete_episode`. `add_memory` only acknowledges a queued work item; it is **not** a persisted graph receipt. Graphiti's accepted `uuid` argument enables deterministic source/event deduplication.
- `Memory.search`: bounded native semantic/hybrid edge search in one explicitly configured group; inject only facts with locally confirmed source episode IDs; label current state as unverified. This does not reproduce #70's Git receipt SQL, exclusive-state validator, manual authoring, or long-token Cypher.
- `plugin.mjs`: opt-in stock V2 `prompt`, `execute.after`, `context`, `compaction` hooks. User prompt candidates are only staged after an admitted model context; the Graphiti call runs asynchronously. A memory lookup prefetches at prompt time and contributes only if ready within a 300 ms context budget; no result leaves OpenViking unaffected. Own tagged blocks are removed on successive context builds.
- `memory-cli.mjs`: inspect, reconcile, explicitly forget a persisted episode. Forgetting a queued/unknown episode is prohibited because it could be published after deletion.

This is **deliberately smaller** than a complete autonomous extraction engine. The first integrated acceptance case is a genuine explicit user decision captured in a regular session with no purpose-built Git JSON. A second case is an actual completed passing test tool outcome. General automatic inference from complex coding sessions may justify a deferred local-model selector only if these simpler signals prove insufficient. The Build agent should **not** invent such a selector in this handoff.

## Integration assumptions to authenticate on host

- OpenCode stock V2 provides `ctx.session.hook('prompt'|'context'|'compaction')`, `ctx.tool.hook('execute.after')`, and a resolvable `@opencode/plugin` package. Actual installed binary/SDK/event shapes are host authority and may need bounded candidate adaptation. Do not use V1 plugin behavior.
- Current upstream Graphiti MCP takes `uuid` and `group_id` in `add_memory`, a **list** `group_ids` in native `search_memory_facts`/`get_episodes`, and supplies `fact.episodes`. Installed server must be inspected because upstream code is not evidence of this host version. MCP may use JSON or SSE.
- MCP `get_episodes` is recent/limited to 100 episodes in this candidate; absence from that window **does not prove the episode was never indexed**. Unknown stays reviewable, not replayed. Correctness takes priority over automatic retries. Manual or future enriched readback may be appropriate if graph is dense.
- The candidate does not import or modify existing OpenViking memory, older Graphiti graph episodes, old #70 receipts, legacy services, or production group configuration. Legacy records remain available through existing paths; their automatic integration should be evaluated separately rather than assumed.
- Journal is personal-tier single-local-host storage; its per-episode lock is fail-closed if a process crashes while holding it. Inspect and resolve stale locks only with actual process/record evidence. One candidate install per group; no unsupported distributed multi-writer promise.

## Candidate commands

In candidate directory:

```bash
node --check memory-core.mjs
node --check plugin.mjs
node --check memory-cli.mjs
node --check benchmark-evaluate.mjs
node --test memory-core.test.mjs
```

This tests logic without Graphiti or the OpenCode SDK. Separately qualify actual V2 plugin setup and MCP methods in an isolated host configuration with a disposable test group, then perform one end-to-end opted-in session. All host source/runtime hashes and actual actions remain host evidence, not claims from this document.

An isolated native V2 plugin package config may look like the following; adapt the **load syntax** only after checking the installed SDK/config (absolute file path, actual plugin order and existing provider/model settings):

```json
{
  "plugins": [{
    "package": "/ABSOLUTE/ISOLATED/PLUGIN/PATH",
    "options": {
      "enabled": true,
      "capture": true,
      "group": "g_issue75_test",
      "endpoint": "http://127.0.0.1:8000/mcp/",
      "stateDir": "/ABSOLUTE/ISOLATED/PRIVATE/STATE"
    }
  }]
}
```

The defaults are disabled unless the plugin option `enabled: true` and explicit group are provided. **The above is illustrative, not a proven config for this host.** Never replace an active production config with the example.

To inspect a confirmed candidate journal:

```bash
node memory-cli.mjs list --group g_issue75_test --state-dir /ABSOLUTE/ISOLATED/PRIVATE/STATE
node memory-cli.mjs reconcile --group g_issue75_test --state-dir /ABSOLUTE/ISOLATED/PRIVATE/STATE
```

For explicit correction use `forget --id <confirmed-persisted-uuid> --yes` only in the disposable test group. Deletion is not part of an automatic recovery path.

## Benchmark evidence

- `benchmark-cases.json` freezes 4 synthetic graph facts and 7 target queries with direct, paraphrase, implicit dependency, multi-entity, history, irrelevant, and wrong-group checks.
- Use the *same* seeded fact corpus and frozen judgments on the old lexical trigger/longest-token retrieval baseline and native Graphiti candidate where feasible. If old code cannot access this disposable corpus without reviving unnecessary historical fixtures, report a clearly named **heuristic-only baseline**, not an end-to-end equivalence claim.
- Record one `baseline-results.json` and `candidate-results.json`, each an object `{"label":"...","results":[{"id":"direct","returned":["f1"],"latency_ms":0,"context_chars":0,"timed_out":false}, ...]}`. Every frozen case appears exactly once. Map retrieved natural-language facts to frozen fact IDs with independently checked matches; do not use model self-grading.
- Run `node benchmark-evaluate.mjs baseline-results.json candidate-results.json`.
- Predetermined aspirational quality target: precision >=0.80, recall >=0.75, >=2 more covered relevant cases than old heuristic, zero wrong-group facts, zero manufactured temporal/verification claims. Record measured p50/p95 and prompt injection deadline. If not met, report the actual bottleneck and fix in-scope defects without weakening fixtures or adjusting targets retroactively.
- The Graphiti extraction/semantic-search campaign may use local GPU. Keep this separate from CPU-only tests and respect the existing local inference host contract. Do not create a second competing scheduler or move model work into a context hook.

## End of this unit

This unit should produce a usable, isolated, end-to-end candidate and a single comprehensive handback. Central reviews and stages the actual host-integrated source on **this branch**, then proceeds toward one eventual PR. No local Build GitHub push/PR/merge or unattended production promotion is needed.
