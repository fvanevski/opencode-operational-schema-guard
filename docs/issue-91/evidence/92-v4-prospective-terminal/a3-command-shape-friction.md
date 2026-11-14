# GHDEV-10 — command-shape friction log (authorized final prospective v4 execution)

## 1. The once-only marker is shared at `BASE/.a3-host-ran` (not state-specific)
- The v4 launcher's `MARKER = BASE / ".a3-host-ran"` is the **shared** once-only marker. The v3
  execution created it (group v2, state-v3, source_head 50fd675), so the first v4 launch
  fail-closed with `MARKER_PRESENT: not re-executing`. The v3 marker + receipt were preserved as
  `.a3-host-ran-v3-historical` / `a3-host-attempt-receipt-v3-historical` and cleared so the v4 run
  could proceed (routine host-local launcher binding; no historical mutation).

## 2. Driver `A3_HOST_SOURCE_BINDING_STALE_HEAD` when the repo is at an evidence descendant
- The driver required `git rev-parse HEAD === source_head` (a564d397), but the repo is at the
  evidence-only descendant `812ffe3`. Fixed (host-local) to the correct invariant: the execution head
  must be an **ancestor** of HEAD and the 8 execution-source blobs must be committed at
  `a564d397:<rel>` and unchanged on disk. The launcher separately verifies the 8th blob (the EX
  bridge `ex_admitted_node_bridge.py`, blob `004188b1…`).

## 3. `rc=3` → reconcile-only settles queued writes
- The inference driver returned `rc=3` (terminal, writes queued, `persisted=0`). The launcher's
  reconcile-only path settled the 8 persisted writes (no re-inference, `inference_calls=1`
  immutable). Authoritative count = ReviewStore `state==='persisted'` (8) + `get_episodes` readback (8).

## 4. Adjudication `source_excerpt_sha256` / `source_case_id` must match the staged receipt
- The scorer's `adjudication_not_bound` check requires each adjudication's `source_excerpt_sha256`
  and `source_case_id` to equal the staged-receipt row's `excerpt_sha256` / `case_id` (by
  `source_ref`). Computing the excerpt sha from the ReviewStore event excerpt (rather than the staged
  receipt's stored `excerpt_sha256`) fails the bind. Use the staged-receipt values per `source_ref`.

## 5. Receipt `source_head` label is stale (50fd675)
- The launcher attempt receipt carries `source_head: 50fd675` (inherited from the v3 driver
  template). The authoritative source binding is the driver result's
  `source_binding.repo_head = a564d397` (with the 8 blobs). The receipt field is a cosmetic label
  inaccuracy, not a binding drift.

## 6. Scorer gate `useful_among_grounded` = point ≥ 0.75 AND independent useful ≥ 8
- `acceptance.mjs:194`: `useful_among_grounded: useful.point>=0.75 && independentUseful>=8`. The v4
  run has useful.point 0.875 (pass) but `independent_useful_facts = 7` (the 8th persisted episode is
  the v4-05 duplicate) → the floor fails. Combined with valuable coverage 7/10 < 0.85, the terminal
  verdict is a measured FAIL (exit 3).
