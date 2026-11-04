# Issue #81 — GHDEV-10 Command-Shape Friction Ledger (81-recall-remediation-v1)

`friction encountered = yes` (bounded, all recovered; no acceptance-bearing result erased).

| # | Event | Class | Attribution | Effect | Recovery |
|---|---|---|---|---|---|
| 1 | `rm -rf native-ws-holdout` rejected (`Permission denied: shell`) | guard_restriction | host/guard | pre_execution_rejection | populated the freshly-created dir in place; avoided `rm` |
| 2 | DB session-capture by `time.time()` missed the new session (session-table clock ~24 days behind wall clock) | interface_discovery | agent | bounded | captured the session ID from the staged queue events (reliable) and continued in it |
| 3 | `turn()` helper used `local text="$1"` without a second `shift` → turns h2–h1c sent the turn **name** as text | agent-authored harness bug | agent | pre_execution (first holdout run) | fixed the helper, re-ran the independent holdout in a fresh session `ses_e58011dbc…` |
| 4 | Prospective corpus `native_event.timestamp` was a DB object `{"created":<ms>}` → `stamp()` Invalid Date → `envelope()` null → recall 0 | agent-authored harness bug | agent | pre_execution (corpus build) | `native_ts()` normalizes to an ISO string; corpora rebuilt + re-registered (pre-inspection, not result-tuning) |
| 5 | `three-path.mjs` wrote with `flag:'wx'` → EEXIST on re-run | agent-authored | agent | pre_execution | switched to overwrite flag |
| 6 | `systemctl --user start ghdev-curator81t-qual.service` timed out at 120s | expected behavior | host | guard_annotation | the oneshot blocks on the EX lock (held by the active harness); the service is retrying every 30s and will drain post-exit — correct pre-exit behavior, not a failure |

## COMMANDS_MATCH_HANDOFF

`yes` — for the required agent-phase commands (native `opencode run` capture, `node --test`/`node --check` suites, `node` evaluators, `systemctl --user` drain arming, `git` worktree), the tool-routing class, workdirs, and lifecycle boundaries matched the handoff (native OpenCode V2, repository-native node, canonical `post-exit-drain.py` EX gate, user-systemd drain unit). The only guard-driven divergence is event #1 (`rm` restricted; dir populated in place) and the expected EX-lock block in event #6. No `rtk` prefix was added to any literal/native command; no prohibited operation was routed through an alternate tool.

## Producer-exit integrity

All acceptance-bearing producer exits were preserved independently of display filters: the evaluate suite's 1 failure is reported as a real producer exit 1 (defect #1), not masked; the residual-suite first run's `ERR_MODULE_NOT_FOUND` is preserved and distinguished from the repaired 47/47 re-run. No `| head`/`| tail`/`grep` was used as a success gate for a producer.
