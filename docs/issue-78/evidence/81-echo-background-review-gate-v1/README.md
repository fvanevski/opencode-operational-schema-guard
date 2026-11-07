# Issue #81 — reranker echo-background review gate: evidence packet

Campaign: `ISSUE81_ECHO_BACKGROUND_REVIEW_GATE_V1`
Controlling handoff: `docs/issue-78/v2-benchmark/ISSUE81_ECHO_BACKGROUND_REVIEW_GATE_HANDOFF.md`
(blob `d4942a4478f6a678e42be1cee909446656ba118b`, at the exact implementation head)
Repository: `fvanevski/opencode-operational-schema-guard` — Issue #81, draft PR #89
Primary agent: `evidence`; bounded CPU-only review-evidence campaign (no service mutation,
no full 16+4 replay, no human precision adjudication, no deploy/merge/PR/closure).

## Exact identities

- Implementation branch `issue/81-source-recall-correction` remote head (kickoff SHA):
  `eb20f06680e3558b67a54b2b288122efe2359eba`
  - tree `1adc569b943e56b35f5b4536e032b1f28870cd61`, parent `e750d9922ad2b83ff26f3deac4b081ebd5e64587`
- PRE_CORRECTION_HEAD: `a78ebb69926e9e4bc2e7d9c036d65501c911294e`
- Base `main` (= BASE_MAIN, verified on remote): `9a27b73de882c0af6fec4d86de81945338611479`
- PR #89: OPEN/DRAFT, head `issue/81-source-recall-correction` @
  `eb20f06680e3558b67a54b2b288122efe2359eba`, base `main`, not merged
  (independently verified via GitHub API before any local object/worktree proof)
- Evidence-branch head immediately before this commit (CAS re-verified immediately before
  publication): `b39631e70d2e5fedb3d6f2d441b4cfc3f71c4e7d`

## Scope diff (PRE_CORRECTION_HEAD..kickoff)

Exactly three files — the explicit correction plus this host contract only. No protected
control-plane or unrelated production edits:

- `M docs/issue-75/v2-candidate/relevance.mjs`
  (pre blob `8478c0432c4d5a07662efaabbb70a38e0dd87e0f` → head blob
  `46749f1d8fbe37ac97b79ffba711e115897a07d6`)
- `M docs/issue-75/v2-candidate/relevance.test.mjs`
  (pre blob `62380424d470844c99bc972cfdf2fcce39e2f020` → head blob
  `516fc18499ecdacea588028bf00f048f97cacfd0`)
- `A docs/issue-78/v2-benchmark/ISSUE81_ECHO_BACKGROUND_REVIEW_GATE_HANDOFF.md`
  (head blob `d4942a4478f6a678e42be1cee909446656ba118b`)

Memory.search/GraphitiMcp and plugin files are byte-identical to PRE_CORRECTION_HEAD.

## What this packet records

- `exact-source-and-tests.json` — exact PR head/base/tree, scope diff with blob identities,
  `node --check` producer exits, complete focused suite (82/82, producer exit 0), named
  regression guards (shared-client FIFO, Codex P1/P2/P2, echo regressions), production-host
  effective-config readback (`rerankEndpoint` unset → `ranker=null`), trusted Actions
  receipt status (ABSENT at the exact head), and the authenticated historic 13/16 packet.
- `reranker-echo-background-proofs.json` — source inspection of all three echo gates at the
  exact head, plus an independent deterministic in-memory ranker scenario (direct and cached
  paths) proving an excluded tool-question echo cannot influence the semantic-choice
  background comparator.
- `review-readiness.md` — gate status, `HOST_REVIEW_READY` determination, native/human gate
  status, and Central's next-decision boundary.
- `command-shape-friction.json` — GHDEV-10 command-shape friction ledger for this campaign.
- `SHA256-MANIFEST.txt` — SHA-256 of every file in this packet.

## Historical 13/16 source-selection qualification

The exact-source exposed **13/16** PASS (ratified `>=13/16` threshold) was established by
campaign `ISSUE81_GIT_PROCEDURE_SELECTION_V1` and is published in
`docs/issue-78/evidence/81-git-procedure-selection-v1/16-case-replay.json` on this evidence
branch. Its unchanged 256-episode cohort/roster SHA256 is
`47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652`
(`roster_path_class`: private 0600, read-only, never altered). This gate reuses it as
**prior-head corroboration only** (ranker=null, exposed offline diagnostic, not native
acceptance). No new ranker-null replay result is claimed by this campaign.

## Sanitization

No raw private source data, prompts, token/credential material, operator worksheets, host
logs, or full private fact text are in this packet. Scenario fixtures are synthetic
(evidence-agent-authored, not host data). Group IDs, episode/session identifiers, SHA256
digests, and machine identities form the identity surface. Private host paths are redacted
to `<scratch>`. The raw focused-suite log and the scenario script remain on the host under
`<scratch>` at restricted mode.

## Nonmutation statement

No production source, semantic test, host service, curation state, or control infrastructure
was modified. No implementation-branch push, deploy, merge, new PR, formal approval, or
issue closure occurred. Exactly ONE sanitized evidence-only commit (this packet, confined to
`docs/issue-78/evidence/81-echo-background-review-gate-v1/`) is published on
`issue/81-recall-acceptance` as a non-force fast-forward from `b39631e70d2e5fedb3d6f2d441b4cfc3f71c4e7d`.
