# Issue #81 — Graphiti terminal readback (81-post-exit-terminal-v1)

Read-only `get_episodes` / `get_episode_entities` against the live MCP endpoint
`http://127.0.0.1:8766/mcp` (falkordb). Episode UUIDs are identifiers (not private source text).

## Episode counts (exact, UUID-bound)

| Group | Episodes | Nodes | Edges | Note |
|---|---|---|---|---|
| `cur81_native_a1f3c9d7` (dev drain) | **12** | 17 | 29 | terminal `settled` |
| `cur81_native_holdout_a1f3c9` (staged blind capture) | **0** | 0 | 0 | capture-only, not drained |
| `cur81_holdout_4c3ab514` (disposable holdout drain) | **1** | 2 | 1 | `review_required` |
| `ghdev_gh_mcp` (production) | **4** | — | — | baseline intact (non-mutation) |
| `cur81_dev_ce555621` (prior dev) | **9** | — | — | intact (non-mutation) |

## Dev episode UUIDs (12) — each `curated-v1:<cluster>` with native cited source ref

| Episode UUID | Cluster (name suffix) | Evidence class |
|---|---|---|
| `4a7e63bf-0edb-4c92-8d2b-3fe3a37af078` | e5d28f28… | tool-reported |
| `a76d3514-73d1-4184-8bde-d7ef69643ee3` | 980f6d40… | user-stated |
| `4e387616-c61b-4d6b-be94-f21d830457d1` | 97318398… | user-stated |
| `7b2ae406-2077-40a2-b7d1-50c838d3385c` | 5c75339f… | tool-reported |
| `99d18875-2726-4279-a0a5-0d8154c04367` | 4cb77ea5… | assistant-reported |
| `a872a79b-a1f4-4c39-bd41-6e458e682556` | 22b99211… | tool-reported |
| `cc9cd18e-b2d0-4f94-95bf-4e295aeb73a2` | 15e9a71c… | user-stated |
| `db4754ef-ec0c-4b86-8449-86b37b7a4233` | b3499160… | user-stated |
| `f309ac3f-3f73-4e5c-98f0-d6e21eb2b809` | 72d77b15… | assistant-reported |
| `1d27eafa-3bb4-45d7-b6d4-97e9d12d5bd1` | 54da7785… | user-stated |
| `ae14f517-7e3b-40e4-bce9-6b664bbd01cc` | 414707d7… | tool-reported |
| `8fd44cf2-82e6-4854-b76f-49d0d6370b73` | 3c03a521… | user-stated |

## Holdout drain episode (1)

| Episode UUID | Cluster | Evidence class |
|---|---|---|
| `69fde784-17ea-4fd9-b484-30978cc0e5fd` | 2cb31461… | assistant-reported |

## Extracted graph (dev, 17 nodes / 29 edges)

- **Nodes (17):** `settle-to-self rule`, `transition function`, `node`, `fsm.test.js`, `fsm81`, `fsm.js`,
  `fsm.js log entry function`, `fsm81 failed state`, `fsm81 done event`, `fsm81 terminal done state`,
  `Option C`, `content-addressed manifest`, `rmSync`, `tmpDir`, `lastLogLine`, `drain tool`, `writeBundleManifest`.
- **Named relationships (29 edges), e.g.:** `IS_SUPERSEDED_BY`, `RUNS_TEST_FILE`, `IMPORTED_FROM`, `REQUIRES`,
  `EXPORTED_FROM`, `EXPORTED_ALONGSIDE`, `EXPORTS`, `HAS_STATE`, `HAS_EVENT`, `MUST_GAIN_EVENT`, `SETTLES_TO`,
  `IS_A`, `EXECUTED_COMMAND_ON`, `INCLUDES_TEST_CASE_ABOUT`, `SETTLES_TO_DONE_ON`, `DELETES`, `EXECUTES`,
  `REQUIRES_EXPORT_NAME`, `REQUIRES_EXPORT_FROM`, `CALLS`, `REQUIRES_EXPORT_OF`, `MUST_EXPORT`,
  `VALIDATES_BEHAVIOR_OF`, `EXECUTES_TEST_FILE`, `TESTS_BEHAVIOR_OF`.
- **Holdout graph (2 nodes / 1 edge):** nodes `prime.js`, `isPrime`; edge `EXPORTS`
  ("prime.js exports isPrime(n)…").

## Source-to-episode-to-graph chain (verified)

- All 12 dev + 1 holdout episode cited native source refs (`opencode:<session>:…`) were verified **present** in the
  review-store candidate events (96 distinct dev source refs; 12/12 dev + 1/1 holdout episode refs matched,
  including span-qualified refs).
- Every persisted episode maps 1:1 to a curation record (EMIT) and an episode-index entry (remote UUID).
- The 13th dev curation record (`f1a8c418…`) is EMIT-decided but **cleanly deferred** (`LOCAL_REPEATED_ASSERTION`),
  so it has **no** remote episode UUID — consistent with the 12-episode count. Not an ambiguous write.

**No duplicates, no ambiguous submissions, no unaccounted remote states.** Production `ghdev_gh_mcp` (4) and
prior `cur81_dev_ce555621` (9) are unchanged.
