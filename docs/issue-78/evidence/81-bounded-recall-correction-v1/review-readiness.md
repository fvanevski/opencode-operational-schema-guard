# Issue #81 Bounded-Recall Correction — Review Readiness (ISSUE81_BOUNDED_RECALL_CORRECTION_V1)

## Verdict

- **Overall result: PARTIAL.** The staged bounded-recall correction is
  source-valid and test-clean, but it does **not** close the residual recall
  gap. `CENTRAL_SOURCE_CHANGE_REQUIRED=yes`.
- **`SOURCE_AND_TEST_VALIDATION=PASS`** — six-file diff match, `node --check`
  3/3, focused 45/45, resolver-implicated 44/44, trusted-verify `42278847322`
  PASS (inherited).
- **`RETRIEVAL_DEPTH=INSUFFICIENT`** — depth 24 recovers 9/16 expected
  episodes (11/16 present) but the 5 retrieval misses (S03/S05/S07/S10/S13)
  remain absent at both depths.
- **`OFFLINE_RECALL=9/16`** (diagnostic, equals the frozen native 9/16; not a
  native acceptance re-run).
- **`OBSERVER_N04=PASS_NO_INJECTION`** (reconciled to native session; 2 native
  requests, 0 GHDEV blocks).
- **`HUMAN_PRECISION=UNVERIFIED`** (126/126 human verdicts null).

## What the correction does and does not fix

1. **Fixed / verified:** the `24`-candidate bound is now exercised end to end
   (`MAX_AUTOMATIC_CANDIDATES=24`, `maxFacts=24`, anchor limit `24*12=288`,
   `maxSelected=1`). Raising the candidate cap from 12 to 24 recovers 9
   additional expected episodes (the 9 that end up `PASS_SOURCE_CORRECT` where
   the expected episode was absent at d12).
2. **Not fixed (blocking for full recall):** the five retrieval misses
   S03/S05/S07/S10/S13 — their expected episodes are not in the top-24
   candidate set at all, so no selector over that set can admit them. This is a
   **retrieval-coverage / source-binding** defect, not a candidate-cap defect.
   Raising the cap further is **not** the remedy.
3. **Not fixed (admission-layer):** S01 and S04 — expected facts are eligible
   and present at d24, but a competing / proposition-equivalent sibling wins the
   `maxSelected=1` tie-break. These are lexical/admission selector misses.

## Disposition handed to Central

- **SEMANTIC_REMEDIATION=central-owned.** The bounded-recall correction as
  staged is sound and should be retained; it is **not** a complete fix for the
  residual recall gap.
- **Central source change required: yes** — to close S03/S05/S07/S10/S13 the
  retrieval stage must surface those expected episodes (coverage / source
  binding), independent of the candidate cap. To close S01/S04 the admission
  selector must break the competing/sibling tie-break in favor of the
  source-grounded expected fact.
- **The 9/16 offline score and the frozen 9/16 native score are preserved
  verbatim**; no rescoring was performed. The five retrieval misses are the
  reason the result is `PARTIAL`, not `PASS`.

## Gates and authorities

- **`TRUSTED_VERIFY_RESULT=PASS`** (run `42278847322`, inherited; not re-run).
- **`HUMAN_PRECISION=UNVERIFIED`** — the 126-item operator-review worksheet is
  staged (all verdicts null, `AWAITING_OPERATOR_ADJUDICATION`); the
  target-ratification is `OPERATOR_RATIFIED` (thresholds fixed,
  `durable_grounded_precision_min=0.9`). Disposition of the precision gate
  remains with the operator.
- **No production install / config change** was made; the impl branch bytes
  were not activated in production and were not pushed.
- **No new PR, no merge, no issue closure** on this branch.

## Out of scope / not done

- No new 20-case native GPU campaign (the offline replay is diagnostic only).
- No candidate-cap increase beyond 24 (the cap is not the binding constraint).
- No host service mutation; the litellm trace is a continuing qual artifact
  (the campaign slice is frozen by the offset marker `campaign_start_offset_bytes=644259321`).
