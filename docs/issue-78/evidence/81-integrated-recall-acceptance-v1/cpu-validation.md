# CPU-only repository validation (exact contract commands)

Run at the authenticated repository root
(`/tmp/opencode/issue81-52863ae`, detached worktree at
`52863aed0498521b181f44bbb454ce314d60fa8c`), Node v26.13.0, stock
native Node. Raw producer exit codes (no display filter on the
producer):

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `node --check docs/issue-75/v2-candidate/plugin.mjs` | 0 | syntax OK |
| 2 | `node --check docs/issue-75/v2-candidate/plugin-behavior.test.mjs` | 0 | syntax OK |
| 3 | `node --test docs/issue-75/v2-candidate/plugin-behavior.test.mjs docs/issue-75/v2-candidate/memory-core.test.mjs docs/issue-75/v2-candidate/relevance.test.mjs` | 0 | 31/31 pass |
| 4 | `node --test docs/issue-78/v2-candidate/association.test.mjs docs/issue-78/v2-candidate/candidate.test.mjs docs/issue-78/v2-candidate/long-prompt.test.mjs` | 0 | 24/24 pass |
| 5 | `node --test docs/issue-78/v2-benchmark/evaluate.test.mjs docs/issue-78/v2-benchmark/stage-holdout.test.mjs docs/issue-78/v2-benchmark/adjudicate.test.mjs` | 0 | 24/24 pass |
| 6 | `npm run check` | 0 | all `node --check` targets OK |
| 7 | `npm test` | 0 | 506/506 pass; `OPERATIONAL_PLUGIN_TEST_RESULT: PASS` |

The root `npm test` suite alone does not cover the docs/issue-75/78 Node
regressions; commands 3–5 provide that coverage (per the contract). No
frozen labels, budgets, baselines, assertions, or policy were altered.
Frozen-source qualification: all of the above ran from the committed
bytes at the source stage commit (clean worktree, no local source
edits).
