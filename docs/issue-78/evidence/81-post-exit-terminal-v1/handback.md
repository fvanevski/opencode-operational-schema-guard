# Issue #81 — Terminal Handback (81-post-exit-terminal-v1)

```text
RESULT=READY_FOR_OPERATOR_REVIEW
TESTED_SOURCE_SHA=7b7d62685993e56e2b71b77846a6a0c1092d7d01
FINAL_REMOTE_HEAD=<this evidence-only fast-forward commit to issue/81; SHA recorded on push>
EX_ADMISSION=proven (canonical shared flock retained through the drain); journal "EX admission proven; invoking candidate drain with lock retained"; final "settled" (dev) / "review_required" (holdout), unresolved:0
SERVICE_TERMINAL=ghdev-curator81t-qual code=exited status=0/SUCCESS (settled); ghdev-cur81-holdout-4c3ab514 code=exited status=0/SUCCESS (review_required); both inactive (dead)
MODEL_CALLS=16 campaign (13 dev cur81_native_a1f3c9d7 + 3 holdout cur81_holdout_4c3ab514); model_errors=0
MODEL_USAGE=model-only prompt 37744 + completion 4033 = 41777; reasoning 1454 (reported separately, NOT double-counted); cached-prompt 5184; duration 15387 ms; Graphiti extraction cost separately attributable (not in these totals)
MODEL_DECISIONS=EMIT 14 (13 dev + 1 holdout) / DEFER 2 (1 dev clean local + 1 holdout transient) / SKIP 1 (holdout single-word) / errors 0; dev persisted 12, holdout persisted 1
GRAPHITI_EPISODES=12 dev (cur81_native_a1f3c9d7, UUIDs in graphiti-readback.md) + 1 holdout (cur81_holdout_4c3ab514, 69fde784-…); staged blind capture 0; prod ghdev_gh_mcp 4 (intact); cur81_dev_ce555621 9 (intact)
GRAPHITI_NODES_EDGES=dev 17 nodes / 29 edges; holdout 2 nodes / 1 edge
SOURCE_INDEX=verified (12/12 dev + 1/1 holdout episode refs present in review-store candidate events; 12 dev episode-index == 12 live UUIDs; 1 dev curation cleanly deferred, not an ambiguous write)
AMBIGUOUS_REMOTE_WRITES=0 (no duplicates, no unresolved remote states)
PRODUCTION_GROUPS=independent readback: ghdev_gh_mcp 4 episodes intact; cur81_dev_ce555621 9 episodes intact (non-mutation)
PACKET_1=READY_FOR_OPERATOR_REVIEW (private …/operator-decision-packet-1.md, sha256 54fca993c0b27d7e6611c4fa43301eefabdafad6daa486d877fbddbc5fd265bb; 12 dev + 5 holdout source cases; no AI-signed verdicts)
PACKET_2=…/terminal81-a1f3c9/operator-decision-packet-2.md, sha256 d2f3251d8881a6830049ad378c82447d547420cd14b3ea03446cf450645f3be7; READY_FOR_OPERATOR_REVIEW (13 durable facts, 5 groups; no AI-signed verdicts; silence is not approval)
RATIFIED_QUALITY=UNVERIFIED (pending operator ratification). Measured: candidate_recall staged dev 5/6=0.8333 FAIL, patched dev 6/6=1.0 (counterfactual), blind holdout 4/4=1.0 (provisional); historical dev 27/37 + holdout 3/6 (immutable, unchanged); durable_grounded_precision 13/13 (all grounded/scope-correct) → 1.0000 if all EMIT (≥0.90 PASS, pending signatures); three-path baseline 1/6 / broad 5/6 / curator 5/6 (curator now verified post-exit)
SOURCE_DEFECTS=defect #1 (evaluate.mjs qualification-group identity) + defect #2 (events.mjs multi-line promptText) — supplied as a minimal complete bounded diff (bounded-repair.patch) + focused regression (scratch-evalfix 78/78); NOT applied to product source; Central owns review/implementation/regressions/exact-head CI on PR #83
EVIDENCE_COMMIT=<this commit SHA, recorded on push>
REMAINING_GATES=(1) operator ratification of packets 1+2 (blocks durable_grounded_precision + candidate_recall finalization); (2) Central application + verification of defect #2 (blocks staged recall 0.8333→1.0); (3) semantic_recall UNVERIFIED_UNTIL_FRESH_CLIENT (post-merge); (4) Central independent adjudication on existing PR #83
COMMAND_SHAPE_FRICTION=see friction-ledger.md (friction=yes; 8 bounded events, all recovered; COMMANDS_MATCH_HANDOFF=yes)
NEXT=Central independent adjudication, existing PR #83 (no new PR, no merge, no production mutation)
```

## Notes

- **One additive evidence-only fast-forward commit** on `issue/81` under `81-post-exit-terminal-v1/`.
  The original `81-recall-remediation-v1/` evidence is **immutable** (untouched).
- **Honest partial packet:** operator judgments are pending, so this is published with the complete private
  review materials (packets 1 + 2 on host) and returns `READY_FOR_OPERATOR_REVIEW`.
- **No production patches implemented.** The two source defects remain Central's to apply/verify.
- **Production non-mutation** confirmed: `ghdev_gh_mcp` (4) and `cur81_dev_ce555621` (9) unchanged.
