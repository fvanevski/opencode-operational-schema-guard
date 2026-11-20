# Issue #108 D1 | Persistent OpenCode server and autonomous EX curation

**Implementation authority:** Central-authored at the accepted `main@47cf1cd3ed5155d2907bfd7595fec616e817712e`. This is a narrow host-local compatibility addition, not a change to the GitHub repository-root V9 guard or installed V10 ledger. The working branch/PR is review material until its exact source and host qualification are accepted.

## Root cause and selected design

The live `opencode-serve.service` starts `opencode serve` under the original `openviking-agent-run` → `flock -s --close` → `admission_exec.py` chain. Its SH lock remains held for the lifetime of the foreground server. Both the existing Graphiti curator (`post-exit-drain.py`) and OpenViking gate require EX on the same lock. Autonomous EX admission therefore starves even after a client exits.

**Selected bounded solution:** retain this known-good SH/EX admission chain and deliberately quiesce the persistent service for bounded post-exit curation. A small transparent **loopback-only ingress fence** owns the existing client endpoint `127.0.0.1:49374`; the original OpenCode service moves to a private loopback backend `127.0.0.1:49375`. No additional model server or memory store is created. The fence checks an owner-only atomic journal **synchronously before dispatching each HTTP request or WebSocket upgrade**. It tracks admitted in-flight responses/upgrades and rejects subsequent ingress with 503 while the window is fenced. No body or secret is logged.

The journal must be initialized once under the actual canonical SH flock using the explicit `idle_window.py bootstrap --config ...` command after host-source and current-server authentication. Once enabled, a deleted or malformed journal **fails closed for both ingress and backend startup**; a missing journal is never equivalent to idle.

A host-only Python coordinator, invoked by the existing curator `.service`, does this sequence:

1. Check authenticated immutable installed launcher/gate/curator source identities and actionable local curation status. Confirm the backend service and ingress fence are healthy.
2. Write a durable `preparing` journal. The fence immediately denies new requests. Wait for all previously admitted HTTP/WebSocket requests and native session executions to finish, and for the canonical scheduler/Graphiti admission observations to report idle twice across the configured quiet grace. A failed pre-stop observation clears only this unattempted journal and retries later.
3. Persist `stopping`, stop `opencode-serve.service` by its normal systemd user interface and verify **the backend process and listener are absent**. Its existing SH flock is released by normal process exit; no lockfile deletion/unlock or kernel-lock manipulation occurs.
4. Invoke the **unchanged** `post-exit-drain.py` while ingress stays fenced. It must acquire the original EX flock, perform its own scheduler/quiet grace, and hold EX through Graphiti reconciliation. The gate may obtain EX first; both original admission paths still serialize on the same lock.
5. Only on an existing wrapper-defined safe terminal result (exit 0, or autonomous technical retry exit 4 after its positive reconcile-only check) and a fresh canonical gate-idle observation, persist `starting`, restart the original OpenCode service (it re-acquires SH through the original shim), verify one private backend listener, then write `idle` to reopen ingress.
6. If the process crashes or a remote write result is unclassifiable, the journal remains non-idle and service ingress stays closed. A systemd `ExecStartPre` refuses an unsafe start even if another start is attempted. Recovery requires documented operator adjudication, **not** a blind retry or automatic resubmission.

This choice accepts **short, bounded local HTTP unavailability** during EX curation rather than modifying OpenCode request internals or running a permanent untrusted inference scheduler. In the presence of unresolved remote submissions, availability intentionally remains blocked. It does not modify the protected `appliedTurns` ledger, Graphiti ReviewStore, OpenViking spool, or databases except through the already accepted curator worker.

## Source-locked files

| Repo file | Live installation target |
|---|---|
| `idle_window.py` | `~/.local/share/ghdev-108/idle_window.py` |
| `ingress_fence.mjs` | `~/.local/share/ghdev-108/ingress_fence.mjs` |
| `window-config.example.json` | authenticated owner-only `~/.config/ghdev-108/window.json` |
| `units/ghdev-ingress-fence.service` | `~/.config/systemd/user/ghdev-ingress-fence.service` |
| `units/opencode-serve.service.d.ghdev108.conf` | `~/.config/systemd/user/opencode-serve.service.d/ghdev108.conf` |
| `units/ghdev-curator-prod.service.d.ghdev108.conf` | `~/.config/systemd/user/ghdev-curator-prod.service.d/ghdev108.conf` |
| `units/ghdev-curator-prod.timer` | `~/.config/systemd/user/ghdev-curator-prod.timer` |

