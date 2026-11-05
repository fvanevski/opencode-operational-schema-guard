# Validation — Issue #81 fixture-naming slice (CPU-only)

Source head tested: `0e30106ced8da710b23b4e474b57f4e184752ce1` (detached
worktree, clean). Node `v26.13.0`. All commands run from the repository root
unless noted.

## 1. Source authentication

```
git status --short                      # clean at b92c57f8… (previous accepted head)
git fetch origin refs/heads/issue/81
git rev-parse FETCH_HEAD               # 0e30106ced8da710b23b4e474b57f4e184752ce1
git switch --detach 0e30106ced8da710b23b4e474b57f4e184752ce1
git rev-parse HEAD                     # 0e30106ced8da710b23b4e474b57f4e184752ce1
```

PR #83 readback: `state=OPEN`, `isDraft=true`, `headRefName=issue/81`,
`headRefOid=0e30106ced8da710b23b4e474b57f4e184752ce1`, base `main`;
CI `node-contract` SUCCESS (run 41950936052).

Full diff reviewed: `git diff b92c57f8…..0e30106…` — 20 files, +363/−28,
three commits (`4aac6ae`, `5863894`, `0e30106`).

## 2. Syntax checks

`node --check` on all 8 modified JS sources and all 6 modified/new test
files: **14/14 SYNTAX_OK** (fixture-groups.mjs, stage-holdout.mjs,
evaluate.mjs, candidate-cli.mjs, curator-cli.mjs, efficiency-probe.mjs,
portal-server.mjs, terminal-recovery-cli.mjs, fixture-groups.test.mjs,
evaluate.test.mjs, stage-holdout.test.mjs, efficiency-probe.test.mjs,
portal-api.test.mjs, terminal-recovery.test.mjs).

## 3. Focused CPU suite (committed source)

```
node --test \
  docs/issue-78/fixture-groups.test.mjs \
  docs/issue-78/v2-benchmark/stage-holdout.test.mjs \
  docs/issue-78/v2-benchmark/evaluate.test.mjs \
  docs/issue-78/v2-benchmark/adjudicate.test.mjs \
  docs/issue-78/v2-benchmark/diagnose-capture.test.mjs \
  docs/issue-78/v2-curator/efficiency-probe.test.mjs \
  docs/issue-78/v2-curator/terminal-recovery.test.mjs \
  docs/issue-78/v2-curator/portal-api.test.mjs \
  docs/issue-78/v2-curator/curator.test.mjs \
  docs/issue-78/v2-candidate/candidate.test.mjs \
  docs/issue-78/v2-candidate/association.test.mjs
```

Result: **exit 1 — pass 81, fail 6** (all 6 in
`docs/issue-78/v2-curator/terminal-recovery.test.mjs`):

| # | Failing test (file:line) | Observed error |
| --- | --- | --- |
| 1 | `anonymous chronological evidence is explicitly inference, not UUID-level proof` (test:19) | `INVALID_QUEUE_LOG_INPUT` |
| 2 | `dry run never mutates review, requires attestation for apply, and never calls add_memory` (test:59) | `INVALID_OPERATOR_RECOVERY_SCOPE` |
| 3 | `explicit source-bound recovery persists true success, records failure without replay` (test:69) | `INVALID_OPERATOR_RECOVERY_SCOPE` |
| 4 | `remote mismatch cannot mutate local records` (test:81) | `INVALID_OPERATOR_RECOVERY_SCOPE` |
| 5 | `never-submitted staging reconciles to approved only with exact scope, zero-episode readback and attestation` (test:128) | `INVALID_NEVER_SUBMITTED_SCOPE` |
| 6 | `never-submitted adjudication rejects present remote episodes, stale revisions and audit mismatch` (test:149) | `INVALID_NEVER_SUBMITTED_SCOPE` |

**Single root cause:** `docs/issue-78/v2-curator/terminal-recovery.mjs`
line 11 retains the legacy fence `const GROUP=/^cur80_[a-z0-9_-]{3,60}$/;`
(used at lines 20, 52, 124), while this diff updated
`terminal-recovery-cli.mjs` to `validRecoveryBinding` (accepts named
recovery groups) and the test to `graphiti-curator-recovery-r01`. See
`source-review.md` finding F-1 (blocking) with the verified minimal patch.

## 4. Minimal patch verification (working tree only, not committed)

Applied the 4-line minimal patch to `terminal-recovery.mjs` (import
`isFixtureGroup`; replace the three `GROUP.test(group||'')` uses with
`isFixtureGroup(group,'recovery',{allowLegacy:true})`):

- `node --test docs/issue-78/v2-curator/terminal-recovery.test.mjs` →
  **exit 0, pass 6, fail 0**.
