# Handback — Issue #81 descriptive fixture-naming slice (81-fixture-naming-v1)

```
RESULT=PARTIAL
```

One completed naming-verification campaign and one evidence-only commit on
`issue/81`; the PR remains ready for renewed Central independent review
(`INDEPENDENT_REVIEW=Central_owned`). `PARTIAL` because the committed source
carries one blocking production-code defect (F-1) whose failing regression is
preserved and whose minimal patch is proposed, verified, and uncommitted
pending Central review.

## What was done

- Authenticated `0e30106ced8da710b23b4e474b57f4e184752ce1` (PR #83 head,
  open draft, CI green) and reviewed the complete three-commit diff.
- Verified naming invariants A–F PASS and G PARTIAL (F-1).
- Focused CPU suite: 81 pass / 6 fail at committed source (single root
  cause: `terminal-recovery.mjs` legacy group fence). Minimal patch
  verified in working tree → 87/87; file restored, regression preserved.
- Wider CPU suite (22 files): 129 pass / 6 fail (same 6).
- Portal `npm ci` + `npm run check` + `npm run build`: all exit 0.
- Read-only host inventory: 16 machine groups + 4 fixture units mapped with
  purpose, producers, consumers, action, evidence; the two historical
  cron-holdout episode UUIDs and production baseline verified by
  group-scoped remote readback; unlisted identifiers marked
  unclassified (no fabricated purpose).
- Disposable new-name lifecycle: isolated 0700 scratch root, six IDs
  verified absent, all 8 integration checks PASS, scratch cleaned,
  historical state preserved.
- Frozen cron benchmark re-scored via `adjudicate.mjs score` with a new
  write-once output: all required accounting met; output byte-identical to
  the previous accepted score (`522f9285…4aa2c60`); zero drift.
- Nonmutation: production group, historical groups, signed inputs, and
  Graphiti episodes untouched (read-only operations only).

## Blocking defect returned to Central

**F-1** — `docs/issue-78/v2-curator/terminal-recovery.mjs` still fences
recovery groups to `cur80_*` (line 11, used at 20/52/124) while the updated
CLI (`validRecoveryBinding`) and committed regression use
`graphiti-curator-recovery-r01`. Six committed regression tests fail.
Minimal 4-line patch proposed in `source-review.md` (import
`isFixtureGroup`; `GROUP_OK=g=>isFixtureGroup(g,'recovery',{allowLegacy:true})`);
verified to turn the focused suite 87/87 without weakening any fence.

Non-blocking: F-2 (`render-qualification.mjs` CLI fence), F-3
(`prepare-review.mjs` fence) — fail closed; same-class suggestions
provided.

## Remaining gates (not in this phase)

1. Central review of F-1/F-2/F-3 (independent review is Central-owned).
2. Land the F-1 patch (or Central's equivalent) and re-run the focused suite
   (expected 87/87).
3. EX-gate activation, fresh-client acceptance, merge — unchanged, later.

No merge, no production install, no Graphiti mutation, no EX activation, no
model calls, no post-exit drain in this phase.

```
SOURCE_MUTATION=none (committed source unchanged; working-tree patch verified and restored)
GRAPHITI_MUTATION=none
MODEL_CALLS=0
```
