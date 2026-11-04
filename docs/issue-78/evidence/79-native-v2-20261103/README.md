# Issue #79 first stock-V2 native pilot: evidence handback

This is a **Central-staged review copy** of a bounded host handback, not a
second local execution and not a trusted CI or whole operational-schema PASS.
Original local Build campaign: 2026-11-03, stock OpenCode **2.2.5**.

## Identities and source

- Repository: `fvanevski/opencode-operational-schema-guard`
- Issue branch: `issue/79`
- Start/host-tested source HEAD:
  `32767d5e2a507c1b0a6b3f17378f087495ac2e91`
- Host local edits: uncommitted, three files
  `docs/issue-78/v2-candidate/{plugin.mjs,candidate.test.mjs,README.md}`.
- Received complete source diff SHA-256:
  `c19681e429477705d9438b1a04a9908ffef4cd3baf61d59938703447aa6b3e25`
  (10,719 bytes, supplied separately to Central and inspected).
- Central accepted/rebased source edits as a bounded exact-context commit:
  `7fc3d034b67bf26e98e28210dbc1d99054f7b077`.
  This source commit is the reviewable replacement for an agent-local patch
  path. The prior pilot tests were run **before** this Central commit, not
  independently rerun by Central.
- Frozen host sample: `host-sample-frozen.json`. Original uploaded
  SHA-256: `722dcb03d3e7416e7cf8b5bad501e129020076049960ffddd9ba0f3abceb5b43`.
  Eight cases, labels frozen before selector comparison.

## Host V2 shape observations (local agent report)

- Prompt: `session.prompt` with native `sessionID`, `messageID`,
  prompt fields and `delivery`.
- Context: `session.context` with `system[]`, `messages[]`;
  completed assistant text becomes available in a subsequent context build.
- Tool: `tool.execute.after` with native `callID`, status and nested
  result/output fields.
- Compaction: `session.compaction` observed on three manual compactions.
- Plugin bus exposed `session.execution.*`, `session.step.*`,
  `session.tool.*`, `session.compaction.*` and `session.usage.updated`,
  but the probe saw no `message.updated`, `message.part.updated` or
  `session.idle`. Absence is scoped to the qualified probe, not a
  universal future-version claim.
- Stock V2.2.5 local plugin loader needed a **package directory**.
  File URL pointing to `.mjs` and a symlinked entry did not load.

## Reported tests and measurements

| Test | Host result |
|---|---|
| Syntax checks, 4 modules | 4 exits 0 |
| Candidate suite | 11/11 PASS |
| Issue #75 regressions | 24/24 PASS |
| Frozen 10-case synthetic pilot | old 2/6 valuable, new 6/6, zero noisy |
| Frozen 8-case native sample | old 0/7 valuable, new 7/7, one noisy |

Native sample: new selected 8, valuable 7, noisy 1. No weak-ID fallback
or source-ID collisions observed. Candidate queue report: 8 new, no drops,
opt-out group 0. Initial source experiment was isolated in private
disposable config/state, with Graphiti `add_memory` unavailable and no
reported production/OpenViking writes.

## Known gaps and provenance limits

1. Last assistant reply in a one-turn session may never appear in a later
   context; it is not captured by this adapter.
2. `fromTool` recognizes shell-command-shaped receipts but not native
   `edit`/`write` change receipts; verified file-change capture is open.
3. Legacy node-`--test` PASS regex misses stock `ℹ pass 1` reports.
4. Assistant completion is observed on *next context build*, not immediately.
5. Native plugin-loader packaging and symlink limitations require explicit
   host deployment preflight.
6. `ctx.session.list()` returned a non-array wrapper in the probe; unknown
   for future worker design.

**Central source review notes:** the accepted seen-message ID set is per
session and currently unbounded in a long-lived plugin, while the existing
`cleanExcerpt` drops assistant turns exceeding 1100 characters rather than
truncating them safely. Treat these as unresolved candidate-coverage/memory
issues to resolve before final #79/#80 acceptance, not as host-proven PASS.

**Publication note:** the first local campaign forbade GitHub writes. This
evidence is published by Central after receiving uploaded artifacts.
Future Build campaigns must publish evidence directly under the authorized
issue working branch per `docs/issue-78/REVIEW_EVIDENCE_PACKET.md`.
