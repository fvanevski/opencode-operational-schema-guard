# Issue #81 — CPU Test Evidence (81-recall-remediation-v1)

All suites run against the staged source at `7b7d626` in the disposable worktree. Command, count, and exit recorded. `node --check` clean on all staged sources and tests.

## `node --check` (syntax)

```
node --check docs/issue-78/v2-candidate/{events,plugin,queue}.mjs
node --check docs/issue-78/v2-curator/core.mjs
node --check docs/issue-78/v2-benchmark/{evaluate,stage-holdout}.mjs
```
All OK.

## Focused candidate/curator/benchmark/admission suites

| Suite | Command | Tests | Pass | Fail | Exit |
|---|---|---|---|---|---|
| candidate | `node --test docs/issue-78/v2-candidate/candidate.test.mjs` | 21 | 21 | 0 | 0 |
| long-prompt (in candidate run) | `node --test docs/issue-78/v2-candidate/long-prompt.test.mjs` | (incl. above) | pass | 0 | 0 |
| stage-holdout | `node --test docs/issue-78/v2-benchmark/stage-holdout.test.mjs` | 3 | 3 | 0 | 0 |
| adjudicate | `node --test docs/issue-78/v2-benchmark/adjudicate.test.mjs` | 4 | 4 | 0 | 0 |
| diagnose-capture | `node --test docs/issue-78/v2-benchmark/diagnose-capture.test.mjs` | 3 | 3 | 0 | 0 |
| curator | `node --test docs/issue-78/v2-curator/{curator,model-policy,efficiency-probe}.test.mjs` | 36 | 36 | 0 | 0 |
| residual (native/queue/portal) | `node --test docs/issue-78/v2-curator/residual*.test.mjs` (see note) | 47 | 47 | 0 | 0 |
| evaluate | `node --test docs/issue-78/v2-benchmark/evaluate.test.mjs` | 10 | 9 | **1** | 1 |

## The single evaluate failure (substantive, root-caused — not weakened)

`evaluate.test.mjs` 1/10 fails: in a **distinct qualification group**, a non-binding `source_event_ids` receipt throws `missing_candidate:implicit` where the test expects `qualification_source_identity_mismatch`. This is **defect #1** (see `source-and-runtime.md`). It is a genuine candidate-evaluator defect, not a test weakened for green. Scratch with the bounded repair passes it.

## Residual-suite fixture repair (disposable fixture only)

The first residual run (`residual-tests.out`) failed with `ERR_MODULE_NOT_FOUND` for `docs/issue-78/evidence/81-capture-closeout-v1/events.mjs` — a snapshot fixture the `read-tool-closeout.test.mjs` imports. That fixture was **missing** from the worktree (a snapshot of staged `events.mjs` with `read` added to `FILE_TOOLS` for that specific RED/GREEN test). It was restored as a disposable fixture; the repaired re-run (`residual-tests2.out`) is **47/47 pass**. This is a locally repaired disposable fixture, **not** the frozen committed suite — recorded here so the qualification identity is explicit.

## Scratch counterfactual (both bounded repairs applied)

`scratch-evalfix` (staged source + defect #1 + defect #2 patches): the full set — candidate, long-prompt, evaluate, stage-holdout, adjudicate, diagnose-capture, curator, and the multi-line regression — runs **78/78 pass** (`logs/scratch-full-both-patches.out`).

## Summary

- Staged source: 21+3+4+3+36+47 = 114 pass, 0 fail, **plus** 1 substantive evaluate failure (defect #1) on the 10-test evaluate suite → 123 pass / 1 fail across the focused suites.
- Bounded repair (scratch): 78/78 pass, demonstrating both defects close with minimal diffs + focused regressions.
- No test, authority guard, or fixture was weakened to obtain a green result.
