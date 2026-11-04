# Issue #81 — host identity (read-only observations)

All observations are read-only; no production service, gate config, credential, or Graphiti production group was modified by this campaign.

## Runtime

- OpenCode: `v2.2.5` (stock shim at `/home/filip/.opencode/bin/opencode`).
- Host: Linux user `filip` (uid 1000); XDG state under `/home/filip/.local/state`.

## Model / inference stack (unchanged by campaign)

- `ninfer-serve` (plain process, pid 2298046 at observation time): `./build/rtx5090-release/apps/ninfer-serve` serving `Qwen3.8-27B-swift15-uncensored-ajgazin-nvfp4full-dflash2-NInfer-v3` (NVFP4, RTX 5090, dflash2 spec, k8v4 KV) on `127.0.0.1:8001`, model-id `chat`.
- `litellm-proxy.service` (user systemd, active): `127.0.0.1:8002`, exposes `chat`, `chat-fast`, `chat-review`, `chat-audit`.
- Campaign curation binding: `LOCAL_CURATOR_MODEL=chat-fast` via private 0600 `EnvironmentFile=/home/filip/.local/state/ghdev-graphiti-issue81/curator.env` (values copied from the accepted #80 env; key not printed anywhere in this packet).

## Graphiti

- Endpoint: `http://127.0.0.1:8766/mcp` (shared `mcp-mux.service`, active; FalkorDB backend).
- Production group: `ghdev_gh_mcp` — invariant control readback: **4 episodes** (`user_decision:961923ff…`, `git-source:a7877b6c…`, `git-source:49564525…`, `git-source:072b6d07…`), last updated `2026-11-03T01:47:36.450687+00:00` — identical to the pre-campaign baseline.
- Disposable campaign group: `cur81_dev_ce555621` — 0 episodes pre-exit (expected; see `curator-results.json`).

## V2 plugins (configured source; loaded bytes per session)

Configured from `/home/filip/.config/opencode/opencode.json` (7 entries):
`operational-schema-v2`, `openviking-v2`, `rtk`, `compaction-reasoning-trim`, `superpowers` (git), `system-message-compat`, and `ghdev-graphiti-memory` (enabled, `capture=true`, production group `ghdev_gh_mcp`, endpoint `:8766/mcp`, stateDir `/home/filip/.local/state/ghdev-graphiti` — **untouched** by this campaign).

Entry-point SHA-256 prefixes (identity only, not acceptance hashes):
operational-schema-v2 `53c2a8c64947810c`, openviking-v2 `410129383ca7d489`, rtk `7cfa506706d27436`, compaction-reasoning-trim `67e6c8737f394184`, system-message-compat `ba14275b008aa799`, ghdev-graphiti-memory `ba7f657b2d8b5b66` (each `index.mjs`).

## Canonical EX gate (unchanged)

- Source: `/home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py` (0600, 87461 bytes, dated Nov 2 14:44).
- Config: `/home/filip/.config/openviking/commit-gate.toml` — lock `$XDG_RUNTIME_DIR/openviking-agent.lock`, metrics `:8001`/`:8002` (auto-detect), `quiet_grace_seconds=30.0`, `process_names=["codex","opencode","agy","opencode-desktop"]`, production Graphiti group `ghdev_gh_mcp`, validator pinned by SHA-256.
- Lease topology at pre-exit observation: exclusive `flock` on `/run/user/1000/openviking-agent.lock` **not acquirable** (`flock -x -n` → blocked) while the active Build harness runs; holder pid 4150156 = `flock -s --close … openviking_commit_gate.py …` (shared lease on behalf of the active opencode process).

## Disposable wake structure (campaign-created, user systemd)

- `ghdev-curator81-qual.path` (enabled, active): `PathModified` on `/home/filip/.local/state/ghdev-graphiti-issue81/qual81/{candidate-events-v1,curation-v1}/cur81_dev_ce555621` → triggers `ghdev-curator81-qual.service`.
- `ghdev-curator81-qual.service` (oneshot, `Restart=on-failure`, `RestartSec=30s`, `NoNewPrivileges`, `UMask=0077`): runs the accepted `post-exit-drain.py` with the accepted gate source/config, the instrumented drain CLI `/tmp/opencode/issue81-qual/cur81/usage-drain-cli.mjs`, group `cur81_dev_ce555621`, state dir `/home/filip/.local/state/ghdev-graphiti-issue81/qual81`, endpoint `http://127.0.0.1:8766/mcp`, `--max-seconds 600 --lock-timeout 120`.
- Pre-exit behavior verified: bounded wait → `FAIL_CLOSED: shared agent/gate lease held; bounded wait exhausted` (exit 2), zero model calls, zero cur81 episodes; systemd restart loop armed.
- State root: `/home/filip/.local/state/ghdev-graphiti-issue81/` (0700) with 0600 `curator.env` and 0700 `qual81/{candidate-events-v1,curation-v1}`.

## Preserved production service state (post-run)

- `mcp-mux.service` active; `litellm-proxy.service` active; `ninfer-serve` running on `:8001`.
- Shared `mcp-mux.service` and OpenViking admission configuration: not touched.
- No production Graphiti group mutation; no gate/config edits; no credential changes.
