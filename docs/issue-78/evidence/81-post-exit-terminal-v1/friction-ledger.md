# Issue #81 — GHDEV-10 Command-Shape Friction Ledger (81-post-exit-terminal-v1, cumulative)

`friction encountered = yes` (bounded, all recovered; no acceptance-bearing result erased).
Carries forward the 6 events from `81-recall-remediation-v1/command-shape-friction.md` and adds the
2 events from this terminal post-exit session.

| # | Event | Class | Attribution | Effect | Recovery |
|---|---|---|---|---|---|
| 1 | `rm -rf native-ws-holdout` rejected (`Permission denied: shell`) | guard_restriction | host/guard | pre_execution_rejection | populated the freshly-created dir in place; avoided `rm` |
| 2 | DB session-capture by `time.time()` missed the new session (session-table clock ~24 days behind wall clock) | interface_discovery | agent | bounded | captured the session ID from the staged queue events (reliable) and continued in it |
| 3 | `turn()` helper used `local text="$1"` without a second `shift` → turns h2–h1c sent the turn **name** as text | agent-authored harness bug | agent | pre_execution (first holdout run) | fixed the helper, re-ran the independent holdout in a fresh session `ses_e58011dbc…` |
| 4 | Prospective corpus `native_event.timestamp` was a DB object `{"created":<ms>}` → `stamp()` Invalid Date → `envelope()` null → recall 0 | agent-authored harness bug | agent | pre_execution (corpus build) | `native_ts()` normalizes to an ISO string; corpora rebuilt + re-registered (pre-inspection, not result-tuning) |
| 5 | `three-path.mjs` wrote with `flag:'wx'` → EEXIST on re-run | agent-authored | agent | pre_execution | switched to overwrite flag |
| 6 | `systemctl --user start ghdev-curator81t-qual.service` timed out at 120s | expected behavior | host | guard_annotation | the oneshot blocks on the EX lock (held by the active harness); the service is retrying every 30s and will drain post-exit — correct pre-exit behavior, not a failure |
| 7 | (terminal session) tracing the drain worker's process parent chain used `PPID` as a zsh variable → `read-only variable: PPID` | shell-shape | agent | pre_execution (bounded) | re-ran with a distinct variable name; parent chain confirmed (drain worker exited; only the interactive opencode shared-lock holder remains) |
| 8 | (terminal session) candidate-event `source_refs` spot-check first parsed the curation `events[].source_refs` shape, yielding 0 refs | interface_discovery | agent | pre_execution (bounded) | re-read the candidate-event file structure (top-level `source_refs`); 12/12 dev + 1/1 holdout episode refs verified present |

## COMMANDS_MATCH_HANDOFF

`yes` — for the required agent-phase commands in this terminal session (systemd `--user` status/cat,
`journalctl` readback, `git` fetch/rev-parse/show, `gh pr view`, `sha256sum`, the Graphiti MCP
`get_episodes`/`get_episode_entities`/`get_status` read-only route, and the review-store/usage readbacks),
the tool-routing class, workdirs, and lifecycle boundaries matched the handoff (native OpenCode V2,
repository-native node, the canonical `post-exit-drain.py` EX gate, user-systemd drain units, the live
Graphiti MCP endpoint). No `rtk` prefix was added to any literal/native command; no prohibited operation
was routed through an alternate tool. The only divergences are the bounded shell-shape/interface events
#7 and #8, both recovered pre-execution with no acceptance-bearing result erased.

## Producer-exit integrity

All acceptance-bearing producer exits were preserved independently of display filters. The Graphiti
readbacks are the live MCP `get_episodes`/`get_episode_entities` results (episode/node/edge counts and
UUIDs transcribed verbatim from the tool output, not reconstructed). The systemd drain outputs are the
actual `systemctl --user status` / journal lines. No `| head`/`| tail`/`grep` was used as a success gate
for a producer.
