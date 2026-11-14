# Issue #92 — Final prospective integration (evidence-only)

PRIMARY_AGENT=Hermes (Build) · REPO=fvanevski/opencode-operational-schema-guard · BRANCH=work/91-memory-utility-r1
REQUIRED_HEAD=`a564d397bf66ec2f90db4f06f9cd43a0252ef9d7` · CONTROLLING_CONTRACT=`ISSUE92_V4_FINAL_RATIFICATION_HERMES.md`
EVIDENCE_ROOT=`docs/issue-91/evidence/92-final-prospective-integration/` · one CPU-only assignment, evidence-only, single commit.

Central corrected the prospective staging group's hard pin. This campaign: authenticate the head,
integrate the corrected staging, do the final source-label review, freeze the immutable pre-inference
roster into its own fresh empty group, and prepare (not run) the gated prospective launch. No v2
clearing, no memory-architecture rework, no commit-gate change, no exposed-campaign rerun, no
acceptance-standard change, no model calls, no Graphiti writes, no PR/merge/#92 closure.

## Result

`RESULT=FINAL_A3_READY_FOR_APPROVAL`

- **Task 1 (verify + integrate):** head `a564d397` authenticated; the corrected
  `issue92-a3-stage.mjs` now stages into the declared fresh group (`...prospective-v[2-9]`), with a
  new 3-test staging-isolation regression. All focused tests green (stage 3/3, A3-acceptance 12/12,
  `npm run check` 0, `npm test` 524/524). The final v4 roster stages into its **own fresh group
  `...prospective-v4` (27 native spans)**, not the populated historical v2 (13 v3 episodes).
- **Task 2 (source-label review):** v4-09 (fsm81 export) and v4-10 (fsm81 terminal) were **identical
  text** to v3-10 / v3-09 (not materially different) → **replaced** with two genuinely-unused,
  source-supported, privacy-clean findings: `msg_0bffbf941001` (HEVC video-density threshold
  ~19-21 MiB/min, derived from Plex-library observation) and `msg_10750e113001` (durable segment must
  be sealed before its deferred commit). Sanitized 20-case roster with source-identity hashes +
  temporal scope published.
- **Task 3 (freeze + prepare):** final immutable pre-inference roster + label digest (manifest
  `eed37ce1…`, label `ee8f88f4…`), earlier v4 preserved as `issue92-a3-v4-corpus-historical.json`;
  staged into fresh `state-v4` + empty `...v4` group (0 episodes); EX bridge negative preflight PASS,
  once-only marker absent, immutable source binding → `a564d397` (8 blobs); scorer validates the
  freeze and fails closed at `insufficient_review_samples`. Launch command prepared, **not executed**.

## Files

| File | Purpose |
|------|---------|
| `task1-verify.json` | Head authentication, stage-hard-pin correction, all test exits/counts, staging integration. |
| `task2-source-label-review.json` | v4-09/v4-10 sibling review + replacements, full sanitized 20-case roster (hashes + bounded quotations + temporal scope). |
| `task3-freeze-prepare.json` | Final freeze (manifest/label SHAs, 27 spans), treatment, EX/once-only/source bindings, scorer readiness, empty-group proof, ready-to-run command. |
| `ghdev10-friction.md` | Complete GHDEV-10 command-shape friction. |
| `final-prospective-handback.md` | Consolidated terminal handback. |

Private (0600, host-side, referenced by digest) under
`/home/filip/.local/state/ghdev-graphiti-issue92/private/`: `issue92-a3-v4-corpus.json` (final
manifest), `issue92-a3-v4-corpus-historical.json` (earlier v4), `issue92-a3-v4-ratification.json`,
`issue92-a3-v4-{remote-readback,fact-adjudications,authority-audit}.json` (post-inference
templates); staged receipt `/tmp/opencode/issue92-a3/state-v4/a3-v2-staged.json`.
