# Direct host promotion: finish Graphiti capture with one post-exit start command

## Authority and objective

This is the controlling continuation for the user's existing, explicit authorization to promote standing Graphiti capture on the personal host. **No typed plan hash, second consent ceremony, generated deployment controller, new PR, new Git fact record, or new Graphiti nomination.** Use the local agent for host operations directly. The only operator-executed command is the final gate-service start that cannot safely occur while the interactive agent harness is running.

The two historical scripts (`activate-and-verify.sh`, `resume-graphiti-drain.sh`) are superseded for execution. They remain historical evidence. **Do not repair or rerun either script.**

## Observed failure, exact correction

The 2026-11-01 19:30:24Z controller failed before graph ingestion was verified with `sqlite3.OperationalError: no such column: last_error` in Stage 05. The gate's authoritative `memory_work` schema has `error_code`, not `last_error`. This is a controller query error, not proof of a Graphiti failure. The gate was briefly restarted with capture enabled, so the job may no longer be queued. The log says rollback to disabled capture succeeded; authenticate current host state, never infer it.

The backend OpenViking request `7d9010aaef66f2b7eefa597f8de220073e8c1a7c48bc6fbfe1935345cfe01ecf` has previously been independently verified `state=terminal, outcome=completed, release_proven=1`; gate intent is `complete`. **Never run the original rearm tool, replay its POST, resubmit the original commit, or repeat the stock native read.**

The existing Graphiti work key is `a7877b6c3484049f808c6bdbb11b135338f2363dffe7f1e02b30b8af04874604`, group `ghdev_gh_mcp`.

## Direct agent execution, in this same campaign

1. **Fresh evidence, not historical status.** Fetch this exact GitHub working branch and read the existing `tools/inspect_promotion_readback.py` and `tools/check_harness_quiescence.py` as appropriate. Confirm the installed gate/backend source identities, backend receipt facility, current gate service/config, the exact request/receipt, `memory_work`, `graphiti_ingest_receipts`, baseline graph episodes and source policy. The readback tool reads SQLite in `mode=ro` and emits no session content. Check the real schema with `PRAGMA table_info(memory_work)` if a query fails: never substitute a guessed column. Collect a minimal human-readable result, not a new formatted evidence packet.
2. **Choose from actual state.**
   - If OpenViking remains proven complete and Graphiti is `queued` and unclaimed with no receipt, continue to stage standing capture. The existing gate worker, not the local agent or a wrapper, will own the sole submission after post-exit start.
   - If Graphiti is already `completed` with a matching persisted UUID receipt, do not submit again. Verify the existing UUID in the graph and prepare standing capture configuration.
   - If the work is `admitted`, `processing`, `blocked_reconcile`, failed, or differs in source identity: inspect the exact durable operation and existing backend receipt before any change. Reconcile only from real backend/FalkorDB evidence through the reviewed gate behavior. Do not reset or manually claim it, invent completion, or start a new episode. Return a *specific* technical blocker only if the original work cannot be safely continued.
3. **Perform allowed host work directly while this agent is active.** Make a normal private backup of any configuration file actually replaced. Apply the already-qualified standing configuration from the existing Attempt-04 staging directory: `commit-gate.toml`, Graphiti capture and Git source policies, OpenCode shim (if needed), and the `graphiti-activation.conf` gate service drop-in. Verify the live files match the staged SHA-256 identities and runtime paths, permissions, exact group/categories, installed gate/backend source and required credential environment names (do not print secret values). Backend OpenViking receipt facility and corrected sources are already installed; **do not redeploy them if live readback matches**. Use direct shell commands/tools, not an agent-generated orchestration script.
4. **Keep the inference boundary intact.** While an interactive `agy` or `codex exec` is active, do not start/restart the *capture-enabled* gate for model-backed drain. Process classification can ignore established noninteractive `codex app-server` or `opencode serve` helpers, but may not ignore real inference competitors. Stop the user `openviking-commit-gate.service` as the last necessary preparation step, install and verify its effective standing configuration, and leave it **inactive**; keep `openviking.service` and independent recall/backend facilities healthy. Do not disable/stop the backend merely to satisfy the gate. Verify the gate unit has no undesired auto-start while the agent is active.
5. **Prepare no executable handoff artifacts.** No `activate-and-verify.sh`, no `resume-graphiti-drain.sh`, no additional one-shot journal, no scripted artificial outcome. A rollback is simply restoration of the already-known disabled `commit-gate.toml`/policy and a gate restart if required by an actual failure. Preserve existing queue and receipt records.
6. **Before exiting:** Provide a concise handback with current target work status, verified standing config, gate service inactive, backend/recall health, and exact source hashes. The operator's **sole post-exit command** is:

   ```bash
   systemctl --user start openviking-commit-gate.service
   ```

   The running gate independently applies the global flock, inference occupancy/quiet grace, unknown-claim exclusion, source policy, and durable Graphiti receipt protocol. If this command fails at service start, do not force it; inspect the specific service failure.

## Verification after post-exit service start

The operator may paste back normal gate status and the existing `inspect_promotion_readback.py` output after the worker has run, or later relaunch an agent **after extraction has finished** to inspect CPU-only durable state. Do not launch an interactive agent *while Graphiti ingestion needs admission*; that would suppress drain again. The readback should prove a `memory_work.status=completed` row and a matching `graphiti_ingest_receipts.state=completed` / `episode_uuid` for the original work, independent graph persistence, source-attributed recall, two historical episodes preserved, and `graphiti_enabled=true` after service restart. If not yet complete, distinguish ordinary queue wait from true blocked state rather than repeatedly toggling capture.

## Practical boundaries

- **Preserve** the original OpenViking receipt and queue history; no destructive reset.
- **Preserve** shared lease, scheduler, source authority, and actual persisted result checks.
- **Avoid** additional synthetic test campaigns for already-qualified source; use focused CPU-only checks if current sources drift.
- **Use** existing simple systemd/service tooling and sqlite3 read-only queries; do not create new shell wrappers to make operations appear atomic.
- **Do not block** solely because noninteractive process helpers exist.
- **No new consent ceremony:** user authorization for this precise deployment is already recorded in the active task.
