# Verification — Issue #92 A1–A3 first campaign

Identity and native exits for the mandated implementation diagnostics (NOT the
authoritative trusted exact-head final Verify; Central dispatches
`repository-final-v1` at the final source head).

## Source identity
- Repo: `fvanevski/opencode-operational-schema-guard`
- Branch: `work/91-memory-utility-r1`
- Base (main): `c8eb5260f2b10832346234b1b5d0cf28302ffba8` (== `origin/main`, authenticated)
- Candidate: `270848aa108df22b9d12738cc6f4903ec45da9c1` (== `origin/work/91-memory-utility-r1`, authenticated)
- Base is an ancestor of the candidate. Both materialized as clean disposable
  detached worktrees (`/tmp/opencode/issue92-a1-a3/{baseline,candidate}`).
- No reset/rebase/clean/switch of the owner's dirty checkout
  (`/workspace/opencode-operational-schema-guard` left at its detached HEAD).

## Mandated node checks (candidate worktree)
| Command | Exit |
|---|---|
| `node --check docs/issue-78/v2-curator/core.mjs` | 0 |
| `node --check docs/issue-78/v2-curator/curator.test.mjs` | 0 |
| `node --test docs/issue-78/v2-curator/curator.test.mjs docs/issue-78/v2-curator/model-policy.test.mjs docs/issue-78/v2-curator/efficiency-probe.test.mjs` | 0 (38 pass, 0 fail) |
| `node --test docs/issue-78/v2-candidate/candidate.test.mjs` | 0 (16 pass, 0 fail) |

Node: v26.13.0. Logs retained at
`/tmp/opencode/issue92-a1-a3/cand-curator-tests.log` and
`cand-candidate-tests.log` (unfiltered producer output; exit captured
independently of display).

## Focused utility-policy test (A2)
- `curator.test.mjs` → "utility policy is an additional model-only persistence
  gate" PASSES: EMIT requires a durable `utility_class`; missing →
  `utility_class_required`; non-durable (`transient_result`, `repetition`,
  `superseded_stale`, `uncertain_unattributed`) → `utility_class_not_durable`
  (DEFER, facts=[]); invalid value → `invalid_utility_class`; all five
  persistable classes pass; SKIP/DEFER with a utility class pass; operator
  `validateDecision` EMIT (no utility_class) unaffected; `modelPrompt` includes
  the durable-utility guidance.
- `efficiency-probe.test.mjs` EX-only probe now emits `utility_class:
  root_cause_fix` and validates the source-backed result (PASS).
- `curator.test.mjs` one-admitted-cluster test asserts persisted
  `utility_class=durable_decision` in the ReviewStore and in the CLI `list`
  (PASS).

## CPU-only paired evaluation (Step 3.1)
- Evaluator: `docs/issue-78/v2-benchmark/evaluate.mjs` (read-only; no network/
  model/Graphiti).
- Capture path is code-identical across arms (only `core.mjs`/`curator-cli.mjs`
  changed in the candidate). `capture_identical_across_arms=yes`.
- 14/14 capture control re-run (issue81 cronparse holdout): `broad_capture`
  tp=14 fn=0 recall=1.0 (baseline 0/14). Unchanged control, re-executed.
- Validator matrix (baseline vs candidate) on a grounded corpus case:
  - EMIT no utility_class: baseline EMIT(ok) → candidate DEFER
    `utility_class_required`
  - EMIT durable_decision: both EMIT(ok); candidate records utility_class
  - EMIT transient_result: baseline EMIT(ok) → candidate DEFER
    `utility_class_not_durable`
  - SKIP repetition: both SKIP(ok); candidate records utility_class
- New independent gh_mcp holdout (20 cases): capture recall 1.0 (tp=10 fn=0),
  no privacy/wrong-group capture; valid `evaluate()` schema.

## Trusted Actions receipt
- `TRUSTED_ACTIONS_RECEIPT=central_pending` (Central dispatches/consumes
  trusted profile `repository-final-v1` at the final source head; no
  equivalent local full-suite re-run performed as ritual).
