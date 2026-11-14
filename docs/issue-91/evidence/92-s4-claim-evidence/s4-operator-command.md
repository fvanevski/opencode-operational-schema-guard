# Issue #92 S4 — ONE exact post-exit operator command

## Status: READY_FOR_FINAL_OPERATOR_RUN

The S4 claim/evidence qualification is preflighted and staged. The 24-cluster
roster is staged in the fresh private group `graphiti-adr92-s4-claim-evidence`
(empty, 0 episodes; S2=19 and S3=18 preserved immutable). Source binding is
frozen at head `37601461b21a9d5d5634ca5683db25479937f627`. No inference has run
while the interactive Build harness is active.

Execute this ONE command **only after the interactive OpenCode harness exits**
(the canonical EX gate fail-closes while a harness process is active):

```bash
python3 /tmp/opencode/issue92-s4/s4-ex-launcher.py
```

## What the launcher does (single EX window, exactly-once)
1. If `/tmp/opencode/issue92-s4/.s4-ran` exists → `already_ran` (no replay).
2. Waits for the actual interactive harness exit (bounded 86400s poll).
3. Acquires the canonical exclusive OpenViking flock
   (`/run/user/1000/openviking-agent.lock`).
4. Proves admission: harness-exit + 30s quiet grace + scheduler idle
   (running=0, waiting=0) + no unresolved canonical Graphiti work.
5. Runs the S4 driver ONCE under `GHDEV_MEMORY_POST_EXIT_LEASE=admitted`:
   `runAdmittedFiniteBatch` with `claimEvidence:true` (3 independent model
   stages: discovery / support / utility), 24 clusters / 72 candidates /
   3600s, chat-fast default, group `graphiti-adr92-s4-claim-evidence`,
   state `/tmp/opencode/issue92-s4/state/s4`. The driver verifies the S4 source
   binding (finite-batch `66e7f343`, claim-evidence `21db194b`, fact-review
   `20da07bc`, curator-cli `9e77394b`) and fails closed on any drift.
6. On rc=3 (ambiguous remote write), runs `node curator-cli.mjs reconcile-only`
   (positive readback, no model replay, no add_memory) up to 6 bounded
   attempts, then resumes; unknown model outcome is a stop, not a retry.
7. Writes the once-only marker `.s4-ran` (0600) on a settled run.

## Corrective terminal reconciliation (only if the launcher left it unresolved)
If the launcher exits leaving the batch `unresolved` due to delayed remote
Graphiti visibility (queued records not yet read back), run the separate
EX-admitted corrective path (no new model calls, no Graphiti writes, no replay):

```bash
python3 /tmp/opencode/issue92-s4/s4-reconcile-once.py
```

It reads the frozen batch/plan identity adaptively, does a positive pre-audit,
runs ONE `reconcile-only` pass, verifies terminal persistence with distinct
valid UUIDs + continuity, re-audits remote membership, and writes
`s4-reconcile-receipt.json` (0600) + the once-only `.s4-reconciled` marker.

## Publication (separate, authorized after terminal reconciliation)
After the helper succeeds, publish the sanitized evidence-only commit:

```bash
python3 /tmp/opencode/issue92-s4/s4-publish-evidence.py
```

(One commit to `docs/issue-91/evidence/92-s4-claim-evidence/`, fresh
exact-head authentication, no private raw model replies, non-force push,
independent remote readback.)

## Preflight (read-only, while the harness is active — safe to run now)
```bash
python3 /tmp/opencode/issue92-s4/s4-reconcile-once.py --preflight
```