- Full focused suite with patch → **exit 0, pass 87, fail 0**.
- File then restored to the committed state (`git restore`); the failing
  regression is preserved at the committed source. The patch is returned to
  Central as a proposal, not committed.

## 5. Wider directly-relevant CPU suite (committed source)

All 22 test files under `docs/issue-78` and `docs/issue-75`
(including long-prompt, graph-evidence, graph-preview, model-policy,
activation prepare-review/render-qualification, evidence closeout):
**exit 1 — pass 129, fail 6** (the same 6 terminal-recovery failures;
nothing else fails). Existing group handling and the source-attribution
correction remain intact.

## 6. Portal typecheck and build

```
cd docs/issue-78/v2-curator/portal
npm ci          # dependencies absent; committed lockfile preserved; 0 vulnerabilities
npm run check   # tsc --noEmit → exit 0
npm run build   # tsc --noEmit && vite build → exit 0 ("✓ built in 957ms";
                # benign "use client" directive notes from Radix prebuilt bundles only)
```

`dist/` is untracked (not committed); `node_modules` is git-ignored.

## 7. Disposable new-name integration test (isolated CPU scratch)

- Scratch root `/tmp/opencode/issue81-naming-v1` created **mode 0700**,
  fresh (distinct from all active state directories and prior holdout
  campaign paths).
- All six candidate IDs verified **absent** in
  `<host-home>/.local/state/ghdev-graphiti*` and
  `/tmp/opencode/issue81-qual` before any write.
- `integration-test.mjs` (archived; SHA-256
  `4a5e89553e3d287083e1378c9009c49fa24682f5c01f437d7a067f265c6291d9`,
  staged synthetic event sample SHA-256
  `294f2c25424a05449e09d654359387d5f75c67996e27cb2acc26b8899b0c5f55`)
  exited 0 with every check PASS:
  1. naming constructor/parser + safe-group validation
     (`fixtureGroupName`, `parseFixtureGroup`, `isFixtureGroup`,
     issue-number/hex/`cur*` domain rejections, production-group rejection);
  2. native-shaped synthetic event staged in `graphiti-cron-capture-r01`
     via the existing `CandidateQueue` adapter (`status: staged`,
     `source_strength: native-id`, event id `e00ed8fb…` — synthetic);
  3. `candidate-cli.mjs status|list --group graphiti-cron-capture-r01
     --state-dir <scratch>` → `total: 1`, `counts.new: 1`;
  4. CLI output reports exact machine ID `group: graphiti-cron-capture-r01`
     and descriptive label `fixture.label: "Cron / Capture / Run 01"`
     (`kind: named_fixture`);
  5. same-group `queue.get` returns the event; a `graphiti-webvtt-capture-r01`
     queue rejects the cross-group source (`invalid`, `get` → null);
  6. `stage-holdout plan()` on a disposable synthetic corpus
     (`graphiti-cron-development-r01` scope) → 1 selected into
     `graphiti-cron-holdout-r01`; `graphiti-webvtt-holdout-r01` and
     `ghdev_gh_mcp` both throw `HOLDOUT_SCOPE_REQUIRED` (no human
     ratification fabricated — `plan` is pure);
  7. `fixtureUnitName('graphiti-curator-recovery-r01')` =
     `ghdev-curator-recovery-r01`; `validRecoveryBinding` accepts the exact
     pair and rejects the r02 unit and `ghdev_gh_mcp`; the disposable
     service/path templates were rendered through the generic `renderUnits`
     core (23-line service, zero unrendered placeholders, exact
     `--group graphiti-curator-recovery-r01` retained) — **not installed,
     started, or enabled**;
  8. portal status label verified by the committed
     `portal-api.test.mjs` regression (asserts `fixture.kind =
     named_fixture`, label `Curator / Qualification / Run 01`, exact
     `scope` group) — PASS in the focused suite — plus the frontend build
     above.
- No synthetic event was promoted to Graphiti; no remote calls were made by
  the scratch test.
- Cleanup: only the newly created scratch resources
  (`/tmp/opencode/issue81-naming-v1/**`, ownership authenticated) were
  removed; all historical state preserved.

## 8. Commands and exit codes (summary)

| Command (shape) | Exit |
| --- | --- |
| `git fetch` + `rev-parse FETCH_HEAD` | 0 |
| `git switch --detach 0e30106…` | 0 |
| `node --check` ×14 | 0 |
| focused `node --test` (11 files, committed source) | 1 (81 pass / 6 fail, known defect) |
| focused `node --test` (11 files, minimal patch in working tree) | 0 (87/87) |
| wider `node --test` (22 files, committed source) | 1 (129 pass / 6 fail, same defect) |
| `npm ci` / `npm run check` / `npm run build` | 0 / 0 / 0 |
| `adjudicate.mjs score` (new write-once output) | 0 |
| disposable integration test | 0 (all checks PASS) |
