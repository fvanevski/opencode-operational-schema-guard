# Issue #81 — Consolidated Handback

```text
RESULT=PARTIAL
SOURCE_SHA=85c92809b04a25088d5b959626670f114d97d6b7
FINAL_REMOTE_HEAD=<fast-forward sha after evidence publish; see publish receipt>
DEV_FROZEN_SHA=22ae11e64a7a9c443d6f13a79c363115a28b43a27620e5383449bfe32d9fb5b4
HOLDOUT_FROZEN_SHA=f904411e51d0bd9674b7f756f3df5bf44452ca8f63362d75102ceb9df677fce4
OPERATOR_DECISION=ratified (dev labels 0a6c657a…, holdout labels c7aafbd2…, holdout fact worksheet e432b47f…, targets ced9b984…)
RATIFIED_TARGET_SHA=ced9b984b17c1131984184b1bd9c666df3bdca9f20a3a067ee79763f4a05f3d4
CPU_TESTS=evaluate 9/9, adjudicate 4/4, stage-holdout 2/2, curator 32/32, model-policy 2/2, efficiency-probe 2/2, candidate 15/15 (66 pass / 0 fail / 0 skip, all exit 0)
PRIOR_PROBE=5/5 baseline comparison; 3 changed EMIT source verdicts operator-accepted (f584c1bf, 4ab73c43, 8c44c2ff)
PROVIDER_FORWARDING=PROVEN (NInfer counter past 883 anchor; drop_params=false readback; 0-reasoning provider-reported)
DEV_SCORE=baseline 3/1/19/34 (recall 0.081); broad 27/6/14/10 (recall 0.730, precision 0.818); curator 9 EMIT/3 DEFER/1 SKIP, 9 facts human-judged, grounded precision 1.0; candidate_recall FAIL, grounded_precision PASS
HOLDOUT_STAGE=cur81_holdout_4c3ab514, 5 queued / 4 excluded (ho-prime-test, ho-gui-prompt, ho-gui-read, ho-dup-hello not selected by real #79 adapters)
EX_ADMISSION=canonical Python EX gate, 30 s quiet grace, terminal exit 0 (re-drain 09:02:12), late-reconciliation path available, no forced exit
HOLDOUT_MODEL=3 decisions (1 EMIT/1 SKIP/1 DEFER), 3 model calls / 0 errors, 6219 ms, 2913 prompt / 1677 completion / 1454 reasoning tokens
HOLDOUT_GRAPHITI=1 episode (69fde784…) + 2 nodes + 1 EXPORTS edge, source-index verified, 0 duplicates, 0 unresolved
HOLDOUT_SCORE=1 EMIT / 1 SKIP / 1 DEFER; 1 useful durable fact (grounded precision 1.0); candidate_recall FAIL (0.50), grounded_precision PASS (1.0); semantic_recall UNVERIFIED_UNTIL_FRESH_CLIENT
GRAPHITI_EXTRACTION_COST=UNVERIFIED (shared NInfer counter, no per-request worker identification)
PRODUCTION_UNCHANGED=ghdev_gh_mcp 4 episodes + cur81_dev_ce555621 9 episodes, both baseline-identical; LiteLLM/NInfer defaults untouched
EVIDENCE_COMMIT=<fast-forward sha>
SOURCE_REMOTE_MUTATION=none
REMAINING_GATES=candidate-recall below 85% is a real negative result (no source repair required to report it); single #81 PR/review/merge; installed fresh-native acceptance
COMMAND_SHAPE_FRICTION=see friction ledger below
NEXT=Central independent adjudication + single #81 PR
```

## Why PARTIAL (not PASS_REVIEW_READY)

The campaign produced a complete, honest, operator-ratified evidence packet: all CPU gates green, both frozen corpora byte-verified, the sealed holdout genuinely staged and drained post-exit with a real Graphiti write, production invariance confirmed, and the three-path comparison scored against the unchanged rat
ified targets. It is **PARTIAL** because the pre-registered **candidate_recall ≥ 85%** target is not met on either split (dev 0.730, holdout 0.50) — a real negative result that the campaign reports without tuning. Durable grounded precision passes (1.0) on both splits. The installed fresh-native semantic/context gates remain `UNVERIFIED` by construction (separate merged-main phase).

## Friction ledger (GHDEV-10 canonical schema)

| Event | Class | Attribution | Effect |
|---|---|---|---|
| First drain (08:54, none/768) 3× HTTP 400 `reasoning_effort conflicts with enable_thinking` | `guard_annotation` | host/tool (provider config change at 08:18, after probe) | 3 defers, 0 persisted; re-drain needed |
| Re-drain (09:02, default policy) | successful recovery | — | 3 valid calls, 1 persisted; no new friction |
| 08:58:17 path-triggered invocation FAIL_CLOSED 09:00:21 | `pre_execution_rejection` | agent (harness held the gate lease) | expected pre-exit control, no work done |
| NInfer extraction cost not attributable | `interface_discovery` | host/tool (shared counter) | extraction cost reported UNVERIFIED |

`COMMANDS_MATCH_HANDOFF=yes` for the required agent-phase commands/workdirs/routing (node --check/--test at exact head, adjudicate/stage-holdout/curator-cli, canonical EX oneshot); the none/768 → default policy switch is the campaign's own "otherwise retain the unchanged default" path, not a handoff deviation.
