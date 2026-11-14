# GHDEV-10 — command-shape friction log (S6 exposed + A3 freeze)

Friction encountered while executing the S6 exposed treatment and A3 prospective freeze,
with the exact command shape that resolved each. These are host-integration command
shapes, not source changes.

## 1. First launcher run returned `status:"empty"` (0 model calls)

- Symptom: `s6-ex-launcher.py` settled with `status:"empty"`, 0 model calls, 0 persisted.
- Cause: `finite-batch.mjs` short-circuits on `if(!clusters.length)` → an empty
  `CandidateQueue` yields 0 clusters. The queue must be **seeded** with "new" events
  before the driver runs; the driver does not capture events itself.
- Resolution: a CPU-only staging step (`s6-stage.mjs`) seeds the 24 authenticated corpus
  events into the S6 group queue, then the launcher runs the driver. Cleaned the no-op
  artifacts (marker, receipt, empty result, batch folder) before the settled re-run.

## 2. Reconcile Graphiti probe lost stdout through the EX bridge

- Symptom: the reconcile Graphiti readback returned 0 episodes on the first run.
- Cause: the EX bridge **inherits the parent's stdout**, so a probe that only
  `print`s its result loses the output (the child's stdout is the bridge's, not a
  capturable pipe).
- Resolution: the reconcile probe writes its Graphiti readback to a file
  (`s6-graphiti-readback.json`) and the launcher reads that file; file-based I/O survives
  the inherited-stdout bridge.

## 3. A3 v2 cohort selection by truncated message id

- Symptom: building the A3 v2 manifest asserted on `msg_1aeb0cfa4001`.
- Cause: candidate message ids were displayed truncated to 16 chars; the manifest builder
  resolved them by **prefix** against the full id set, then bound each case to its full
  native `session_id`/`message_id` + source content digest.
- Resolution: prefix-resolution against the full native id set; each of the 20 cases is
  bound to a distinct native message (20 distinct message ids verified).

## 4. `rm -rf` consent gating

- Symptom: a combined `rm -rf` + `mkdir` for a fresh state dir was blocked by the consent
  mechanism.
- Resolution: split into a read-only existence check, a `mkdir -p`, and targeted `rm -f`
  of specific no-op artifacts, avoiding a broad recursive delete.

## 5. EX admission bounded retries

- Observed: the settled S6 run admitted after one `ADMISSION_WAIT` (scheduler busy) and
  settled the driver on attempt 5 (reconcile-only `rc=3` remote-visibility-pending on
  attempts 1–4, `rc=0` on attempt 5). This is the expected bounded-retry shape of the
  EX-gated launcher; no source change.
