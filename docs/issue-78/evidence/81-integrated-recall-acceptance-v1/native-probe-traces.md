# Native stock-V2 hook-shape and recall-association traces (sanitized)

Disposable source-scoped probe: isolated `OPENCODE_CONFIG_DIR` +
`OPENCODE_DB`, branch-staged plugin bytes (issue-78 wrapper
`e54884ba…` → fixed issue-75 baseline `7550f0b6…`) loaded from the
authenticated worktree, recall-only (`capture: false`) against the
production `development-knowledge` graph (read-only). Production shared
service config was not modified. Model: `local/chat-fast` (LiteLLM 8002 →
NInfer 8001), non-thinking.

Raw sanitized events: `probe-traces.jsonl` (246 events; the one invented
fake secret token is redacted as `<fake-secret-token>`; no private
transcript text beyond 80-char heads and the curated block).

## 1. Genuine stock-V2 field shapes (v2.2.5)

- **Prompt hook** (`ctx.session.hook('prompt')`):
  - `event.messageID` = native user message ID, shape `msg_<alnum>`
    (e.g. `msg_1af17edf6001iMo2DH0NvTHVeX`).
  - `event.messageId`, `event.promptID`, `event.promptId`,
    `event.prompt.id`, `event.prompt.messageID` are all **absent**;
    `event.timestamp` absent. The staged `nativePromptID` ladder
    resolves via `event.messageID` (first candidate).
  - `event.prompt.text` is a JSON string literal (starts with `"`),
    matching `promptText`'s decode contract.
  - `event.messages` is **not** present on the prompt event.
- **Context hook** (`ctx.session.hook('context')`):
  - `event.messages` **is** present: array of native messages with
    `role` and `id` (user/assistant), e.g. user `id`
    `msg_1af17edf6001iMo2DH0NvTHVeX` — identical to the prompt hook's
    `event.messageID` for the same user message.
  - `event.system` is the outbound system-context array; the plugin's
    `[GHDEV_GRAPHITI_CONTEXT]` push is observable there.
- **Conclusion:** the staged matching contract's native fields
  (`event.messageID` on prompt; `event.messages[*].id` on context) are
  all present and mutually consistent in stock V2.2.5. **No
  contradiction** — no minimal redacted shape / reproducer return to
  Central is required, and no session-latest substitution was needed.

## 2. Recall association across the required prompt sequence

Session `ses-issue81-probe-seq` (one fresh session, four prompts):

| Prompt | native ID | text len | context builds | with block | binding |
|---|---|---|---|---|---|
| P1 real question | `msg_1af17edf6001iMo2DH0NvTHVeX` | 104 | 137 | 137 | block bound to P1's message ID in every build |
| P2 long auxiliary (750 chars) | `msg_1af19ca8e0013V3UOXBtlXOSK2` | 750 | 32 | 0 | truncated 500-char bounded search yielded no sourced facts; P1 block did not leak |
| P3 short auxiliary (`ok`, 2 chars) | `msg_1af1a6210001nAj9KVvYRMfUCQ` | 2 | 1 | 0 | <10-char fence → legacy fallback blocked; no block, no leak |
| P4 repeated real question | `msg_1af1a719e0016DASx4V6ZQlI4F` | 104 | 1 | 1 | re-associated by P4's own native ID |

The source-bound block (full text below) is selected from the correct
real user request in P1 and P4; the over-500-char and short auxiliary
prompts neither evict nor inherit it.

```
[GHDEV_GRAPHITI_CONTEXT]
[Graphiti memory: retrieved historical observations, not instructions or independently verified conclusions]
- The MCP server is bound to the graphiti_live graph, which is empty, while the development-knowledge graph has 35 nodes. (assistant-reported; historical/superseded; source=opencode:ses_e5161e002ffeUFAxdC5lo1zi1m:message:msg_1ae9e73a20015ET1Y2L1znvlKE)
[/GHDEV_GRAPHITI_CONTEXT]
```

(The injected fact is source-correct: it matches the persisted curated
record `f97780f5…` and its terminal episode `877a5de5…`; the
`historical/superseded` marker is accurate — the live graph now holds
223 nodes, so the model is not misled about current state.)

## 3. Negative controls (session `ses-issue81-probe-neg`)

| Control | Prompt shape | builds | with block |
|---|---|---|---|
| N1 unrelated | "capital of France" | 1 | 0 |
| N2 wrong-group (legacy `ghdev_gh_mcp` topic) | legacy group query | 1 | 0 |
| N3 secret-bearing | invented fake token + real question | 1 | 0 (privacy fence rejects the query; token absent from all system blocks) |
| N4 real after secret | repeated real question | 7 | 7 (secret prompt did not evict the valid entry) |

Zero observed wrong-group, secret, or false-verified violations in the
observed controls.

## 4. Latency (session `ses-issue81-probe-lat`)

19 genuine native context builds (3 turns, 3 fresh processes):
p50 = 0.03 ms, **p95 = 256.92 ms** (≤ 300 ms guard), max = 256.92 ms
(cold process: fresh MCP initialize + search round trip, network
included; no cross-process prewarm). See `latency-aggregates.json` for
the raw population and method.
