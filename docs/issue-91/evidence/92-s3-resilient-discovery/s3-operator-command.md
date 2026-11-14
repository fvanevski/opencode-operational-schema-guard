# Issue #92 S3 — ONE exact post-exit operator command

## Status: READY_FOR_FINAL_OPERATOR_RUN

The terminal reconciliation is prepared and preflighted (`--preflight` exit 0
while the harness was active). It must run **only after the interactive
OpenCode harness exits** (the canonical EX gate fail-closes while a harness
process is active). Execute this ONE command:

```bash
python3 /tmp/opencode/issue92-s3/s3-reconcile-once.py
```

## What the helper does (single EX window, exactly-once)
1. If `/tmp/opencode/issue92-s3/.s3-reconciled` exists → `already_ran` (no replay).
2. Verifies the frozen identities before admission (read-only):
   - source HEAD == `9b98e0e40f60c4fad964182510664e703dc6f44d`
   - 7 shared reconcile-path blobs + corrective `fact-review.mjs` blob
   - frozen batch `003aa99f...` (snapshot digest, plan counts, 55/55 model-call pairs)
   - ReviewStore pre-state `{queued: 18, deferred: 12}`
   - pre-reconcile remote audit 18/18 matched (identity continuity)
3. Waits for the actual interactive harness exit (bounded 86400s poll).
4. Acquires the canonical exclusive OpenViking flock
   (`/run/user/1000/openviking-agent.lock`).
5. Proves admission: harness-exit + 30s quiet grace + scheduler idle
   (running=0, waiting=0) + no unresolved canonical Graphiti work.
6. Runs `node curator-cli.mjs reconcile-only` once with
   `GHDEV_MEMORY_POST_EXIT_LEASE=admitted` (LOCAL_CURATOR_* model env vars
   stripped: structurally inference-free; no drain, no `add_memory`,
   no replay of the frozen 55 calls, no re-submission).
7. Verifies terminal state `{persisted: 18, deferred: 12}` with 18 distinct
   valid UUIDs equal to the positively audited pre-reconcile UUIDs;
   post-reconcile read-only remote re-audit at the final UUIDs.
8. Runs the prepared scorecard utility (`s3-scorecard.py`) and writes
   `s3-reconcile-receipt.json` (0600) + the once-only marker.

Expected terminal result: `TERMINAL_RECONCILED` (the 18 queued records were
already positively matched remotely, so `reconciled_persisted` may report 0
newly reconciled; the helper logs a NOTE, not a failure).

## Publication (separate, authorized after terminal reconciliation)
After the helper succeeds, publish the sanitized evidence-only commit:

```bash
python3 /tmp/opencode/issue92-s3/s3-publish-evidence.py
```

(One commit to `docs/issue-91/evidence/92-s3-resilient-discovery/`,
fresh exact-head authentication, no private raw model replies, non-force
push, independent remote readback.)
