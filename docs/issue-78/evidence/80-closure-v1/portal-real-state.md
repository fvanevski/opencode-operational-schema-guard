# Issue #80 closure-v1 — portal real-state receipt

Scope: the operator-driven portal approval of the qual02 review and the
consistency of the durable records. No portal source change in this delta
(the in-scope portal fix from `80-first-integration-v1` is unrelated to this
delta and remains that campaign's concern).

## Operator browser approval (pre-exit)

- At **15:34:02 PST** the operator approved the qual02 review in the portal
  browser: `edit-and-approve` → `approved` (rev 2), with a source-grounded
  fact (`node --test prime.test.js exited 0: 5 pass, 0 fail`,
  evidence class `tool-reported`, source ref
  `opencode:ses_e5c3d3bb3ffedqoZCz10Lc3ZOU:tool:call_235bb6826d6f6d0f`).
- This is the `edit-and-approve` audit entry
  `2026-11-03T23:34:02.894Z edit-and-approve -> approved` in the `ca268f5d...`
  record. Local approval is a local operator action and needs no EX marker.
- 3 s later (15:34:05 PST) the write-intent was staged to
  `submission_unknown` by the previous Build session **without** the EX
  marker, **without** the canonical flock, and **without** any `add_memory` —
  the premature transition this campaign reconciles (see
  `terminal-extraction-recovery.md`).

## Durable consistency (post-reconciliation)

- `ca268f5d...` is now `approved` (rev 4), `remote_episode_uuid` null, with a
  `never_submitted_evidence` block (SHA-256 `90c5e5693a7c375cfff2c94eaad2a3a3870cbd487fe276ffcfa0754db4bb3362`).
- The durable record and the live Graphiti group state agree: `cur80_qual02`
  has **0** remote episodes (no `add_memory` was ever issued), so the local
  `approved` state is consistent with a genuine-first-submission-pending
  posture. There is no orphan remote episode and no local record claiming a
  UUID that does not exist.
- `cur80_qual01` durable `924eee7a...` = `persisted` with remote UUID
  `26299f65-f48c-45c1-abf0-9c7d521b1a03`, matching the live group-scoped
  episode list (1 episode). Durable and remote are consistent.

## Pre-exit screenshots (in this packet, redacted)

Stored under `screenshots/` (copied from
`closure80-scratch/screenshots-qual/`):

- `qual02-10-inbox-approved.png` — inbox showing the qual02 review in the
  approved (pre-exit) state.
- `qual02-11-detail-approved.png` — detail view (approved, source facts).
- `qual02-12-graph-approved.png` — graph view (no remote episode node yet;
  the persisted episode node appears only after post-exit persistence).
- `qual02-13-audit.png` — audit trail view.

The graph view at pre-exit time correctly shows no remote episode node for
qual02 (0 remote episodes); the episode node + `_episode-index` are expected
only after the post-exit automatic admission persists `ca268f5d...`.
