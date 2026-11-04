# Issue #81 — host identity and state (post-exit campaign)

Read-only observations; no production service, gate config, credential, or production Graphiti group was modified.

## Post-exit admission (disposable unit, now removed)

- `ghdev-curator81-qual.{path,service}` (user systemd, created by the first campaign) drove the post-exit drain: EX admission proven at 2026-11-04 07:06:14PST via the accepted `post-exit-drain.py` + canonical gate (`/home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py`, config `~/.config/openviking/commit-gate.toml` — both unmodified), three admitted drain runs, terminal `settled` at 07:11:43PST (service exit 0).
- After the terminal run, one path-triggered wake (07:21:28PST, caused by a read-only CLI status touch of the watched state dir) re-entered the pre-admission bounded lock wait while the next Build harness held the shared gate lease. With `queue_new=0` and `unresolved=0` it was safe to stop.
- Cleanup (only cur81 units): `stop` service (SIGTERM during pre-admission lock wait), `stop`+`disable` path, unit files removed from `~/.config/systemd/user/`, `daemon-reload`. Both units now report `not-found`; no drain processes remain.

## State preserved for inspection

- `/home/filip/.local/state/ghdev-graphiti-issue81/` (0700): 0600 `curator.env`, 0700 `qual81/{candidate-events-v1,curation-v1}/cur81_dev_ce555621` (13 review records, `_episode-index`), `usage.jsonl` (13 entries). Retained — settled extractions stay inspectable; nothing deleted to make cleanup green.

## Production services (unchanged, post-run)

- `mcp-mux.service` active (Graphiti MCP :8766, FalkorDB); `litellm-proxy.service` active (:8002); `ninfer-serve` running (:8001, Qwen3.8-27B NVFP4). No unit, config, or credential changed by this campaign.
- Shared `mcp-mux.service` and OpenViking admission configuration untouched.

## Graphiti groups

- Production `ghdev_gh_mcp`: **4 episodes** (`user_decision:961923ff…`, `git-source:a7877b6c…`, `git-source:49564525…`, `git-source:072b6d07…`), last updated `2026-11-03T01:47:36.450687+00:00` — identical to the pre-campaign baseline (re-verified after the post-exit drain).
- Disposable `cur81_dev_ce555621`: 9 episodes, all `curated-v1:<review-id>` with store-matching UUIDs, all `verified_readback` (see `graphiti-readback-v2.json`). Zero duplicates.

## EX gate topology (unchanged)

- Lock `/run/user/1000/openviking-agent.lock`; quiet grace 30s; process names include `opencode`. While any Build harness is active the exclusive drain lock is not acquirable (verified `flock -x -n` → blocked); that is the accepted pre-exit exclusion, not a defect.
