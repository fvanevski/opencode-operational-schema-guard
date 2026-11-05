# Issue #81 — Terminal EX / systemd post-exit receipt (81-post-exit-terminal-v1)

Sanitized. No private source text, no operator signatures.

## Precondition established

Before this terminal session, the operator had exited all prior OpenCode harnesses. The armed
post-exit drain was confirmed to have **genuinely terminated/settled** before any new inference:

- `systemctl --user status ghdev-curator81t-qual.service` → `inactive (dead) since 2026-11-04 11:35:04 PST`,
  `Main PID 1661719 (code=exited, status=0/SUCCESS)`, final drain output `status:"settled"`, `unresolved:0`.
- `systemctl --user status ghdev-cur81-holdout-4c3ab514.service` → `inactive (dead) since 2026-11-04 09:03:01 PST`,
  `Main PID 709916 (code=exited, status=0/SUCCESS)`, final drain output `status:"review_required"`, `unresolved:0`.
- **EX lease:** the canonical shared `flock` on `$XDG_RUNTIME_DIR/openviking-agent.lock` is **not** held by any
  unresolved drain worker. The only holder is the current interactive opencode admission wrapper
  (`flock -s … opencode`, PID observed live) — a shared lock, expected for the active harness.
  The drain worker (PID 1661719) had exited, releasing its exclusive lease. No unresolved worker was disturbed.

## EX admission evidence (canonical gate)

- Drain invocation (dev, user unit `ghdev-curator81t-qual`):
  `python3 …/worktree/docs/issue-75/v2-candidate/post-exit-drain.py --gate-source
  /home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py --gate-config
  /home/filip/.config/openviking/commit-gate.toml --cli …/usage-drain-cli.mjs --group
  cur81_native_a1f3c9d7 --state-dir …/state --endpoint http://127.0.0.1:8766/mcp --max-seconds 600 --lock-timeout 120`
- Journal (dev): `EX admission proven; invoking candidate drain with lock retained` →
  `LATE_RECONCILIATION_LOCAL_WORK: resuming admitted drain under retained EX` (×2) →
  final `{"curated":1,…,"persisted":1,"unresolved":0,…,"status":"settled"}` →
  `systemd: Finished Admitted post-exit candidate curator (issue81 terminal81-a1f3c9, dev native group).`
- Holdout (user unit `ghdev-cur81-holdout-4c3ab514`): `EX admission proven; invoking candidate drain with lock
  retained` → `{"curated":3,"deferred":1,"skipped":1,"approved":1,"queued":1,"persisted":1,"unresolved":0,…,"status":"review_required"}` →
  `systemd: Finished Issue #81 sealed-holdout admitted post-exit curator drain …`

## Final worker disposition

| Unit | Group | Terminal status | Exit | Disposition |
|---|---|---|---|---|
| `ghdev-curator81t-qual` | `cur81_native_a1f3c9d7` | `settled` | 0/SUCCESS | drained + reconciled; EX released |
| `ghdev-cur81-holdout-4c3ab514` | `cur81_holdout_4c3ab514` | `review_required` | 0/SUCCESS | drained; 1 fact persisted, awaiting operator adjudication |

No second always-on retry loop. No blind replay of an ambiguous submission. The one ambiguous-remote
window (dev, after the first `persisted:5` pass) was resolved by the `reconcile-only` passes to
`unresolved:0` before the EX lease was released.
