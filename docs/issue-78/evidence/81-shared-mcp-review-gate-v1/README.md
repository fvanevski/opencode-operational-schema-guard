# Issue #81 — Shared-MCP review gate and bounded fixture-name inventory packet

Campaign: `ISSUE81_SHARED_MCP_REVIEW_GATE_V1`
Controlling handoff: `docs/issue-78/v2-benchmark/ISSUE81_SHARED_MCP_REVIEW_GATE_HANDOFF.md` (at the exact implementation head)
Repository: `fvanevski/opencode-operational-schema-guard` — Issue #81, draft PR #89

## Exact identities

- Implementation branch `issue/81-source-recall-correction` remote head (kickoff SHA): `7a82f0099bd5c281a12d2377326e0671aa8d5b33`
- PRE_CORRECTION_HEAD: `5d6b285eec078ebf320e13578c1f650fe5fca5b6`
- Base `main`: `9a27b73de882c0af6fec4d86de81945338611479`
- PR #89: OPEN/DRAFT, head `issue/81-source-recall-correction` @ `7a82f0099bd5c281a12d2377326e0671aa8d5b33`, base `main`, not merged (verified at kickoff)
- Prior evidence-branch head carrying the 13/16 packet: `77acfac89f3b8935c2398dfe0049eb409a5c6df9` (`docs/issue-78/evidence/81-git-procedure-selection-v1/`)
- All source inspection and tests ran from a fresh detached worktree at the exact kickoff SHA; the operator checkout and its untracked file were preserved and restored.

## What this packet records

- `shared-client-overlap-tests.json` — exact diff-scope confirmation (GraphitiMcp per-client queue + two regression tests + this handoff only), `node --check` producer exits, focused-suite producer exit and per-file counts, and an independent mock-transport verification: remote `maxActive=1` under two- and three-way `Memory.search` overlap, FIFO single-shot call order, mid-queue exception surfaced with no retry and no queue poisoning, exactly-once initialization, and unchanged sequential single-request behavior.
- `fixture-name-inventory.json` — bounded read-only inventory of active issue-derived opaque Graphiti fixture identifiers (`cur80_*`/`cur81_*` families) and their producers/consumers across the Issue #78 source/scripts, CLI/options, status/discovery, cleanup, tests, host units and state roots; every match classified (active writer / active consumer / immutable historical / legacy group / production namespace) with recommended readable labels for Central consideration.
- `review-readiness.md` — read-only revalidation of the 126-item operator-review packet and ratified precision target, `HUMAN_PRECISION`/`HOOK_P95` status, and the head-of-line/300 ms context-allowance analysis for the new queue.
- `command-shape-friction.json` — canonical GHDEV-10 command-shape friction ledger for this gate.

## Historical 13/16 source-selection qualification

The exact-source exposed **13/16 PASS** (ratified target `>=13/16`) was established at
PRE_CORRECTION_HEAD `5d6b285` by campaign `ISSUE81_GIT_PROCEDURE_SELECTION_V1`, published in
`docs/issue-78/evidence/81-git-procedure-selection-v1/` (evidence commit `77acfac`). The staged
patch at `7a82f00` touches MCP call scheduling only (the `GraphitiMcp.call` promise-tail queue);
source selection, ranking, relevance/source/identity/private guards, candidate depth, output
shape and model/curation paths are unchanged in the diff. The 13/16 evidence is therefore reused
here as **historical corroboration only** — this gate did not re-run a full native benchmark and
does not claim a new exact-head 13/16 replay. Immutable historical scores remain: original 8/16,
post-S06 native 9/16, earlier exposed 12/16.

## Sanitization

No raw query text, fact text, source excerpts, credentials, private worksheet bytes, or raw
model messages are in this packet. Group IDs, episode UUIDs, SHA256 digests, and machine
identities are the identity surface. Private host paths are redacted to `<host-home>` /
`<scratch>`. Private raw logs (focused-suite log, overlap-verification log, prior-evidence
extracts) remain on the host under `<scratch>` at `0600`.

## Nonmutation statement

No production source was modified, no live fixture was renamed, no repository/runtime
configuration changed, and no deploy, merge, PR, or issue closure occurred. Exactly one
sanitized evidence-only commit was published under
`docs/issue-78/evidence/81-shared-mcp-review-gate-v1/` on `issue/81-recall-acceptance` (this
packet). The implementation branch was not mutated.
