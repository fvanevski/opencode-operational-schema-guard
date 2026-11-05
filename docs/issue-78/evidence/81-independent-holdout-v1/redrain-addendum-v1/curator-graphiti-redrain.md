# Corrected re-drain (second post-exit execution) — curator, Graphiti, host state

**Group:** `cur81_holdout_cc5349fc` · **Unit:** `ghdev81-holdout-cc5349fc.service` (unchanged oneshot) · **Packet:** `81-independent-holdout-v1-redrain-addendum`

This addendum records the **second** post-exit execution — the single authorized
corrected re-drain started by the operator (`systemctl --user start
ghdev81-holdout-cc5349fc.service`) after all inference-holding harnesses exited,
with the corrected loopback endpoint (`LOCAL_CURATOR_URL` now carrying
`/v1/chat/completions`; fixed env digest `265a1dbe…`, original `41840c38…`
preserved). It supersedes nothing in the parent packet; the first run's terminal
state (3/3 DEFER, 0 calls, 3 errors, 0 remote writes) remains the record of run 1.

## Timeline (UTC, journal-exact)

| Event | Timestamp |
|---|---|
| Unit start (run 2) | 2026-11-05T00:15:56Z |
| EX admission proven | 2026-11-05T00:16:26Z (30 s admission window, ≤ 900 s) |
| Re-curation decisions | 00:16:27.2 / 00:16:28.0 / 00:16:28.8 |
| Terminal summary | 2026-11-05T00:17:24Z (admission→terminal **58 s**; wall **88.046 s**; CPU 455 ms) |

Run 1 (for reference, unchanged): start 2026-11-04T23:47:45Z → terminal 23:48:15Z
(30 s, all model attempts failed pre-inference, 0 remote writes).

## Model statistics (run 2, journal terminal summary)

`curated=3, deferred=1, skipped=0, approved=2, queued=2, persisted=2,
unresolved=0, model_attempts=3, model_calls=3, model_errors=0, model_ms=2334,
prompt_tokens=6548, completion_tokens=564, reasoning_tokens=0,
usage_reported_calls=3, length_limited_responses=0, status=review_required`

Model: `chat-fast` (non-thinking; no `reasoning_effort` override), loopback
`127.0.0.1:8002/v1/chat/completions` over the NInfer backend. All three
reevaluation flags from run 1 were consumed; every record was genuinely
re-evaluated by the model (3 successful HTTP calls, one per record).

## Record-level terminal states (ReviewStore, revision + audit preserved)

| Cluster (review ID) | Events | Run-2 decision | Terminal state | Rev | Remote episode UUID |
|---|---|---|---|---|---|
| `1fdf0eed…` | 8 | EMIT (`tool-reported test run is a concrete, verifiable result…`) | persisted | 6 | `d4b8fff6-e89f-40c4-a81b-f3c2bf7723a1` |
| `8915afb0…` | 8 | EMIT (`assistant explicitly confirmed a durable implementation behavior…`) | persisted | 6 | `56b75c2c-e2f8-404f-baed-531ef76ce260` |
| `9036df0a…` | 6 | DEFER (`model_assertion_not_source_extract`) | deferred | 3 | none |

Audit trails (all records): `curated→deferred` (run 1, 23:48:15) →
`reevaluate→deferred` (2026-11-05T00:01:14) → `recurated→approved|deferred`
(run 2) → persisted records `submission_unknown→queued→persisted`
(00:16:59.172 / 00:17:24.239). `reevaluate_requested` is `false` on all three
records: **all three flags consumed**.

CandidateQueue: 22 rows — 16 approved (clusters 1+2), 6 deferred (cluster 3);
0 new / 0 reserved / 0 skipped / 0 submission_unknown / 0 queued / 0
persisted row-states. No `submission_unknown` or other incomplete state remains.

## Graphiti durable verification (group-scoped readback, not `add_memory` ACKs)

- **`cur81_holdout_cc5349fc`: 2 episodes** (group-scoped `get_episodes`):
  - `d4b8fff6-e89f-40c4-a81b-f3c2bf7723a1` — name `curated-v1:1fdf0eed…`,
    created 2026-11-05T00:16:29.044Z; content carries the verbatim assertion
    with evidence-class `tool-reported`, kind `test_result`, observed
    2026-11-04T21:45:23.442Z, source ref
    `…:tool:call_65fb90d3952b50de`, scope group/project bound.
  - `56b75c2c-e2f8-404f-baed-531ef76ce260` — name `curated-v1:8915afb0…`,
    created 2026-11-05T00:16:57.793Z; evidence-class `assistant-reported`,
    kind `architecture`, observed 2026-11-04T21:47:11.094Z, source ref
    `…:message:msg_1a887bf73001vdljsbBh16k0UW`.
- **Extracted graph (in-group):** 4 nodes (`node`, `cronparse`, `parse`,
  `isMatch`); 3 edges — `RUNS_TEST_SUITE_FOR` (uuid `6e216e63-…`,
  valid_at 2026-11-04T21:45:23.442Z) and 2× `PART_OF` (uuids `1d0f2dba-…`,
  `48af7b0a-…`, valid_at 2026-11-04T21:47:11.094Z); all `invalid_at` null;
  no supersession edges in group.
- **Source index:** episode content binds the exact source references and scope
  (group/project); local `_episode-index/<uuid>.json` entries and
  `curation-v1` records agree on record→UUID binding. Verified.
- **Reconciliation:** supported read-only `reconcile-only` (EX admission env
  supplied by the canonical wrapper contract): `reconciled_persisted=0,
  unresolved=0, pending_review=false, status=settled`, exit 0.

**No episodes were deleted, rewritten, or superseded in this addendum.** The
`useful=false` verdict on the test-result fact (see `fact-adjudication.md`) is
recorded in the benchmark only; the episode and its receipt are preserved.

## Nonmutation (group-scoped readback, this session)

| Group | Episodes | Baseline (parent packet) | Status |
|---|---|---|---|
| `ghdev_gh_mcp` (production) | 4 (UUIDs/created_at identical) | 4 | unchanged |
| `cur81_dev_ce555621` | 9 | 9 | unchanged |
| `cur81_native_a1f3c9d7` | 12 | 12 | unchanged |
| `cur81_native_8cd61d76` (capture) | 0 | 0 | unchanged |
| `cur80_disposable` / `cur80_qual01` / `cur80_qual02` | 1 / 1 / 1 | 1 / 1 / 1 | unchanged |

## EX lease state

No outstanding **exclusive** drain lease. The shared lock file
(`$XDG_RUNTIME_DIR/openviking-agent.lock`) is held in **shared** mode only by
the interactive OpenCode harness (`flock -s` holder, child `opencode`) — the
expected steady state; a non-blocking shared-mode probe confirmed acquirability.
No lock was released, bypassed, or held by a drain worker; the run-2 drain
released its exclusive lease at terminal 00:17:24Z.

## Post-exit timing (measured, run 2 only)

| Metric | Value | Target | Status |
|---|---|---|---|
| Admission→terminal (run 2) | 58 s | ≤ 900 s | PASS |
| Per-record admission→persisted | 33.2 s / 58.2 s (p50 33172 ms, p95 58239 ms) | ≤ 900 s | PASS |
| Wall (run 2) | 88.046 s | — | reported |

Run 1's 30 s window (a failed pre-inference admission window) is **not** used
as persistence latency. Model call latency total 2334 ms over 3 calls
(2334/3 ≈ 778 ms avg; per-call values not separately attributable from the
terminal summary, so p50/p95 of model_ms are reported as count 0, not guessed).
