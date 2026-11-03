# Evidence packet publication contract for future local Build campaigns

Applies to the Issue #78 integrated #79/#80/#81 working-branch campaign, and
should be projected into other GHDEV Build handoffs when Central expects host
artifacts that are otherwise inaccessible from GitHub. It is **not** retroactive
authorization for the completed first #79 pilot, whose remote writes were
expressly prohibited. Central remains responsible for substantive source
review and GitHub source integration.

## Required output and publication

Every future Build handoff must explicitly set the **evidence-write permission**
and identify the same authorized issue working branch, e.g.
`EVIDENCE_REMOTE_UPDATE=allowed`, `SOURCE_REMOTE_UPDATE=forbidden`,
`EVIDENCE_ROOT=docs/issue-78/evidence/<issue>/<campaign>`.
The permission is confined to **one sanitized evidence-only commit** at the
end of the campaign, if GitHub push permissions are actually available. Do not
treat this as authorization to push source changes, alter tests/requirements,
force push, merge, publish a PR, write production Graphiti state or edit a
protected branch. A general `REMOTE_UPDATE=forbidden` contract overrides
this unless Central expressly scopes this evidence-only exception.

Package a **self-contained, inspectable** review bundle. Include when generated
or relevant:

- `manifest.json`: repo, issue, branch, exact starting/source commit SHA,
  tested tree/source SHA, test environment, evidence commit SHA if known,
  changed paths, artifact paths, SHA-256 content hashes, absent artifacts and
  reasons; immutable names; no invented evidence.
- `handback.md`: bounded RESULT, exact source identity and changed files,
  commands/exits/counts, runtime/version/hook shape receipts, acceptance
  findings, invariants, blockers and known gaps, deployment/side-effect
  declaration, plus canonical complete `COMMAND_SHAPE_FRICTION`.
- `source.patch` (or bounded exact changed-file copies): **full proposed
  source diff**, including new/untracked files, relative to the authenticated
  starting head. Do not substitute a prose summary, diff hash or agent-local
  absolute path for reviewable source bytes.
- Frozen, sanitized pilot fixtures, scoring inputs and per-case labels
  **before** tuning, plus deterministic result summaries and focused
  regression receipts (commands, exit codes, test counts and relevant
  sanitized failures). Host/service integration results must identify exact
  disposable session/service boundaries and segregate observation from
  inference.
- If a relevant artifact is unsafe or too large to publish, include a bounded
  sanitized substitute and an **omitted-with-reason** entry in the manifest.
  Never stage tokens, private prompts, full transcripts, raw source dumps,
  credentials, home directories, system logs or protected runtime state.

Place the packet under one repository-relative campaign directory, never in
`/tmp` as its only surviving location. Use deterministic filenames and
checksums. Keep a frozen sample immutable; revisions must produce separately
identified versioned evidence, never silently relabel it.

## Publication / verification boundary

1. Finish source and host checks; freeze and audit each packet file for privacy.
   Review **exact files** before publication. Generate the portable source
   diff while retaining source changes locally uncommitted unless Central
   separately authorized a source commit.
2. Stage **only** the issue-scoped evidence directory by explicit paths.
   Verify `git diff --cached --name-status` shows no production/source,
   credential, global config, or unrelated paths. A commit must not sweep
   `git add -A` across the workspace.
3. Immediately before pushing, fetch and verify the remote **issue branch**
   still equals the authorized start head. Commit a single evidence-only
   commit with that parent (source changes remain uncommitted). Push fast
   forward without force, amendment, or history rewriting. If branch advanced
   unexpectedly, **stop STALE** and return the local packet; do not rebase,
   overwrite or automatically retry.
4. Read back the exact remote ref and packet files, verify the published commit
   SHA, paths and checksums. If the host cannot push, or policy rejects it,
   return `EVIDENCE_PUBLICATION=BLOCKED` with exact denial, plus the
   complete downloadable/sanitized packet through a supported handback path;
   never claim it was staged.
5. Return `EVIDENCE_PACKET_REF` (GitHub path and exact commit SHA),
   `EVIDENCE_PACKET_SHA256`/manifest hashes, `EVIDENCE_PUBLICATION`,
   source-diff identity, and `UNCOMMITTED_SOURCE_CHANGES`. Do not claim
   tests reran on the evidence-only commit unless they did; distinguish the
   tested source bytes and the evidence publication commit.

This evidence exception does **not** relax separate GHDEV-07 exact-head
read-before-write and readback controls or GHDEV-05 independent Central review.
If the selected primary is strict read-only `evidence`, it cannot commit/push;
an explicitly authorized **Build** handoff or Central must publish the packet.
