# Host evidence — Issue #92 A1–A3 first campaign

## Shared inference lease / EX gate (preserved, not bypassed)
- Installed post-exit drain wrapper:
  `/home/filip/.config/opencode/plugins/ghdev-graphiti-memory/docs/issue-75/v2-candidate/post-exit-drain.py`
  (live process pid 861100 watching production `development-knowledge`).
- Gate source: `/home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py`
- Gate config: `/home/filip/.config/openviking/commit-gate.toml`
  (`lock_file=$XDG_RUNTIME_DIR/openviking-agent.lock`,
  `quiet_grace_seconds=30.0`, metrics from ninfer 8001 / litellm 8002 fallback,
  `process_names=[codex, opencode, agy, opencode-desktop]`).
- Admission: the wrapper acquires the canonical EX flock, verifies
  (a) no active harness process, (b) no unresolved canonical Graphiti work,
  (c) scheduler idle (running=0, waiting=0), then a 30s quiet grace, re-checks,
  and sets `GHDEV_MEMORY_POST_EXIT_LEASE=admitted` for the child drain.
- This interactive OpenCode harness OWNS the shared lease while active; therefore
  NO model-backed drain or Graphiti extraction was executed in-harness.
  The drain gate fail-closes while a harness process is active.

## Disposable fixture groups (no production mutation)
- Valid named fixture groups (verified against
  `docs/issue-78/fixture-groups.mjs` `parseFixtureGroup`):
  - `graphiti-curator-utility-development-r01` (domain `curator-utility`,
    purpose `development`, run 1)
  - `graphiti-curator-utility-development-r02` (run 2)
  - `graphiti-curator-utility-holdout-r03` (purpose `holdout`, run 3)
  - `graphiti-curator-utility-holdout-r04` (run 4)
- Separate disposable state roots per arm
  (`/tmp/opencode/issue92-a1-a3/state/{base-dev,cand-dev,base-holdout,cand-holdout}`).
- NO writes to active production `development-knowledge`; no overwrite/replay of
  historical episodes; no relabel of existing remote groups/episodes.
- Production curation state
  (`/home/filip/.local/state/ghdev-graphiti/curation-v1/development-knowledge`)
  read-only in this campaign (last updated 2026-11-07, unchanged).

## Seeding (CPU-only, in-harness; no model/Graphiti calls)
- All four arms seeded with the frozen corpus events via `CandidateQueue.stage`
  (exact identity contract: group-specific `event_id`, `cluster_key`,
  `source_strength=native-id`, clean source handle with the
  ` (live capture group ...)` annotation stripped):
  - base-dev r01: 24/24 cron events
  - cand-dev r02: 24/24 cron events
  - base-holdout r03: 20/20 gh_mcp events
  - cand-holdout r04: 20/20 gh_mcp events
- `curator-cli.mjs validate-config` → `VALID_CURATOR_MODEL_OPTIONS` (chat-fast
  default behavior, no reasoning override). `status` confirms 20/24 `new`
  events per arm and correct fixture description.

## Graphiti terminal evidence (post-exit, pending)
- `GRAPHITI_TERMINAL_EVIDENCE=none_yet` (disposable episode UUID + group +
  source-index readback produced by the post-exit operator action; a queued ACK
  is not a persisted fact).
- No-side-effect assertion (to be confirmed post-exit): each arm's remote
  readback shows episodes only in its own fixture group; production
  `development-knowledge` episode count unchanged.

## No-side-effect / rollback
- All temporary state is under `/tmp/opencode/issue92-a1-a3/` (disposable).
- No timers, service overrides, or scratch config were left modified.
  Qwen/embedding services (ninfer 8001, litellm 8002, Graphiti MCP 8766)
  were not stopped/restarted.
