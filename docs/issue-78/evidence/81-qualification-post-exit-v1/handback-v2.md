# Issue #81 — post-exit terminal handback

## Result

`PASS_READY_FOR_RATIFICATION` — the post-exit continuation of the first qualification campaign completed: canonical EX admission was proven automatically after harness exit, the real local model curated the staged development cohort, all model EMITs persisted to the disposable Graphiti group with verified source-index readback, the updated evaluator regressed cleanly at the exact source head, and the disposable units were safely removed. Remaining gates are operator ratification (labels/targets) and the later installed fresh-native acceptance, both explicitly out of this campaign.

## Model curation (real, post-exit, admitted under EX)

- Distribution: **EMIT 9 / DEFER 3 / SKIP 1** (13 review records; 33/33 staged candidate events processed; 0 `submission_unknown`).
- Model: `chat-fast` (Qwen3.8-27B NVFP4, litellm :8002 → ninfer :8001) via the accepted #80 `model.mjs` path under the accepted Python EX gate wrapper.
- Usage/latency (per-cluster `usage.jsonl`, 13 entries): tokens **28538 total** (14407 prompt / 14131 completion); model time **51813 ms total**, p50 **3689 ms**, p95 **5885 ms**.
- Multi-event implicit clusters #75 misses: 8-source (#79 host) and 7-source (#79 supplemental) clusters EMITted and persisted; 5-source median and 3-source sum clusters DEFERred by the model (multi-fact split), retained as deferred.
- No invented authority: 0 invalid model/source decisions; every persisted fact carries native `source_refs` resolved to the exact source index; no operator-seeded facts.

## Graphiti readback (disposable group `cur81_dev_ce555621`)

- 9 episodes, names `curated-v1:<review-id>`, UUIDs 1:1 with the review store; zero duplicates; zero unresolved.
- 9/9 records `verified_readback` via the accepted `inspectEpisodeGraph` route (group-scoped, source-index bound): exact native `source_ref` + `evidence_class` per episode; real extracted entities and relationships present in 8/9 (1 single-entity episode); sample: `React Flow —[decided for]-> backlog dependency visualization`.
- Production invariant control: `ghdev_gh_mcp` = 4 episodes, last updated `2026-11-03T01:47:36.450687+00:00` — **identical to the pre-campaign baseline** (re-verified post-drain).

## Updated evaluator at exact source head

- Exact head tested: `a4c9e76a6d60179b2555fb3836207b65f99d174d` (remote `origin/issue/81` == same SHA; clean disposable worktree).
- `node --check` OK; suite **8/9 pass**; the 1 failure is a bench-only test-fixture group mismatch (`issue81_dev` vs the rebind base `cur81_dev`) — verified 9/9 with the aligned fixture (scratch-only); one-line proposed patch in this packet (`source-patch-v2-evaluate-test-fixture.patch`), not pushed.
- Regression guards: frozen dev corpus (SHA `22ae11e6…`) reproduces first-campaign metrics exactly under the updated evaluator (baseline TP3/FP1/TN19/FN34; broad capture TP27/FP6/TN14/FN10); model-observation scoring populates the curator section (9 receipt-bound EMIT facts; `grounded_precision=null` pending operator-adjudicated verdicts, per the new durable-precision gate); sealed holdout (SHA `f904411e…`) unscored and unaltered — guard refusal `unadjudicated_holdout` confirmed.

## Portal/CLI focused real-group checks

- Real cur81 binding (loopback :18823, private 0600 token, real Graphiti endpoint): /api/clusters 13 items (9 persisted / 3 deferred / 1 skipped), 401 without token, state-filtered paging correct.
- Persisted-record preview shows `remote_graph.status=verified_readback` (2 nodes / 1 linked edge) + episode node; deferred-record preview `not_persisted`.
- No-replay lockout: stale-revision discard on a persisted (rev 4) record → **409**.
- `curator-cli.mjs status/list` agree with the store (13 reviews, queue new=0).
- Temporary listener stopped; no temporary host binding remains.

## Production non-mutation proof

- `mcp-mux.service`, `litellm-proxy.service`, `ninfer-serve` running and unmodified; gate source/config byte-identical (read-only use); no credential changes; `ghdev_gh_mcp` 4-episode baseline intact (names + last-updated identical); only `ghdev-curator81-*` units were created and are now removed.

## Remaining acceptance gaps

1. Operator ratification of provisional labels and the `central_proposal` targets, then sealed-holdout scoring (holdout remains sealed).
2. `grounded_precision` / durable-precision measurement requires operator-adjudicated fact verdicts on the 9 proposed facts.
3. Installed fresh-native recall/latency targets (`semantic_recall`, `context_p95`, `post_exit_p95`) remain `UNVERIFIED` until the later installed acceptance campaign (explicitly out of scope here).
4. Central adjudication of the one-line bench fixture patch.

## COMMAND_SHAPE_FRICTION (additions this phase)

- `get_episode_entities` param-shape miss (`episode_uuid` vs the accepted `{group_id, episode_uuids}` route) → resolved via the accepted `inspectEpisodeGraph` helper.
- zsh `${PIPESTATUS[0]}` (bashism) printed 0 in a zsh compound → producer exit captured separately via stderr redirect (rc=1 confirmed for the holdout guard).
- Builder first cut ignored per-case scope overrides (wrong-group case mapped to a shared event) → mirrored `replay` admission in the bench-only builder; no product change.
