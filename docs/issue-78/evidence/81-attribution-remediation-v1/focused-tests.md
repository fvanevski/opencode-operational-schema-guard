# Focused CPU validation — Issue #81 attribution remediation (Phase 3)

Source head: `8dcdf199c8b53d8e213c07427525cb0766f726ca` (branch `issue/81`, PR #83 draft).
Executor: Node v26.13.0, CPU-only, detached campaign worktree, clean tree.
Raw outputs preserved privately (not published); exact commands and exit codes below.

## 1. Syntax checks (separate `node --check` per modified runtime file and focused test)

```
node --check docs/issue-78/v2-candidate/plugin.mjs            # exit 0
node --check docs/issue-78/v2-candidate/candidate.test.mjs    # exit 0
node --check docs/issue-78/v2-candidate/association.test.mjs  # exit 0
node --check docs/issue-78/v2-benchmark/evaluate.mjs          # exit 0
node --check docs/issue-78/v2-benchmark/evaluate.test.mjs     # exit 0
```

All five exit 0.

## 2. Focused CPU suite (exact handoff command set)

```
node --test \
  docs/issue-78/v2-candidate/association.test.mjs \
  docs/issue-78/v2-candidate/candidate.test.mjs \
  docs/issue-78/v2-candidate/long-prompt.test.mjs \
  docs/issue-78/v2-benchmark/evaluate.test.mjs \
  docs/issue-78/v2-benchmark/adjudicate.test.mjs \
  docs/issue-78/v2-benchmark/stage-holdout.test.mjs \
  docs/issue-78/v2-benchmark/diagnose-capture.test.mjs \
  docs/issue-78/v2-curator/curator.test.mjs \
  docs/issue-78/v2-curator/model-policy.test.mjs \
  docs/issue-78/v2-curator/efficiency-probe.test.mjs
```

- Producer exit: **0** (raw exit preserved, not masked by a display filter).
- Summary: `tests 81 / pass 81 / fail 0 / cancelled 0 / skipped 0 / todo 0`, `duration_ms 780.5`.

## 3. New/updated regression coverage observed in the run

| Test | Status | Establishes |
| --- | --- | --- |
| `assistant history retains preceding admitted native user, not the later prompt; rejected prompt clears tool association` | PASS | Invariants A + B + C (genuine plugin-hook wiring, disposable queue, assertions only after the plugin's asynchronous `stop()` flush) |
| `a rejected prompt at the end of one pending batch does not borrow an earlier accepted anchor` | PASS | Invariant C |
| `missing usage telemetry is unknown, and persisted-only latency excludes DEFER` | PASS | Invariants F + G (`tokens_total` null when unmeasured; `post_exit_persisted_ms` separate series, DEFER excluded) |
| `admitted user prompts link later tool and assistant events without upgrading authority` | PASS | Updated Issue #75 baseline behavior (assistant context now includes the admitted native user message) |

The association harness uses genuine plugin-hook registration (`session.prompt`,
`session.context`, `tool.execute.after`) with a disposable `CandidateQueue` under a
fresh temp state dir, and flushes the plugin's normal asynchronous shutdown before
inspecting durable queue state. Successful execution verified, not merely syntax
parsing.

No additional related CPU tests were required; no unrelated repository campaigns were run.
