# Issue #81 — capture-closeout handback (evidence-only packet v1)

One consolidated, source-backed diagnosis of Issue #81's remaining capture-coverage
failures, run at exact head `036017058a0abdbfc20dde1fd076926ce8ef6d4f` on branch
`issue/81` (base `d7c32f503eaa4cf4c52bb055b434e0ac71b76f45`).

## Typed return

```text
RESULT=DIAGNOSIS_COMPLETE
TESTED_EXACT_HEAD_SHA=036017058a0abdbfc20dde1fd076926ce8ef6d4f
FINAL_REMOTE_HEAD_SHA=<filled at publication readback>
CPU_TESTS=68/68 pass at exact head (17 v2-benchmark + 36 v2-curator + 15 v2-candidate), all exit 0; +1 focused read-tool test GREEN post-patch, 68/68 regression green post-patch
CHAT_FAST_POLICY=NONTHINKING_OWNER_CONFIRMED
CHAT_FAST_REQUEST_FIELDS=none reasoning_effort; bounded max_tokens (alias 8192; curator 768 when set); live /model/info readback: extra_body.enable_thinking=false, no reasoning_effort, no allowed_openai_params
THINKING_ALIASES=chat-review (enable_thinking=true, thinking_budget 8192, effort medium default, low permitted via preflight T4) and chat-audit (enable_thinking=true, thinking_budget 16384, effort xhigh default, medium permitted via preflight T5); NInfer boot flags unchanged
DEV_FROZEN_SHA=22ae11e64a7a9c443d6f13a79c363115a28b43a27620e5383449bfe32d9fb5b4
HOLDOUT_FROZEN_SHA=f904411e51d0bd9674b7f756f3df5bf44452ca8f63362d75102ceb9df677fce4
RATIFIED_SCORES=dev 27/37 (0.730); holdout 3/6 (0.500) (no relabel)
MISSED_CASES=10 dev + 3 holdout; missing_native_data=6, intentional_safety_filters=6 (length 4 + SELF 2), real_adapter_defect=1 (read tool), unknown=0
CAUSE_GROUPS=missing native shell result (host persistence, 6); intentional prompt length/SELF safety filters (6); read-only file tool adapter gap + scope fence (1)
DEFENSIBLE_FIX=source.patch: FILE_TOOLS += 'read' in v2-candidate/events.mjs (1 line) + read-tool-closeout.test.mjs (RED exit 1 -> GREEN exit 0; 68-test regression green)
EXPECTED_COVERAGE_AFTER_FIX=counterfactual only: patch alone 27/37 + 3/6 unchanged; + scope alignment 27/37 + 4/6 (0.667); + host shell-result persistence 32/37 (0.865, meets threshold) + 5/6 (0.833); + prompt policy 37/37 + 6/6
CORRECTED_HOLDOUT_CURATOR_TOKENS=4590
GRAPHITI_EXTRACTION_COST=UNVERIFIED unless worker-attributed
PRODUCTION_NONMUTATION=no alias/service/NInfer/Graphiti/EX change; litellm pid 828118 start 2026-11-04 09:21:22 local (3s after config mtime) loaded the unchanged config (sha256 df5b90fa…); /model/info readback matches operator policy; no reload performed
EVIDENCE_COMMIT=<40hex|BLOCKED>
PR_CREATED=no
COMMAND_SHAPE_FRICTION=<ledger in handback.md of the campaign>
NEXT=Central independent source fix adjudication then single #81 PR
```

## Remaining blockers to the single Issue #81 PR

1. Central adjudication of `source.patch` (read-tool) and the focused test at exact head.
2. Operator/Central decision on host shell-result persistence (the 6 missing-native-data
   cases) — a production/host change outside this evidence packet.
3. Operator/Central decision on prompt policy (length floor / SELF veto) for the 6 prompt
   cases — a provenance/privacy tradeoff.
4. Operator/Central decision on scope-workspace alignment for `ho-gui-read` if it is to
   count toward the holdout.
5. No new PR, model replay or Graphiti campaign is created by this packet.
