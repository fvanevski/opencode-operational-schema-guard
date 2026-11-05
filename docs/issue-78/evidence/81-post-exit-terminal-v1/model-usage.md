# Issue #81 — Model usage & decision counts (81-post-exit-terminal-v1)

Sanitized. Model-only curator tokens are reported **separately** from Graphiti extraction cost.
Reasoning tokens are reported as their own component and are **not** double-counted into a total.

## Curator model calls (chat-fast, non-thinking)

| Group | Calls | prompt | completion | reasoning | cached-prompt | duration |
|---|---|---|---|---|---|---|
| `cur81_native_a1f3c9d7` (dev drain) | 13 | 34831 | 2356 | 0 | 5184 | 9168 ms |
| `cur81_holdout_4c3ab514` (holdout drain) | 3 | 2913 | 1677 | 1454 | — | 6219 ms |
| **campaign total** | **16** | **37744** | **4033** | **1454** | 5184 | 15387 ms |

- **Model-only token total (prompt + completion, reasoning excluded to avoid double-count):**
  dev 34831 + 2356 = **37187**; holdout 2913 + 1677 = **4590**; campaign **41777**.
- **Reasoning tokens (separate component, not added to the above):** dev 0, holdout 1454, campaign **1454**.
- **Graphiti extraction cost:** separately attributable to the Graphiti server (falkordb) entity/relationship
  extraction pass. It is **not** included in the curator model-token totals above and is **not** double-counted.
  The extraction cost is measured by the Graphiti runtime, not the curator usage journal.

Source: dev usage journal `/home/filip/.local/state/ghdev-graphiti-issue81/usage-terminal81.jsonl` (13 records,
13 distinct clusters); holdout figures from the `ghdev-cur81-holdout-4c3ab514` systemd drain output.

## Decision counts (review-store curation records)

| Group | EMIT | DEFER | SKIP | Persisted (remote episode) | Deferred (clean, not a remote write) |
|---|---|---|---|---|---|
| `cur81_native_a1f3c9d7` | 13 | 1 | 0 | 12 | 1 (`f1a8c418…`, `LOCAL_REPEATED_ASSERTION`) |
| `cur81_holdout_4c3ab514` | 1 | 1 | 1 | 1 | 1 (transient git state) + 1 (single-word instruction) |

- **Ambiguous remote writes: 0.** Every persisted episode has a unique remote UUID; the deferred clusters are
  clean local deferrals, not unresolved remote submissions. No duplicates.
- `model_errors: 0` in both drains. `length_limited_responses: 0`.
