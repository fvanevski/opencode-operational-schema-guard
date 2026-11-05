# Issue #81 — CPU/source verification checks (closeout v1)

Exact-head disposable worktree at `036017058a0abdbfc20dde1fd076926ce8ef6d4f`
(base `d7c32f503eaa4cf4c52bb055b434e0ac71b76f45`), Node v26.13.0 (≥22). All checks are
read-only against source and frozen corpora; no model, GPU or Graphiti mutation.

## 1. Node syntax (`node --check`)

All 14 staged source/test files pass:
`v2-benchmark/{diagnose-capture,evaluate,adjudicate,stage-holdout}.mjs` + their
`*.test.mjs`, `v2-curator/{curator-cli,curator,model-policy,efficiency-probe}.mjs` + the
`model-policy`/`efficiency-probe` tests. (No failures.)

## 2. Focused regression suites (exact head, real host tests)

| suite | tests | pass | fail | exit |
|---|---|---|---|---|
| v2-benchmark/diagnose-capture.test.mjs | 2 | 2 | 0 | 0 |
| v2-benchmark/evaluate.test.mjs | 9 | 9 | 0 | 0 |
| v2-benchmark/adjudicate.test.mjs | 4 | 4 | 0 | 0 |
| v2-benchmark/stage-holdout.test.mjs | 2 | 2 | 0 | 0 |
| v2-curator/curator.test.mjs | 32 | 32 | 0 | 0 |
| v2-curator/model-policy.test.mjs | 2 | 2 | 0 | 0 |
| v2-curator/efficiency-probe.test.mjs | 2 | 2 | 0 | 0 |
| v2-candidate/candidate.test.mjs (unchanged #79 safety) | 15 | 15 | 0 | 0 |
| **total** | **68** | **68** | **0** | all 0 |

These are the actual host tests at the exact current head, not retroactive credit from an
earlier 66/66 run.

## 3. Central capture diagnostic (offline, no inference)

`diagnose-capture.mjs diagnose` run once per split with create-exclusive 0600 output:

- development: `missed=10` → gates `TOOL_RESULT_EXIT_AND_TEXT_MISSING` ×5,
  `PROMPT_TEXT_SAFETY_OR_FORMAT_VETO` ×5; recall 27/37 = 0.7297.
- holdout: `missed=3` → gates `TOOL_RESULT_EXIT_AND_TEXT_MISSING` ×1,
  `PROMPT_TEXT_SAFETY_OR_FORMAT_VETO` ×1, `MISSING_SHELL_COMMAND` ×1; recall 3/6 = 0.500.

Both reproduce the 13 adjudicated misses exactly. `no_mutations=true`, no raw corpus or
native event text exported to logs.

## 4. Proposed read-tool fix: RED/GREEN + regression

- Focused test `read-tool-closeout.test.mjs` (staged as an evidence artifact):
  - RED on unpatched source: runner exit **1** (read receipt is `null`).
  - GREEN after `source.patch` (`FILE_TOOLS += 'read'`): runner exit **0**.
- Post-patch regression: the full 68-test suite **stays green** (all exit 0), plus the new
  test (68 + 1). No source file is modified in the published evidence commit; `events.mjs`
  is restored to its exact-head bytes and `source.patch` is the proposed diff only.
- Patched-source replay confirms zero recall delta on the frozen corpora
  (ho-gui-read remains scope-fenced; see root-cause-report.md §2.3).

## 5. Frozen-source and published-packet integrity

- Development corpus SHA-256 `22ae11e6…fb5b4` (57 cases) and holdout corpus
  `f904411e…fce4` (9 cases) re-verified from the private frozen files before processing.
- All 9 files of `81-adjudicated-quality-v1` re-verified against their manifest SHA-256 and
  byte lengths (all OK), including
  `development-score.json` (`5bcd2197…10905a7`) and `holdout-score.json`
  (`4c0d1847…24ca12284`).
- No immutable evidence file, manifest, label, target, Graphiti history or ratified EX
  admission was edited.
