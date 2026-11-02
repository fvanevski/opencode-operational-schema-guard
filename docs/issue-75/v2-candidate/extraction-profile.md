# Issue #75 — extraction LLM profile (host binding, operator-applied post-exit)

## Failure classification (evidence from /tmp/ninfer-dev-swift-k7.jsonl)

The extraction LLM is the SAME single-serving Qwen3.8-27B `chat` model as the
interactive agent (ninfer-serve on :8001, `--max-concurrency 1`,
`--thinking-budget 16384 --preserve-thinking`), reached by the pinned Graphiti
MCP (:8766) through litellm (:8002) with `max_tokens 8192`,
`structured_output_mode=json_schema`, `SEMAPHORE_LIMIT=1`.

From 2083 logged `request_done`:
- finish_reason: `stop_token` 2069 / `cancelled` 4 / **`output_limit` 10**
- extraction-shaped requests run with
  `enable_thinking: True, thinking_budget: 16384, requested_output_tokens: 8192`.

The `output_limit` cases are the extraction failure mode: the **thinking budget
(16384) exceeds the output budget (8192)**, so reasoning tokens can exhaust the
output budget and truncate the `json_schema` completion → malformed structured
output in the pinned Graphiti client. This is reasoning-budget exhaustion, not
a model-scheduling or Pydantic bug. `SEMAPHORE_LIMIT=1` reduces parallel *episode*
processing, not inter-process model concurrency; with `--max-concurrency 1` an
active interactive request queues the extraction (contention). This is why the
drain is post-exit and gated on zero running/waiting inference.

## Qualified non-thinking extraction profile

`enable_thinking: false` is a supported per-request parameter (153 prior logged
requests used it). A bounded single-shot probe of `:8001/v1/chat/completions`
with `enable_thinking:false, max_tokens:64` returned
`finish_reason: stop`, `reasoning_tokens: 0`, clean JSON `{"ok": true}` — i.e.
the full output budget goes to the completion and the `json_schema` result is not
truncated.

### Additive litellm alias (does NOT alter the interactive `chat` alias)

Add to `/home/filip/.config/litellm/config.yaml` `model_list`:

```yaml
  - model_name: chat-extract
    litellm_params:
      model: openai/chat
      api_base: http://127.0.0.1:8001/v1
      api_key: EMPTY
      extra_body:
        enable_thinking: false
```

Then point the pinned Graphiti extraction at it (in
`/workspace/mcp_servers/graphiti/config/.env`):

```
GRAPHITI_LLM_MODEL=chat-extract
```

This is additive: the interactive `chat` alias (thinking, xhigh, 32768) is
preserved; only the Graphiti extraction path uses the bounded non-thinking
profile. Apply only for the disposable qualification; revert
`GRAPHITI_LLM_MODEL=chat` (and drop the alias) to return to the default profile.
No second scheduler, no new model, no change to the gate or scheduler.
