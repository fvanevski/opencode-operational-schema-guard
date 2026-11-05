# Issue #81 — Model / Graphiti Post-Exit Qualification (81-recall-remediation-v1)

## Status: ARMED, completes post-exit

The single bounded post-exit model/Graphiti drain is **armed** via the user systemd unit `ghdev-curator81t-qual.{service,path}` and the canonical `post-exit-drain.py` EX gate. It **fails closed** while the interactive Build harness is active (`FAIL_CLOSED: shared agent/gate lease held; bounded wait exhausted`, retrying every 30s) and is **admitted and runs once** after the harness exits. No unadmitted LLM/Graphiti calls occur while the harness is active; there is no second always-on retry loop.

## Exact drain invocation (canonical EX gate)

```
/usr/bin/python3 .../worktree/docs/issue-75/v2-candidate/post-exit-drain.py \
  --gate-source /home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py \
  --gate-config  /home/filip/.config/openviking/commit-gate.toml \
  --cli          .../terminal81-a1f3c9/usage-drain-cli.mjs \
  --group        cur81_native_a1f3c9d7 \
  --state-dir    /tmp/opencode/issue81-qual/terminal81-a1f3c9/state \
  --endpoint     http://127.0.0.1:8766/mcp \
  --max-seconds  600 --lock-timeout 120
```

- **Model:** `chat-fast` (non-thinking; `enable_thinking=false`, **no** `reasoning_effort` client field — `modelPolicy` throws `CURATOR_POLICY_CHAT_FAST_NO_REASONING_OVERRIDE` if set). Bounded `max_tokens` optional.
- **Gate source/config:** read-only, unmodified (byte-identical to the prior campaign).
- **EX admission:** enforced by `process.env.GHDEV_MEMORY_POST_EXIT_LEASE === 'admitted'` set by the Python wrapper while it holds the canonical shared flock.

## Where results land (post-exit)

- **Review store:** `state/curation-v1/cur81_native_a1f3c9d7/` (per-cluster decisions: EMIT/DEFER/SKIP, durable facts, remote episode UUIDs).
- **Usage journal:** `/home/filip/.local/state/ghdev-graphiti-issue81/usage-terminal81.jsonl` (per-cluster model usage: tokens, duration, model, endpoint host).
- **Graphiti:** episodes in group `cur81_native_a1f3c9d7` (`curated-v1:<cluster>`), with extracted nodes/edges and exact native cited source refs.
- **Terminal reconciliation:** the wrapper retains EX through remote episode persistence readback (no blind replay of an ambiguous submission; exit 3 = unknown remote outcome, exit 4 = local work remaining → resume under retained EX).

## What this section will contain after the drain

Actual model requests/tokens, EMIT/DEFER/SKIP counts, terminal state, Graphiti episode UUIDs, node/edge counts, exact native cited source refs, and the ambiguous-write/no-replay status. The **second operator fact-level packet** (verbatim proposed fact + quoted cited span + graph episode/relationship + useful/factuality/authority/scope rationale) is assembled from these readbacks.

## Production non-mutation

Production groups `ghdev_gh_mcp` (4 episodes) and `cur81_dev_ce555621` (9 episodes) are untouched; the drain writes only to the isolated `cur81_native_a1f3c9d7` group.
