# Issue #80 closure-v1 — activation (event-wake) + post-exit drain receipt

Scope: disposable systemd `ghdev-curator80-qual02.{service,path}` **only**.
No standing production unit, no second scheduler, no canonical gate change.
The shared `mcp-mux.service` Graphiti worker (PID 1657) is NOT stopped.

## Disposable instantiation (host)

- `ghdev-curator80-qual02.path` — `PathModified=` on the qual02 candidate dir;
  re-armed after the never-submitted adjudication.
- `ghdev-curator80-qual02.service` — oneshot `post-exit-drain.py` wrapper:
  `--cli docs/issue-78/v2-curator/curator-cli.mjs --group cur80_qual02
  --state-dir .../closure80-qual02 --endpoint http://127.0.0.1:8766/mcp
  --max-seconds 600 --lock-timeout 120`; env from private `curator.env`
  (0600; `LOCAL_CURATOR_*` keys, values never staged).
- Rendered unit copies: `closure80-scratch/units02/ghdev-curator80-qual02.{service,path}`.
- The wrapper passes `GHDEV_MEMORY_POST_EXIT_LEASE=admitted` to the child
  **only inside the wrapper** (accepted `post-exit-drain.py`).

## Drain / admission timeline (PST, from `journalctl --user -u ghdev-curator80-qual02.service`)

| time | event |
| --- | --- |
| 15:36:27 | path wake fired → service started (first drain attempt) |
| 15:38:27 | `FAIL_CLOSED: shared agent/gate lease held; bounded wait exhausted` (exit 2; 120s lock-timeout) |
| 15:40:57 | `FAIL_CLOSED: shared agent/gate lease held; bounded wait exhausted` (exit 2, restart counter 2) |
| 15:42:45 | `EX admission proven; invoking candidate drain with lock retained` → drain JSON `{"curated":0,"deferred":0,"skipped":0,"approved":0,"queued":0,"persisted":0,"unresolved":1,"model_calls":0,"model_ms":0,"status":"unresolved"}` then `UNRESOLVED: retaining EX admission for late positive Graphiti reconciliation; shared MCP worker remains running.` |
| 15:43:30 … | `reconcile-only` loop every ~15 s: `{"mode":"reconcile-only","group":"cur80_qual02","reconciled_persisted":0,"unresolved":1,"review_count":1,"queue_new":0,"queue_reserved":0,"pending_review":true,"status":"unresolved"}` |

At 15:42:45 the record `ca268f5d...` was still `submission_unknown` (rev 3),
so the admitted drain in reconcile-only mode had no positive Graphiti
readback to settle it; it retained the EX lease (fail-closed, no blind
replay, no model call, `model_calls=0`).

## Controlled disposable-service shutdown + never-submitted adjudication

To run the offline never-submitted adjudication the disposable service+path
were stopped and the path disabled, the adjudication applied (rev 3
`submission_unknown` → rev 4 `approved`, `RECOVERED_NEVER_SUBMITTED`), then
the path was re-enabled+started and the candidate dir touched. The service
then re-entered its 30 s restart loop:

| time | event |
| --- | --- |
| 16:26:50 | `FAIL_CLOSED: interactive harness active/unknown: cannot drain` (exit 2) |
| 16:27:20 | restart counter 1 → same `FAIL_CLOSED: interactive harness active/unknown: cannot drain` |
| 16:27:50 … 16:29:51 | 30 s restart loop continues (counters 2..6), each `FAIL_CLOSED: interactive harness active/unknown: cannot drain` |

While the current interactive OpenCode harness is alive the gate excludes the
worker (`AUTOMATIC_LLM_WHILE_INTERACTIVE=forbidden` honored), so no inference
admission occurs pre-exit.

## Current unit state (at packet time)

- `ghdev-curator80-qual02.service`: `activating` (30 s restart loop,
  each attempt FAIL_CLOSED because the interactive harness holds the EX lease)
- `ghdev-curator80-qual02.path`: `active` / `enabled` (re-armed, watching the
  qual02 candidate dir)
- EX lock file: `/run/user/1000/openviking-agent.lock` (0 bytes, 0600) held by
  the interactive harness admission wrapper; released on TUI exit.

## Post-exit continuation (operator, after harness exit — from a separate terminal)

After the interactive harness exits, the next automatic path/service retry
acquires the canonical EX lock (genuine automatic post-exit admission), runs
the admitted drain, and `promoteOne` performs the **GENUINE FIRST**
`add_memory` for `ca268f5d...` (now `approved` rev 4, `remote_episode_uuid`
null) → `queued` → `persisted` via `get_episodes` readback, OR retains EX in
`reconcile_late` if the extraction is nonterminal within `max-seconds 600`.
Observation commands (see `continuation-qual02.json`):

```
journalctl --user -u ghdev-curator80-qual02.service --no-pager
systemctl --user status ghdev-curator80-qual02.service
node docs/issue-78/v2-curator/curator-cli.mjs status --group cur80_qual02 \
  --state-dir /home/filip/.local/state/ghdev-graphiti-issue80/closure80-qual02 \
  --endpoint http://127.0.0.1:8766/mcp
```

Must-not: no manual Python drain; do NOT stop the shared `mcp-mux.service`
Graphiti worker; do NOT restart an OpenCode harness before the service
reaches terminal state; do NOT mutate the canonical OpenViking gate.
