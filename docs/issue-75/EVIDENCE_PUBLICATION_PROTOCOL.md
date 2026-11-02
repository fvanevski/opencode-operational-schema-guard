# GHDEV — GitHub working-branch evidence publication contract (Issue #75)

**Purpose:** Central cannot audit host-only `/tmp` artifacts through the GitHub connector. For this issue, every substantive local-agent handback MUST publish a **sanitized, complete-for-the-claimed-scope evidence packet** to the existing working branch before final handback, unless publication is demonstrably unsafe or unavailable. In that case return `EVIDENCE_PUBLICATION_BLOCKED` with an exact cause and a minimal safe fallback; do not claim Central can inspect unshared files.

## Explicit narrow exception to source-write restrictions

```text
REMOTE_SOURCE_UPDATE=forbidden
REMOTE_EVIDENCE_UPDATE=allowed
EVIDENCE_ONLY_FAST_FORWARD=required
PROTECTED_BRANCH_WRITE=forbidden
FORCE_PUSH=forbidden
CENTRAL_SEMANTIC_INTEGRATION=required
```

This grants one **evidence-only** bounded commit/push to the existing `issue/75` working branch; it does **not** permit changing production modules, tested assertions, source/config semantics, implementation patch targets, protected branches, issues, or PRs. Staged source diffs are **read-only review artifacts**, not applied tracked source modifications. Public GitHub publication requires privacy screening; user authorization to provide Central evidence is NOT authorization to publish raw sensitive host material.

## Packet format and accessibility

Use a collision-safe directory under `docs/issue-75/evidence/<YYYYMMDD>-<purpose>-<short-unique-id>/`.
At minimum include *human/GitHub-readable*:
- `README.md`: purpose, repo, source SHA, host code/runtime identities, evidence limits, original vs redacted hash mapping, status and reproduction paths;
- `HANDBACK.md`: full typed handback with private identifiers minimized;
- `RECOVERY_PROPOSAL.json` (or task-specific proposal) with exact claim/status and **redacted** private identifiers;
- `EVIDENCE_MANIFEST.json`: inventory of every published member, size, sha256, classification and original host artifact reference;
- `SHA256SUMS` for the packet's immutable members (avoid circular self-hashing; document exclusions);
- `SOURCE.diff`: proposed local changes as an inspectable UTF-8 diff, even if empty;
- `relevant-installed-source/`: complete **necessary function/trigger/schema excerpts** with file path, exact host file SHA256, line ranges and redaction notes, not unexamined full private source/config;
- `observations/`: narrow sanitized request/response shape, exact original 409 proof (status, route *shape*, timestamp and matching digest; avoid credentials), pre/post gate row fields, receipt/queue absence and consistency checks, test/rollback receipts.

When beneficial, ALSO create `evidence-packet.tar.gz` containing exactly the reviewed safe textual files; this is supplementary, not the only evidence format. GitHub tooling may not expose or inspect binary archives in place. Archive/checksum size should be bounded (default <= 5 MiB uncompressed text where feasible; include useful complete excerpts instead of mass logs), with no unfiltered log/DB/source dump. A packet with only a binary archive, only hash metadata, or a prose claim that 116 private files exist is insufficient for Central independent review.

**Private-by-default exclusions:** secrets, bearer tokens, raw headers/credentials, environment secrets, full session messages, personal content, complete user paths where not required, private graph episode bodies, local account/user identifiers, raw LLM prompts/generations containing private text, whole SQLite databases/WALs, model telemetry token IDs, private indexes, unredacted host process command lines, .pyc, .env and credential-bearing service configuration. Preserve original files unchanged on host for follow-up. Report every redaction and its semantic impact. A **redacted hash differs by design**; never claim byte identity with the original.

## Publication transaction and readback

1. Authenticate remote `refs/heads/issue/75` and current full 40-hex commit SHA. Fetch that exact remote state before constructing the evidence commit; use a dedicated clean evidence worktree, separate from dirty source/experimental worktrees. Do not reset, rebase, stash or clean other worktrees.
2. Build the private candidate packet; evaluate disclosure risk for **each** included file (prefer deny-by-default), generate hashes for final redacted bytes, inspect `git status` and `git diff --cached --stat` / full staged paths; reject any non-allowlisted path, symlink, secret, oversized artifact or source change. Privacy scan is additional evidence, not a substitute for reading every staged artifact.
3. Rerun any applicable **current** repository publication guards on the exact evidence-only diff. Do not pretend a host-only mock test is a required source-publication Verify; determine live gate requirements rather than inventing exemptions. If the guard blocks, stop and return the reason. Do not relax a check to make publication green.
4. Commit **one** evidence-only change whose parent is the freshly authenticated branch head. Immediately before push, require the remote head still equals the expected parent. Push non-force to `issue/75`; on a race, report `STALE` and preserve local commit without force/rebase/retry.
5. Read back the exact remote ref equals published commit SHA; fetch and inspect published tree/paths/hashes via remote or authenticated git; record `PUBLISHED_EVIDENCE_SHA`, `BASE_SHA`, full file list, packet path and GitHub URL. Source diff/implementation files must be unchanged relative to base.
6. Hand back only after a verified publication, or report `PUBLICATION_BLOCKED` with privacy/guard/remote evidence. Do not claim publication success from local `git commit` alone. Updated branch SHA becomes the required exact source head for subsequent Central review.

## Special handling for protected state

Never publish executable production-state repair credentials or raw private database records. An **offline candidate patch** and SQL transaction design may be reviewed as text, but uploading them is not authorization to execute. Re-check the protected live state immediately before any future approved mutation; a published evidence snapshot is historical after new work begins.

## Handback publication receipt

```text
EVIDENCE_PUBLICATION=PASS|BLOCKED
BASE_SHA=<40hex>
PUBLISHED_EVIDENCE_SHA=<40hex or none>
REMOTE_REF_READBACK=<40hex or not_verified>
PACKET_PATH=<relative path>
PACKET_FILE_COUNT=<number>
PACKET_MANIFEST_SHA256=<hash>
ARCHIVE_PATH=<path or none>
ARCHIVE_SHA256=<hash or none>
REDACTIONS=<enumerated types, counts, original-vs-published hash relation>
PUBLISHED_SOURCE_PATH_CHANGES=none
GIT_STATUS_AFTER=<clean or exact residual>
PRIVATE_ARTIFACT_ROOT=<path, no link implication>
COMMAND_SHAPE_FRICTION=<canonical GHDEV-10 fields>
```

This is an Issue #75 contract. Apply the same evidence-publication clause explicitly in future GHDEV handoffs on other working branches **only when the user has authorized that evidence-only GitHub mutation and the repository permits it**. Never assume that an ordinary `REMOTE_UPDATE=forbidden` role permits pushing.
