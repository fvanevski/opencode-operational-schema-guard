# Issue #92 S2 — ONE exact post-exit operator command

## Status: READY_FOR_FINAL_OPERATOR_RUN

The post-exit run is prepared and preflighted. It must run **only after the
interactive OpenCode harness exits** (the drain gate fail-closes while a harness
process is active). Execute this ONE command:

```bash
python3 /tmp/opencode/issue92-s2/s2-ex-launcher.py
```

## What the launcher does (single EX window, exactly-once)
1. If `/tmp/opencode/issue92-s2/.s2-ran` exists → `already_ran` (no replay).
2. Waits for the interactive harness to exit (bounded 86400s poll).
3. Acquires the canonical EX flock (`/run/user/1000/openviking-agent.lock`).
4. Proves admission: no active harness + 30s quiet grace + scheduler idle
   (running=0, waiting=0) + no unresolved canonical Graphiti work.
5. Runs the S2 driver once with `GHDEV_MEMORY_POST_EXIT_LEASE=admitted`:
   - group `graphiti-adr92-s2-source-recovery`
   - state root `/tmp/opencode/issue92-s2/state/s2`
   - `--finite-batch on --novelty-policy recall --source-recovery on`
     `--max-clusters 24 --max-candidates 72 --max-seconds 3600`
   - `chat-fast` identity, no tuning file, Graphiti MCP `http://127.0.0.1:8766/mcp`
6. Reconciles `rc=3` (unresolved remote) positively, bounded; writes `.s2-ran`
   (0600) on success.

## Source-defect note (affects the run outcome)
At head `c4a804b8` the S2 source-recovery `utility_non_substantive` trigger
crashes (`evidence_span` undefined; see `s2-source-defect.md`). The operator may:
- **Run at head** to reproduce the defect (expected: the run fails closed on any
  cluster reaching that trigger), or
- **Apply `s2-proposed-source-patch.diff` first** (additive, 1-file, uncommitted)
  to enable the full source-recovery qualification, then run the same command.

Applying the patch is a reversible local source edit, not a commit; it does not
weaken admission controls. The once-only marker ensures the drain is not replayed.

## Result classification target
`EXPOSED_RECOVERY_SUPPORTED` only if the patched run recovers source-supported
useful facts for the 8 previously-missed valuable targets (6 Graphiti + sp8/sp9)
with terminal UUID/source-index readback and no privacy/group/wrong-group
defects; otherwise `REMEDIATION_REQUIRED` (defect) or `BLOCKED` (EX/remote).
