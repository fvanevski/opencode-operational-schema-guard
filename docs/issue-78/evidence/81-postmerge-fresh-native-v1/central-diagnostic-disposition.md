# Central diagnostic disposition — ISSUE81_POSTMERGE_FRESH_NATIVE_ACCEPTANCE_V1

Evidence-only campaign; no source/config/Graphiti mutation, no service restart,
no PR/merge/issue closure. One evidence-only commit under
`docs/issue-78/evidence/81-postmerge-fresh-native-v1/`.

## Dispositions of observed anomalies

1. **Recall service port 9091 CLOSED** (`graphiti-ghdev-recall.service`
   inactive/dead). Recorded as observed host state. Not a blocker: the
   installed plugin recalls via the Graphiti MCP endpoint `127.0.0.1:8766`
   directly; activation proof (S01) shows the GHDEV block injected in a
   fresh native session.

2. **Historical Bad Gateway warnings** in the service log: confirmed to be
   old-process shutdown events (pre new-epoch start 09:40:32 2026-11-06);
   zero ERROR lines in the new epoch at admission.

3. **S01 answer provenance**: the S01 native answer (FalkorDB port
   6382, development-knowledge) was produced via live host inspection
   (systemd unit, env file, FalkorDB corroboration) rather than solely
   from the injected fact. `answer_match_ratio` for S01 is therefore a
   supporting signal only; the primary verdict axis remains
   `source_correct` per the frozen scoring method.

4. **300 ms Promise.race** in the promoted plugin is a CONFIGURED
   recall-control bound, not a measured latency. Context-and-latency
   evidence reports measured end-to-end upper bounds
   (`first_block_request_t - t0`) with p50/p95 over the uncensored
   population; censored cases (no block observed) are listed separately.

5. **N04 short-question attribution** (frozen question `hi`): the
   supervising session's model requests can fall inside N04's window and
   substring-match `hi`. Harvest therefore attributes via
   `litellm trace_id == native session id` as the primary axis
   (question-in-first-user retained as fallback + cross-check), and each
   case report carries an `attribution` block (axis, trace_matched,
   question_matched, clean).

## Frozen residual-failure expectations under evaluation

- **S06**: cutover source preferred over the procedural git-then distractor
  (the Phase A residual failure the S06 correction targets).
- **S01/S03/S04**: source-equivalence / named-term retrieval.
- **S05/S07**: proposition possibly absent from top-12; distinguish
  retrieval miss from injection-filter rejection (injected_fact_count and
  injected_source_refs in the matrix discriminate).
- **S10**: index-order tie-break.
- **S13**: retrieval/lexical abstention.

## Human precision status

`HUMAN_PRECISION=UNVERIFIED`: the 126-fact consolidated operator review
packet is staged (all `human_verdicts` null, flags embedded per item).
No operator verdicts were supplied for this campaign; no agent-populated
human verdicts. Disposition of the 126-fact precision gate remains with
the operator.

## Process failures

None. All 20 cases rc=0, every launch admission=open, no bounded-retry
entries (no `blocked_reconcile` observed; the 15s x 3 retry policy was
available but never exercised).

## Result disposition (campaign outcome)

- **Score: 9/16 PASS_SOURCE_CORRECT** (S02, S06, S08, S09, S11, S12, S14,
  S15, S16) vs threshold 13/16 -> campaign result **FAIL** on the
  source-correct recall criterion. This is a measured outcome, not a
  process failure: every positive case had the GHDEV block injected
  (0 censored) and all 4 negatives behaved correctly (N01/N03/N04
  PASS_NO_INJECTION, N02 FAIL_INJECTED as historically expected).
- **S06 correction target: PASS_SOURCE_CORRECT** - the Phase A residual
  failure (cutover source preferred over the procedural git-then
  distractor) is resolved by the S06-corrected relevance module.
- Residual WRONG_SOURCE cases: S01, S03, S04, S05, S07, S10, S13.
  - S04/S05 form a source-equivalence cluster: S05's expected ref is
    S04's expected ref (multi_event vs implicit_relationship on the same
    cutover source); S04 injected the cutover source while S05 injected
    a different session's message.
  - S10 (index-order tie-break) answered correctly via live git
    inspection of commit 52863ae; its injected ref did not match the
    expected roster ref, so it scores WRONG_SOURCE under the frozen
    method (answer provenance note, as S01).
  - S13 (retrieval/lexical abstention): block present with a single
    injected ref not in the expected set.
- **Latency:** p50=1.3s, p95=1.938s end-to-end (launch to first
  block-bearing model request) over n=16 uncensored; 0 censored.
  The 300 ms configured recall control is not a measurement (stated in
  context-and-latency.json).
