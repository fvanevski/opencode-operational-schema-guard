# Issue #81 — Terminal Handback (81-recall-remediation-v1)

```text
RESULT=READY_FOR_OPERATOR_REVIEW
TESTED_FULL_SHA=7b7d62685993e56e2b71b77846a6a0c1092d7d01
FINAL_REMOTE_HEAD=<pending single evidence-only CAS commit to issue/81>
CPU_TESTS=node --check (6 sources OK) + node --test: candidate 21/21, stage-holdout 3/3, adjudicate 4/4, diagnose-capture 3/3, curator 36/36, residual 47/47 (repaired disposable fixture), evaluate 9/10 (1 substantive fail = defect #1); scratch-evalfix both-patches 78/78; exits recorded in cpu-tests.md
NATIVE_V2_IDENTITY=OpenCode v2.2.5 /home/filip/.opencode/bin/opencode via openviking-agent shim; candidate plugin loaded through disposable native-loader (OPENCODE_CONFIG → native-config.json / native-config-holdout.json); isolated group/workspace/state root (not production ghdev_gh_mcp)
LIVE_CAPTURE=real admitted prompt IDs (msg_1a7ef3f9a long-decision 2 spans, msg_1a7efaded shell 1 span, msg_1a7f031fc out-of-ws read 1 span, …); secret-late/SELF/self-veto 0 spans; 96 dev-group events + 51 independent-holdout events staged; multi-span binding verified; no source-class inflation (read ≠ file_change)
SAFE_EXCLUSIONS=privacy (sk-live-… / sk-hold-… whole-source vetoed, 0 leakage), SELF ([GHDEV_GRAPHITI_CONTEXT] vetoed), wrong-group (cross-scope forged group rejected), read-only (out-of-ws read = user_turn observation, no file_change, no raw contents)
OLD_FROZEN_RESULT=dev 27/37, holdout 3/6 (immutable; new counterfactual dev candidate recall 0.7838, holdout 0.6667)
NEW_DEV_AND_HOLDOUT=prospective dev (12 cases/6 valuable) staged recall 0.8333 precision 0.7143 [FAIL <0.85; patched 1.0000]; independent blind holdout (5 cases/4 valuable) recall 1.0000 precision 1.0000 (provisional)
HUMAN_REVIEW=pending; operator packet 1 READY_FOR_OPERATOR_REVIEW (private: operator-decision-packet-1.md, sha in manifest); no AI-invented verdicts
MODEL_POST_EXIT=armed via canonical EX gate (post-exit-drain.py) + user unit ghdev-curator81t-qual; chat-fast non-thinking (no reasoning_effort); fails closed while harness active, drains once post-exit; calls/usage/decisions land in curation-v1/cur81_native_a1f3c9d7 + usage-terminal81.jsonl (pending)
GRAPHITI=group cur81_native_a1f3c9d7; episodes/nodes/edges + exact native cited source refs pending post-exit readback; ambiguous-write/no-replay rules preserved
SOURCE_INVARIANTS=privacy/authority/source-identity: 16/16 invariant probe pass; evidence class user-stated (never verified); native-ID + span-offset handles; no fake verified
PRODUCTION_NONMUTATION=ghdev_gh_mcp 4-episode baseline intact; cur81_dev_ce555621 9 episodes intact; only isolated cur81_native_* groups written
EVIDENCE_COMMIT=<single evidence-only CAS commit to issue/81; SHA recorded on push>
REMAINING_GATES=(1) candidate_recall staged 0.8333 <0.85 (blocking; met only under bounded defect-#2 repair); (2) durable_grounded_precision + post-exit latency UNVERIFIED until drain+operator verdicts; (3) semantic_recall UNVERIFIED_UNTIL_FRESH_CLIENT (post-merge); (4) human ratification pending
COMMAND_SHAPE_FRICTION=see command-shape-friction.md (friction=yes; 6 bounded events, all recovered; COMMANDS_MATCH_HANDOFF=yes)
NEXT=Central independent adjudication on existing PR #83 (no new PR, no merge, no production mutation)
```

## Notes

- **One bounded post-exit drain** is armed and will run once after this harness exits; the second operator fact-level packet and the durable-fact precision finalize from its readbacks.
- **Two Central source defects** (defect #1 evaluate qualification-group identity; defect #2 events multi-line `promptText`) are demonstrated with minimal diffs + focused regressions on `scratch-evalfix`; supplied to Central as a bounded proposed repair, not a silent product push.
- The **independent blind holdout** is a fresh group/workspace disjoint from the dev group and the prior exposed holdout; it is not tuned after results.
