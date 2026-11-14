# Issue #92 — Balanced recovery and completion campaign (evidence-only)

PRIMARY_AGENT=Hermes (Build) · REPO=fvanevski/opencode-operational-schema-guard · BRANCH=work/91-memory-utility-r1
REQUIRED_HEAD=`e31d22bbd4865d752a81995a457438c9d9904cde` · CONTROLLING_CONTRACT=`ISSUE92_BALANCED_RECOVERY_COMPLETION_HERMES.md`
EVIDENCE_ROOT=`docs/issue-91/evidence/92-balanced-completion/` · SOURCE_REMOTE_UPDATE=forbidden · SEMANTIC_REMEDIATION=forbidden

One consolidated Build campaign: authenticate the balanced-dedup source, diagnose the failed
prospective A3 cohort (no inference), reconcile the two evidence inconsistencies, and prepare the
next genuinely untouched prospective qualification. Evidence-only, single commit, no PR/merge/
deploy/#92 closure, no production source change, no historical replay.

## Result

`RESULT=READY_FOR_ONE_FINAL_PROSPECTIVE`

- **A (verify):** all focused regressions green (finite-batch 61/61 incl. 5 new balanced-dedup,
  claim-evidence 7/7, ex-admission 2/2, A3-acceptance 12/12, Python EX bridge OK, `npm run check`
  exit 0, `npm test` 524/524). No Central source defect; no semantic remediation.
- **B (diagnose, no inference):** the 3 missed valuable targets (v3-02/05/07) were **discovered**
  but **deferred at the claim-support gate** (v3-02 `not_substantive`→SKIP; v3-05/07
  `claim_support_missing_predicate`→DEFER) — model-selection false negatives, not discovery
  omissions. 5 duplicates are same-predicate (balanced-dedup can compare/suppress them); the
  distinct v3-08 pair (pure-function + unhandled-event) is preserved. A1 population: **1,423**
  full-native vs **1,113** genuinely-new subset (the v3 raw-opportunity file conflated the two
  labels). A3 batch identity: authoritative immutable batch = **`6287a0ee…`** (the terminal
  handback's `226621f6…` was a transcription error).
- **C (prepare):** fresh v4 cohort (10 valuable [6 real-dev + 4 new fsm81] + 10 controls), 0
  message-ID overlap with v3/v2/B3/gh_mcp, 34 staged native spans, frozen pre-inference
  (manifest `9b64831e…`, label `b3668088…`), fresh `state-v4` root, preflighted v4 launcher
  (`--balanced-dedup on`, negative EX preflight PASS), scorer validates the freeze + fails closed
  at `insufficient_review_samples`. The v4 inference is **gated** on Central's acceptance.

## Files

| File | Purpose |
|------|---------|
| `a-balanced-dedup-verification.json` | A: required-head authentication, modified files, all test exits/counts, the 5 balanced-dedup invariants. |
| `b-a3-diagnosis.json` | B: 3 missed-target first-loss stages, 5-duplicate source/semantic analysis, A1 population reconciliation, A3 batch identity. |
| `c-v4-prospective-freeze.json` | C: v4 cohort freeze (manifest/label SHAs, 34 spans), treatment (`--balanced-dedup on`), launcher preflight, empty-group proof, scorer readiness, execution command. |
| `ghdev10-friction.md` | Complete GHDEV-10 command-shape friction. |
| `a3-balanced-completion-handback.md` | Consolidated terminal handback. |

Private (0600, host-side, referenced by digest): `issue92-a3-v4-corpus.json` (manifest),
`issue92-a3-v4-ratification.json`, `issue92-a3-v4-{remote-readback,fact-adjudications,
authority-audit}.json` (post-inference templates) under
`/home/filip/.local/state/ghdev-graphiti-issue92/private/`; staged receipt
`/tmp/opencode/issue92-a3/state-v4/a3-v2-staged.json`.
