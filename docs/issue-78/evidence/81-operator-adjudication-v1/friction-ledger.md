# Issue #81 — GHDEV-10 Command-Shape Friction Ledger (81-operator-adjudication-v1, cumulative)

`friction encountered = yes` (bounded, all recovered; no acceptance-bearing result erased).
This ledger carries forward the full cumulative history:
- 6 events from `81-recall-remediation-v1/command-shape-friction.md`
- 2 events from the terminal post-exit session (`81-post-exit-terminal-v1/friction-ledger.md`)
- **0 new events** from this operator-adjudication finalization session (all commands matched the
  handoff; the session was read-only against the live Graphiti / review-store and evidence-only on the
  new `81-operator-adjudication-v1/` dir — no guard rejections, no shell-shape errors, no masked
  producer failures).

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

**This session (adjudication finalization): 0 new events.** The work was exact-source extraction
(python over the pinned review-store candidate events), the F12 source-file check, the read-only
Graphiti `get_episodes` re-verification of the receipt bindings, and the evidence-only file writes /
`git` commit + push. No literal/native command was rejected, no producer exit was masked, and no
`rtk`/`git -C`/`cd &&`/`env` wrapper altered a required command's shape.

## COMMANDS_MATCH_HANDOFF

`yes` — for this operator-adjudication finalization, the required agent-phase commands (native
`git` rev-parse/show/stage/commit/push on the evidence worktree, the read-only Graphiti MCP
`get_episodes` route against the live `http://127.0.0.1:8766/mcp` endpoint, and the evidence-only
file writes under `81-operator-adjudication-v1/`) matched the handoff: native OpenCode V2, the
repository-native `node`/`python3` for bounded extraction only, the canonical live Graphiti MCP
read-only route, and the `git push origin HEAD:issue/81` fast-forward. No `rtk` prefix was added to
any literal/native command; no prohibited operation (model inference, Graphiti write, replay, new PR,
merge, substantive source edit) was routed through an alternate tool. The only divergences in the
whole campaign are the bounded shell-shape/interface events #7 and #8 (terminal session), both
recovered pre-execution with no acceptance-bearing result erased.

## Producer-exit integrity

All acceptance-bearing producer exits were preserved independently of display filters. The Graphiti
readbacks are the live MCP `get_episodes` results (episode counts and UUIDs transcribed verbatim from
the tool output, not reconstructed). The exact-source verdicts are derived by a deterministic python
pass over the pinned review-store candidate events (full top-level `excerpt`), with the F12 check
performed against the actual `native-ws/fsm81/fsm.test.js` bytes. No `| head`/`| tail`/`grep` was used
as a success gate for a producer.