The existing `opencode-serve.service` base unit, OpenCode binary, plugin sources, OpenViking gate sources, `post-exit-drain.py`, curator CLI, and original `ghdev-curator-prod.path` remain untouched. Systemd user-unit drop-ins are reversible. All `pinned_files` digests in the example config come from the authenticated 2026-11-19 source snapshot and must be re-read against live paths before integration. Do not silently update pins if any live source differs.

## Unit activation and rollback ordering

The operator-approved live activation is a distinct boundary after disposable integration and exact-head independent PR review.

Before changing active services, authenticate the current `main`, actual host source/config, current file ownership/modes, shared/EX ownership, source rollback, listener ownership, and active/idle session state. Restrict the service migration to a verified quiescent window. While the old 49374 server still holds its SH lease and the canonical gate has no active EX, run the one-time `bootstrap` after verifying config/source pins; preserve the 0600 journal. Stop the original 49374 backend only after independently proving no active native/scheduler work; save exact unit/environment files. Install and verify the coordinator, gateway, config and unit files; `systemctl --user daemon-reload`. Start `ghdev-ingress-fence.service` on 49374, then start `opencode-serve.service` on 49375. Confirm authenticated native clients connect through 49374 and the backend receives exactly the original auth, plugin and model routing. **Only after that proof**, enable and start `ghdev-curator-prod.path` and `.timer`.

If activation fails before any new EX attempt, disable the new watcher/timer, stop the new backend and fence, restore original unit and config bytes, re-load systemd and restart the original 49374 shared service through its original shim. If an EX attempt has begun and its terminal state is unverified, **do not roll back by reopening ingress**; retain the journal fence until operator-adjudicated reconciliation.

## Necessary host acceptance and potential blockers

The disposable controller and loopback proxy tests do not by themselves qualify all native OpenCode transport semantics. One bounded host campaign must check:

- OpenCode v2.3.0 HTTP/SSE/WebSocket and CLI `--server` traffic really flows through the fence, with no inference-capable direct backend callers; preserve Basic authentication and all effective guards. `/__ghdev_ingress/status` is a local diagnostic endpoint, not a second client API or source authority.
- `GET /session/status` on the **private** backend is authoritative enough to identify busy/retry/background native executions. An async prompt that finishes its HTTP response but continues producing model/tool work must remain observable as busy until completion. A falsified idle state or untracked background inference is a blocker requiring Central to strengthen admission, not license to remove the checks.
- A held response or WebSocket must keep `active>0` and postpone the window; a new request after `preparing` must receive 503 and never reach the backend. Crash/restart of the fence while the journal is non-idle must remain closed. Long-lived SSE may reduce EX availability but is not reason to falsely exclude inference-capable work.
- Native session active just before the fence, candidate arrival during the quiet period, simultaneous new client, curator EX acquisition, scheduler activity, gate commit contention, worker crash/unknown remote submission, and systemd restart after an interrupted window must preserve source/at-most-once invariants. Do not simulate an actual ambiguous Graphiti write in production.
- The canonical EX drain must complete a genuine queued source path or return a typed safe SKIP/DEFER, preserve the current 397/397 target-group membership, and leave both Graphiti and OV healthy. A queued/deduped fact is not a fabricated terminal UUID. A fresh terminal source-group readback is still needed to satisfy C4 where applicable.
- Restore one healthy proxied shared service, no stale relay/port owner, original provider route, deployed V10 core digest, authentic `development-knowledge` group membership, old 128 cursors plus legitimate new ones, correct active XDG_DATA_HOME SQLite, and all rollback materials.

**Do not claim an unconditional request-level admission guarantee from this source alone.** Service-internal asynchronous work not coupled to active HTTP/SSE/WebSocket requests must be proven quiescent through the installed native status and canonical scheduler before backend stop. If the current OpenCode build cannot provide that proof, this candidate remains pre-production until a Central-owned stronger ingress/task boundary is implemented.

## Scope fences

No D2 graph repair, old-UUID downgrade/replay, Graphiti restore, historical SQLite repair, curation-bundle quarantine repair, OpenViking commit-gate rewrite, broad plugin upgrade, second memory authority, untrusted client backdoor, or new PR per acceptance test. Treat the 397/397 target-group readback as accepted host evidence and recheck the correct group in final qualification. The parent #105 gate remains independent.

Run deterministic tests from this directory: `python3 -m unittest -v test_idle_window.py` and `node --test test_ingress_fence.mjs`, plus `python3 -m py_compile idle_window.py` and `node --check ingress_fence.mjs`.
