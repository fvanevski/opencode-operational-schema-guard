# Issue #70 — Stock-V2 fresh-process evidence (Phase B)

This record documents what was **genuinely exercised in a real, private,
stock OpenCode V2 process** versus what remains **fixture/offline-only**.
It is an evidence packet for Central's independent exact-head review; it does
not establish installed activation, real Graphiti terminality, or
merge/deploy authorization.

## Tested executable identity

- Executable: `/home/filip/.opencode/bin/opencode`
- Version: `v2.2.4` (channel `latest`)
- Confirmed via `opencode --version` on the stock binary. The `opencode` on
  `$PATH` is the OpenViking wrapper shim (`~/.local/lib/openviking-agent-shims/opencode`),
  which is NOT the stock executable and was deliberately not used for the smoke.

## Process isolation (verified)

- Isolated roots under a disposable tree (`packages/`, `config/`, `project/`,
  `home/`, `state/`, `data/`, `cache/`); none overlap the live
  `~/.config/opencode` or `~/.local` data directories.
- `HOME`, `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_STATE_HOME`,
  `XDG_CACHE_HOME` all pointed at the disposable tree.
- `OPENCODE_CONFIG_DIR` pointed at the disposable `config/`;
  `OPENCODE_CONFIG_PROJECT_DISABLE=1` prevented project config inheritance.
- `--standalone` ran a **private** server (no connection to the per-user
  background server); `--print-logs` confirmed a fresh `serve --stdio`
  child was spawned.
- Candidate registered through an explicit V2 local plugin directory entry:
  `"plugins": ["file:///<disposable>/packages/openviking-v2"]`.
- `openviking-context-v4` was **not** registered as a separate plugin; it is
  present only as the exact sibling import dependency of `openviking-v2`.
- Model endpoint was a deterministic CPU stub (`@ai-sdk/openai-compatible`
  pointed at a local `127.0.0.1` HTTP server returning bounded filler / a
  template-conforming compaction summary). No GPU, no production vLLM, no
  inference.
- `OPENVIKING_URL` pointed at a deliberately dead port (`127.0.0.1:19339`,
  no listener), so baseline recall/capture had no reachable production target.
  The production OpenViking endpoint on `127.0.0.1:1933` was **not** contacted.

## Genuinely exercised in a fresh process (PASS)

| Check | Evidence |
|---|---|
| Plugin discovery + init | Server log: `watcher subscribe` + `loading plugin … entrypoint=…/openviking-v2/index.mjs` from the disposable directory; sibling `openviking-context-v4` lib modules watched. |
| Context hook | Event trace contains a `{"type":"context", …}` line fired by the plugin's `ctx.session.hook("context")` handler. |
| Compaction hook | Event trace contains `session.compaction.started` → `session.compaction.delta` → `session.compaction.ended`; native auto-compaction completed against the CPU stub, and the plugin's `ctx.session.hook("compaction")` handler flushed session state. |
| Event subscription | The plugin's `ctx.event.subscribe(...)` loop emitted the full ordered event stream (integration/provider/model/agent/command/skill/plugin `*.updated`, `session.*` events) into the trace file. |
| Tool hook registration | `ctx.tool.hook("execute.before")` (and `execute.after` when hybrid active) registered without error during `setup`. |
| Source/session identity | Disposable session state recorded `sessionId: "ses_issue70_smoke_compact"`, `ovSessionId: "oc-ses_issue70_smoke_compact"`, canonical message capture with stable `writerId`. |
| Clean disposal | Session state shows `pendingCommit.reason: "flushAll"`; final trace line `location.shutdown`; the `setup` disposal ran `flushAll({commit:true})` and disposed all hooks/subscriber. |
| Disabled capture | No `GRAPHITI_CAPTURE_POLICY_PATH`/token set → capture observer is a no-op; no `session.tool.*` candidate enqueue occurred; no gate write. |
| No Graphiti / gate / production mutation | Pre- vs post-smoke SHA-256 of the installed gate, V2 plugin, launcher shim, and the live `queue.sqlite3` (hash + mtime) are **byte-identical**. No listener existed on the dead recall port. |
| Disabled-feature startup | A separate run with `enabled:false` loaded the plugin, returned before registering hooks (no trace file, no OpenViking session state), and only created the native `opencode.db` — the no-op path is intact. |

## Fixture / offline-only (NOT a fresh-process proof)

- `verify_v2_entrypoint.mjs` is an **offline ESM import-shape preflight** only:
  it proves the candidate module imports and exports `id`/`setup`. It does not
  run OpenCode and does not exercise hooks.
- The `i1-integrated` gate / receipt / launcher / backend-service suites
  (the historical 136/136) are **fixture/subprocess** qualifications against
  the authenticated host sources; they were **not** rerun in this campaign
  because no gate/receipt/launcher/backend source bytes changed.
- Graphiti automatic ingestion, real terminal writes, recall against a live
  backend, and production activation remain explicitly out of scope.

## Reproduction

See `REPRODUCTION_COMMANDS.md` in this directory for the exact, sanitized
command sequence (disposable tree assembly, offline entrypoint preflight,
private fresh-process runs, and protected-surface invariance check).
