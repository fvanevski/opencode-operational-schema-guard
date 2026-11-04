# Issue #80 closure-v1 — terminal-extraction recovery receipt

## Root cause of the premature 15:34:05PST `submission_unknown` transition

The qual02 review `ca268f5dd77dee45d74494a604985fcf2c81fcad764f2d62ca66c49f4e764828`
moved `approved (rev 2) -> submission_unknown (rev 3)` at
`2026-11-03T23:34:05.044Z` (= 15:34:05 PST). Investigation proven the
transition was a **local-only** operation:

- **Session provenance**: the previous OpenCode Build session
  `ses_e5c40c49effedpeZU74h4Tlmxr`, tool call `call_dee51a26f72ecd5b`, ran
  `node -e` calling `ReviewStore.advance(id, 'approved', 'submission_unknown')`
  **directly** — no `GHDEV_MEMORY_POST_EXIT_LEASE=admitted` marker, no
  canonical flock, no `add_memory`.
- **Remote write never issued**: the `mcp-mux.service` journal shows **zero**
  Graphiti `POST /mcp` traffic in the 15:33:30–15:34:30PST window, and
  **zero** `cur80_qual02` queue-processing events since 15:00. The live
  `get_episodes` scoped readback for `cur80_qual02` returns **0** episodes.
- **Canonical gate**: `_unresolved_graphiti_from_existing_db()` = `False`
  (no unresolved `memory_work` in the gate DB).

**Conclusion**: `SUBMISSION_DELIVERY = never-submitted` (unknown →
rejected-by-absence-of-call). No remote write was ever issued, so the record
is not a failed/replayed submission; it is a locally staged write-intent that
never left the machine.

## Chosen disposition: a NEW "never-submitted" reconciliation path

Neither a replay nor a `failed_extraction` is correct (no remote episode or
call ever existed). The delta adds a dedicated reconciliation path:

- `terminal-recovery.mjs` → `assessNeverSubmittedRecovery`: exact
  group/record identity, `submission_unknown` state with null remote UUID,
  `origin=qualification_operator_seed`, and a **positive zero-episode scoped
  readback** (`get_episodes` over `cur80_qual02` = 0). Absence of a recent
  window alone never proves non-submission, so a **no-remote-call
  attestation** is explicit and durable.
- `core.mjs` → `ReviewStore.reconcileNeverSubmitted(id, rev, evidence)`:
  validates the evidence (`kind=pre_exit_local_staging_no_remote_call`,
  `operator_attested`, `staging_proven`, `remote_readback_zero_episodes`,
  exact `staging_at` audit match), then restores
  `submission_unknown -> approved` (rev+1) with a durable
  `never_submitted_evidence` block and an
  `operator_attested_never_submitted` audit entry.
- `terminal-recovery-cli.mjs` → `--never-submitted <id>
  --never-submitted-revision N --never-submitted-evidence '<json>'
  [--apply --attest-no-remote-call]`. The CLI declares the post-exit lease
  marker **only when `--apply`** so the store-level admission invariant holds
  for any durable remote-state transition it applies. The marker is a
  declaration by this adjudication tool, **not** canonical flock ownership.

Because the record is restored to `approved` (not `queued`/`persisted`), the
post-exit drain performs the **genuine FIRST** `add_memory` — not a replay.

## Adjudication applied

- Evidence bundle: `closure80-scratch/never-submitted-evidence.json`,
  `evidence_sha256 = 90c5e5693a7c375cfff2c94eaad2a3a3870cbd487fe276ffcfa0754db4bb3362`.
- Dry-run: `READY_FOR_OPERATOR_ATTESTATION` (remote_episode_count 0).
- Apply: `RECOVERED_NEVER_SUBMITTED` → `ca268f5d...` now `approved` **rev 4**,
  applied at `2026-11-04T00:26:43.882Z`.
- Repeat apply (idempotency guard): rejected
  `NEVER_SUBMITTED_REVIEW_IDENTITY_NOT_PROVEN` (state is no longer
  `submission_unknown`), confirming no double-apply.

## Admission invariant added to `core.mjs advance()`

Durable remote-write transitions (`submission_unknown | queued | persisted`)
now require `process.env.GHDEV_MEMORY_POST_EXIT_LEASE === 'admitted'` inside
the mutex, enforced **at the sole durable writer** after the CAS state
check. Rationale: the marker is a declaration, not independent flock proof,
so it is enforced where it matters (the durable writer) rather than trusted
at every call site. A stale CAS miss stays a clean `false`; a matching state
without admission is fail-closed (`EX_POST_EXIT_ADMISSION_REQUIRED`). The
structural edge check also moved after the CAS state check so a replay of a
legal edge against an advanced record (e.g. `failed_extraction`) returns a
clean `false` instead of throwing `Illegal remote state transition`
(RED/GREEN in `cpu-tests.md`).

## qual01 FIFO-inference limitation (bounded)

The qual01 failed record `d1ebf82a...` is `failed_extraction` (rev 5) with
`failure_evidence.identity_binding = anonymous_group_fifo_inference` and
`journal_sha256 = c7ce020a9ee9dbd54deff3d4864859590bfdd9c37d7dce76884e2925dffa9109`,
corroborated by the sibling success episode
`26299f65-f48c-45c1-abf0-9c7d521b1a03`. This attribution is an **explicitly
operator-attested FIFO inference** (the first anonymous group task failed),
**not** a UUID-level proof that `d1ebf82a...` specifically was the failing
task. It is recorded as such (no assertion inflated), and no replay is
authorized.
