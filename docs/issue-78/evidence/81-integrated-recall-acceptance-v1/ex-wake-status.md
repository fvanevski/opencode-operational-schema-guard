# EX / wake / queue / terminal-receipt state (read-only inspection)

Inspected 2026-11-05 20:10–21:30 PST (host `garion`, user `filip`), during the
active Build campaign. All observations are read-only; no unit, queue row,
graph, or remote episode was mutated.

## Services

| Unit / service | State | Notes |
|---|---|---|
| `openviking-commit-gate.service` | active (running) | EX admission gate, 127.0.0.1:1933 → backend 1934; `quiet_grace_seconds=30`, `process_names` includes `opencode` |
| `litellm-proxy.service` | active (running) | 127.0.0.1:8002 (alias route for Graphiti extraction) |
| NInfer (`ninfer-serve`) | listening 127.0.0.1:8001 | `ninfer_requests_running=0`, `ninfer_requests_waiting=0` at inspection |
| Graphiti MCP | listening 127.0.0.1:8766 | python pid 45775; MCP session + tools callable (read-only calls used) |
| FalkorDB | listening :6380/:6382 | `redis-cli -p 6382 GRAPH.QUERY` route |
| `ghdev-curator-prod.path` | active (running) | watches `candidate-events-v1/development-knowledge` + `curation-v1/development-knowledge` |
| `ghdev-curator-prod.service` | oneshot; `activating` with 30 s `Restart=on-failure` polling | `FAIL_CLOSED: shared agent/gate lease held; bounded wait exhausted` (exit 2) on every attempt while the interactive Build (opencode) holds the agent lease |
| `ghdev-cur81-holdout-4c3ab514.*` | waiting / dead | disposable Issue #81 sealed-holdout unit (historical) |
| `ghdev-curator81t-qual.*` | waiting / dead | issue81 terminal81 disposable unit (historical) |

Interpretation: the production post-exit curator is in its **correct
fail-closed steady state** while an interactive agent is active. The gate's
EX admission (agent lease + scheduler idle + 30 s grace) is the accepted
topology from the cutover; the unit is expected to drain on the next wake
after the interactive harness exits. No demonstrated host-local
wake/config binding defect required correction within the authorized
reversible scope, so the unit topology was left unchanged.

## Queues (development-knowledge)

- `candidate-events-v1/development-knowledge`: 1092 records — 878 approved,
  153 deferred, **61 new** (pending review by the post-exit curator).
- `curation-v1/development-knowledge`: 153 records — **116 persisted**,
  37 deferred.

## Terminal receipts (read-only readback)

- `get_episodes(group_ids=['development-knowledge'])`: 116 episodes,
  named `curated-v1:<curation-record-id>`, in 1:1 correspondence with the
  116 persisted curation records. No duplicate episodes observed.
- FalkorDB `development-knowledge` graph: 223 nodes (graph version 681).
- Legacy `ghdev_gh_mcp` and `graphiti_live` graphs: 0 nodes (retired
  namespace per cutover decision; no migration obligation).
- Example authenticated chain for the probe-injected fact:
  - curation record `f97780f5e1f9408e3874daa0d99eb4a0445709844094e11aff6913bf5ad105b`
    (state `persisted`, group `development-knowledge`, project `gh_mcp`,
    workspace `/workspace/mcp_servers/gh_mcp`)
  - remote episode UUID `877a5de5-d3fe-4540-93f4-30d5b9182f8c`
    (present in the remote graph, name `curated-v1:f97780f5…`)
  - source index `_episode-index/877a5de5-d3fe-4540-93f4-30d5b9182f8c.json`
    (maps episode → record; resolver-verified)
  - native source reference `opencode:ses_e5161e002ffeUFAxdC5lo1zi1m:message:msg_1ae9e73a20015ET1Y2L1znvlKE`

## Post-exit operator prerequisites (prepared, bounded, read-only)

1. The 61 `new` candidate events are staged and reviewable; the path unit is
   armed and the 30 s oneshot retry keeps the wake alive.
2. After the interactive Build exits, the existing unit's next retry admits
   EX (agent lease released) and drains the queue; no new scheduler, model
   server, or Graphiti instance is needed.
3. Minimal existing operator command (no new controller):
   `systemctl --user start ghdev-curator-prod.service`
   (or simply allow the existing 30 s auto-retry), then read back:
   `journalctl --user -u ghdev-curator-prod.service -n 50`,
   curation state transitions in `curation-v1/development-knowledge`,
   and `get_episodes` / `_episode-index` growth for terminal receipts.
4. Identities to verify after exit: 61 `new` candidate events → review
   states; new terminal episode UUIDs in `development-knowledge`;
   `_episode-index` entries for any newly persisted facts; post-exit
   admission→terminal-readback duration vs the frozen 900 s target.
