# Issue #80 closure-v1 — final post-exit terminal drain receipt

Scope: the **automatic** post-exit admission and drain of the disposable
`ghdev-curator80-qual02.{service,path}`, observed after the operator exited the
interactive OpenCode harness. This resolves the single pending step declared in
`activation-postexit.md` (the genuine FIRST `add_memory` for `ca268f5d...`).
Historical pre-exit observations in `activation-postexit.md` are preserved
unchanged; this file records the post-exit continuation only.

No manual Python drain was invoked. The re-armed user-systemd path/service
performed the admitted drain under the canonical EX gate after harness exit.

## Terminal service state (systemd readback)

- Unit: `ghdev-curator80-qual02.service`
- `ActiveState=inactive`, `SubState=dead`, `MainPID=0`
- `Result=success`
- `NRestarts=32`
- Invocation `241f3669fdf643e7ac9c74b6840453d7`,
  `Process 3040417 (code=exited, status=0/SUCCESS)`,
  `Mem peak: 78.4M`, `CPU: 313ms`.

`ghdev-curator80-qual02.path` remained `active (waiting)` / `enabled`
(re-armed, watching the qual02 candidate dir) through the drain.

## Post-exit admission + drain timeline (PST, from
`journalctl --user -u ghdev-curator80-qual02.service`)

Pre-exit restart-loop attempts (counters 28..32) each failed
`FAIL_CLOSED: interactive harness active/unknown: cannot drain` (exit 2) while
the previous harness held the shared EX lease. After the operator exited:

| time | event |
| --- | --- |
| 16:42:57 | restart counter 32 → service started |
| 16:43:28 | `EX admission proven; invoking candidate drain with lock retained` (PID 3040417) |
| 16:43:48 | drain JSON (child PID 3043194): `{"curated":0,"deferred":0,"skipped":0,"approved":0,"queued":1,"persisted":1,"unresolved":0,"model_calls":0,"model_ms":0,"status":"settled"}` |
| 16:43:48 | `Finished Admitted post-exit candidate curator.` → service `inactive (dead)`, `Result=success` |

The admitted drain advanced `ca268f5d...` `approved` (rev 4) →
`submission_unknown` → `queued` → `persisted` (rev 7), with the FIRST genuine
`add_memory` and a positive group-scoped `get_episodes` readback. `model_calls=0`
(the fact was the operator-qualification seed, not an LLM call), `unresolved=0`,
`status=settled` — a terminal, no-blind-replay outcome.

## Shared Graphiti worker (mcp-mux.service) processing

The shared `mcp-mux.service` (Graphiti worker, PID 1657) was **not** stopped.
Its journal over the drain window shows the single extraction:

- 16:43:28 `services.queue_service - Starting episode queue worker for group_id: cur80_qual02`
- 16:43:28 `services.queue_service - Processing episode None for group cur80_qual02`
- 16:43:46 `graphiti_core.graphiti - Completed add_episode in 18688.51137161255 ms`
- 16:43:46 `services.queue_service - Successfully processed episode None for group cur80_qual02`

No further `cur80_qual02` queue-processing events after 16:43:48 (only later
read-only `get_episodes` calls from this Build session). No pending extraction.

## Remote Graphiti episode (positive group-scoped readback)

Group-scoped `get_episodes(group_ids=cur80_qual02, max_episodes=100)` returned
**exactly one** episode:

- UUID `0e04a359-2ae4-4b37-890e-3e34c40f3fce`
- name `curated-v1:ca268f5dd77dee45d74494a604985fcf2c81fcad764f2d62ca66c49f4e764828`
- group `cur80_qual02`
- content: `Fact 1: node --test prime.test.js exited 0: 5 pass, 0 fail` with
  evidence class `tool-reported`, kind `test_result`, temporal `observed`,
  observed `2026-11-03T23:33:37.917Z`, source ref
  `opencode:ses_e5c3d3bb3ffedqoZCz10Lc3ZOU:tool:call_235bb6826d6f6d0f`,
  scope group `cur80_qual02`, project `issue80-qual02-ws-fresh`.
- `created_at 2026-11-04T00:43:28.229641+00:00`, `source=text`,
  `source_description=source-grounded curator | ca268f5d...`.

## Durable review record + source index

- Review `ca268f5d...`: `state=persisted`, `revision=7`,
  `decision=EMIT`, `remote_episode_uuid=0e04a359-2ae4-4b37-890e-3e34c40f3fce`,
  `origin=qualification_operator_seed`,
  `never_submitted_evidence` retained (SHA-256
  `90c5e5693a7c375cfff2c94eaad2a3a3870cbd487fe276ffcfa0754db4bb3362`).
  Audit trail preserved: `qualification_operator_seed→deferred`,
  `edit-and-approve→approved`, `state→submission_unknown` (premature 15:34:05),
  `operator_attested_never_submitted→approved` (16:26:43 reconciliation),
  `state→submission_unknown`→`state→queued`→`state→persisted` (16:43:28/48).
- `_episode-index/0e04a359-2ae4-4b37-890e-3e34c40f3fce.json` resolves to the same
  review: `{"id":"ca268f5d...","remote_episode_uuid":"0e04a359-2ae4-4b37-890e-3e34c40f3fce"}`.
- Native source attribution and group/project/workspace boundaries preserved
  (group `cur80_qual02`, project `issue80-qual02-ws-fresh`, workspace
  `/tmp/opencode/issue80-qual02-ws-fresh`).

## Headless CLI status/list agreement

`curator-cli.mjs status` (exit 0): `counts={persisted:1}`, `review_count=1`,
candidate queue `new/reserved/deferred/skipped/submission_unknown/queued/persisted`
all 0 (4 approved source events consumed by the persisted review).
`curator-cli.mjs list` (exit 0): 1 item, `ca268f5d...` `state=persisted`,
`revision=7`, `remote_episode_uuid=0e04a359-...`, `failure_code=null`.
The headless CLI agrees with the browser (see `gui-acceptance-final.md`).

## Real-graph readback (graph-readback.mjs)

`graph-readback.mjs --group cur80_qual02 --cluster ca268f5d... --endpoint
http://127.0.0.1:8766/mcp` → `status=verified_readback` (exit 0),
**node_count=2, edge_count=1, linked_edge_count=1, unlinked_edge_count=0**:

- entity `node` (`a54a5480-8005-4117-9b4f-2d45155f21dc`, group `cur80_qual02`)
- entity `prime.test.js` (`91c2b872-db1a-4d81-a335-09adf4b4ff15`, group `cur80_qual02`)
- relationship edge `3e5b3262-24b4-4e1e-9847-622f70ff2651`
  (`node` → `prime.test.js`): "node executed a test on prime.test.js using the
  --test option, and the command exited with code 0 after 5 tests passed and 0
  tests failed." `valid_at 2026-11-03T23:33:37.917000+00:00`, `invalid_at=null`.

Evidence class: **real extracted Graphiti graph readback** (bounded positive
`get_episode_entities` window), not a display-only association and not an
independent fact-verification. Distinguishes real extraction from a display
association: the entities/edge are returned by Graphiti for the confirmed
episode, separately from the portal's source/proposal/episode association
layer.

## No duplicate submission / no unresolved work

- Exactly one remote episode in `cur80_qual02` (the FIRST and only
  `add_memory`); no duplicate episode identity.
- `unresolved=0` in the terminal drain JSON; candidate queue has no
  new/reserved/queued/submission_unknown work.
- No `submission_unknown` or `queued` review remains.
- No EX obligation pending: the drain service is terminal and released its
  lease; the shared `mcp-mux` worker has no pending `cur80_qual02` extraction.
