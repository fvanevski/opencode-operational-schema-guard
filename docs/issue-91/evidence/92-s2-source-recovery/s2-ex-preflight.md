# Issue #92 S2 — EX admission preflight (in-harness, read-only)

## Canonical EX holder (existing, not bypassed)
- Gate source: `/home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py`
  - Loads with `Config`, `Worker`, `parse_vllm_metrics` present (required symbols verified).
- Gate config: `/home/filip/.config/openviking/commit-gate.toml` (complete):
  - `lock_file=/run/user/1000/openviking-agent.lock` (exists; parent writable)
  - `metrics_url=http://127.0.0.1:8001/metrics` (scheduler)
  - `process_names=(codex, opencode, agy, opencode-desktop)`
  - `quiet_grace_seconds=30.0`
  - `database=/home/filip/.local/state/openviking-commit-gate/queue.sqlite3`
- Live production-drain wrapper currently holds the EX flock
  (`flock -s --close /run/user/1000/openviking-agent.lock ... admission_exec.py ... opencode`),
  serializing the interactive harness. Read-only peek: **EX flock HELD** while the
  interactive `opencode` harness is active.

## Scheduler (read-only)
- `ninfer_requests_running=0`, `ninfer_requests_waiting=0` (idle) at preflight.

## Model + Graphiti reconciliation
- Model serving `http://127.0.0.1:8002/v1/chat/completions` (litellm) exposes
  aliases `chat`, `chat-fast`, `chat-review`, `chat-audit`, `graphiti-extract`.
  The previously qualified `chat-fast` default for discovery+utility is supported;
  no unsupported profile is attempted and no fallback is required. No tuning file,
  no prompt/temperature/model sweep.
- Graphiti MCP `http://127.0.0.1:8766/mcp` is reachable (session handshake required;
  MCP `get_episodes`/`add_memory` are the terminal readback/write paths).

## Disposable fixtures (fresh, isolated; no production/historical mutation)
- Fresh group: `graphiti-adr92-s2-source-recovery` (empty before seeding).
- Fresh state root: `/tmp/opencode/issue92-s2/state/s2` (mode 0700; staged event
  files 0600).
- Seeded with the full 24 eligible source-cluster roster (24 new / 0 drops /
  0 deferred) preserving original per-event project/workspace/source evidence and
  adopting the fresh group identity.
- Private queue/ReviewStore/call root: the state root above (0700/0600).
- Once-only launcher marker: `/tmp/opencode/issue92-s2/.s2-ran` (new; no historical
  B3/S1 marker re-armed).

## Admission proof required for the post-exit run (launcher enforces)
The launcher (`s2-ex-launcher.py`) proves, under the canonical EX flock:
interactive harness exit, 30-second quiet grace, scheduler idle (running=0,
waiting=0), no unresolved canonical Graphiti work, and production-drain
serialization — before any model/Graphiti write. The `GHDEV_MEMORY_POST_EXIT_LEASE=admitted`
env token alone is **not** admission; it is set only after that proof.

## In-harness no-inference guarantee
No model call or Graphiti write was executed in the interactive session. The
seeding, freeze, and preflight are CPU/read-only. The single inference drain runs
only after the harness exits, under the launcher's EX admission.
