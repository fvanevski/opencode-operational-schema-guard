# Issue #81 — Operator-Adjudication Handback (81-operator-adjudication-v1)

```text
RESULT=READY_FOR_OPERATOR_REVIEW
TESTED_SOURCE_SHA=7b7d62685993e56e2b71b77846a6a0c1092d7d01
PARENT_EVIDENCE_COMMIT=e6e21f5b2794d20244fa3c62e2b0ccd308fb5752 (81-post-exit-terminal-v1, immutable)
EVIDENCE_COMMIT=<this evidence-only fast-forward commit to issue/81; SHA recorded on push>
SCOPE=operator-adjudication finalization (evidence-only; no model inference, no Graphiti writes, no replay, no new PR, no merge, no substantive source edit)

OPERATOR_POLICY=applied. Durable-memory usefulness: preserve user architectural decisions/API requirements, changes/supersessions, source-grounded durable implementation facts, important unresolved defects with established status; keep routine test counts / transient failures / redundant progress reports / speculative diagnoses in the evidence history. Retrospective quality labels on already-persisted facts (no episode deletion, no re-labeling of the original model DEFER/EMIT records).

PER_FACT_DISPOSITIONS (operator): F1–F5, F11, F13 = durable-useful TRUE (F13 conditional); F6–F10, F12 = FALSE.
EXACT_SOURCE_VERIFICATION: all 13 persisted facts re-verified against the FULL native source event (complete excerpt, not the truncated packet-2 quotation). Grounding 13/13 YES (no assertion contains a proposition absent from its cited span). Authority 13/13 (user-stated F1–F5,F11; tool-reported F6–F8,F10; assistant-reported F9,F12,F13; no assistant fact promoted to independently-verified). Scope 13/13 (12 dev → fsm81; F13 → qualified_project, earlier cohort). No grounding/authority field is UNVERIFIED.
F12_SOURCE_CHECK=corroborated: current native-ws/fsm81/fsm.test.js has rmSync(tmpDir,{recursive,force}) inside an after() hook (line 194), consistent with the assistant's stated fix; authority stays assistant-reported (corroborated, not independent code verification).

HOLDOUT_ATTRIBUTION_CORRECTED: F13 belongs to the EARLIER cur81_holdout_4c3ab514 / qualified_project cohort (the qualified prime.js holdout), NOT the new prospective cur81_native_holdout_a1f3c9 (which has 0 Graphiti episodes). F13 is NOT used to ratify the new prospective holdout; its historical model decision does NOT ratify the new holdout's provisional 4/4 source-case capture recall. Cohorts kept separate in every metric.

METRICS (separate findings):
  GROUNDED_PRECISION: denominator = the 13 actual persisted receipt-bound facts (NOT the 7 useful subset). dev 12/12, earlier 1/1, combined 13/13 = 1.0000. New prospective holdout = UNVERIFIED (0 persisted facts, not drained).
  DURABLE_USEFULNESS (separate): 7/13 TRUE (F1–F5, F11, F13-conditional); 6/13 FALSE (F6–F10, F12).
  CANDIDATE_RECALL (staged): dev 5/6 = 0.8333 FAIL (<0.85); patched dev 6/6 = 1.0 (counterfactual, via defect #2); blind holdout 4/4 = 1.0 (provisional capture, labels pending packet-1 ratification); historical dev 27/37 + holdout 3/6 (immutable, unchanged).
GATE_STATUS: durable_grounded_precision ≥0.90 = measured 1.0000, conditionally met, NOT declared passed (pending operator sign-off on the 13 fact verdicts + packet-1 source-case ratification + remote receipt bindings, the last of which is verified: 12 dev + 1 earlier-cohort episode UUIDs match the live Graphiti).

REMOTE_RECEIPTS (re-verified read-only this session): dev cur81_native_a1f3c9d7 12 episodes (UUIDs unchanged from 81-post-exit-terminal-v1); earlier cur81_holdout_4c3ab514 1 episode (69fde784-…); new prospective cur81_native_holdout_a1f3c9 0; prod ghdev_gh_mcp 4 (intact); prior cur81_dev_ce555621 9 (intact). No Graphiti writes.

PACKET_1=READY_FOR_OPERATOR_REVIEW (this packet's sanitized table: operator-decision-packet-1-table.md; complete private self-contained form: …/operator-decision-packet-1-revised.md). NOT ratified; 12 dev + 5 holdout source cases; no AI-signed verdicts; ≥85% recall requirement still binding.
PACKET_2=operator-decision-packet-2.md (private, sha d2f3251d…); operator response applied; the 13 fact verdicts remain UNVERIFIED until signed.
RATIFIED_QUALITY=UNVERIFIED (pending operator sign-off of packets 1 + 2).
SOURCE_DEFECTS=defect #1 (evaluate.mjs qualification-group identity) + defect #2 (events.mjs multi-line promptText) — supplied as a minimal complete bounded diff (bounded-repair.patch) + focused regression (scratch-evalfix 78/78); NOT applied to product source; Central owns review/implementation/regressions/exact-head CI on PR #83.
PRIVACY=operator attestations and private source text stay on the host; only sanitized, accurately-qualified results are published under this dir.
COMMAND_SHAPE_FRICTION=see friction-ledger.md (friction=yes; 8 cumulative bounded events, all recovered; 0 new events this session; COMMANDS_MATCH_HANDOFF=yes)
REMAINING_GATES=(1) operator ratification of packets 1+2 (blocks durable_grounded_precision + candidate_recall finalization); (2) Central application + verification of defect #2 (blocks staged recall 0.8333→1.0); (3) new prospective holdout durable-fact precision UNVERIFIED (0 persisted facts, not drained); (4) semantic_recall UNVERIFIED_UNTIL_FRESH_CLIENT (post-merge); (5) Central independent adjudication on existing PR #83
NEXT=Central independent adjudication, existing PR #83 (no new PR, no merge, no production mutation)
```

## Notes

- **One additive evidence-only fast-forward commit** on `issue/81` under `81-operator-adjudication-v1/`.
  The prior `81-post-exit-terminal-v1/` and `81-recall-remediation-v1/` evidence are **immutable**
  (untouched).
- **Cohort-separated:** the earlier `prime.js` cohort (F13) and the new prospective blind holdout are
  kept distinct; no cohort result is combined to manufacture acceptance of another.
- **Honest partial packet:** operator sign-off is pending, so this is published with the complete
  private review materials (packets 1 + 2 on host) and returns `READY_FOR_OPERATOR_REVIEW`.
- **No production patches implemented.** The two source defects remain Central's to apply/verify.
- **Production non-mutation** confirmed: `ghdev_gh_mcp` (4) and `cur81_dev_ce555621` (9) unchanged.
