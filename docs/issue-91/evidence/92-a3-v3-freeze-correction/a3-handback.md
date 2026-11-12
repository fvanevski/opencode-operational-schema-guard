# Issue #92 — A3 v3 freeze correction · consolidated handback

`RESULT=A3_FREEZE_READY_FOR_CENTRAL_APPROVAL`

## Final private manifest SHA
`7b96a1075cbcd94866553bbfc37e26877df460e803d0beb798b9985954b5c4f0`
(private bytes, 0600, `issue92-a3-v3-corpus.json`).

## Label-freeze digest (frozen before model)
`96b9e51ee76182729f1426873e538ce164fa5855139173e8da875e53a2cb0f11` (recomputed == published).

## Source-label correction
7 of the 10 v2 valuable targets were **not** source-stated durable facts and are replaced:
- v2-03, v2-04 → **questions**; v2-05/06/08/09/10 → **unexecuted instructions**.
- Retained (genuine stated facts/decisions): v2-01 FalkorDB per-group layout, v2-02 b75-journal
  decision, v2-07 FFmpeg muxer / libx264 facts.
- 7 new source-supported predicates from previously-unused native events:
  `issue75_graphiti_recall_close_constraint`, `release_quality_gate_hard_prerequisite_decision`,
  `fsm81_unknown_event_must_throw_supersession`, `fsm81_log_rotation_policy_design_decision`,
  `fsm81_transition_function_pure_constraint`, `fsm81_terminal_state_modeling_decision`,
  `fsm81_export_format_serialization_decision`.
- v2 preserved as rejected historical evidence (`issue92-a3-v2-corpus.json` unchanged).

## Sanitized 20-case roster
10 valuable + 10 controls, original session/message IDs + source SHA-256 + temporal scope +
privacy, bounded 25–450-char quotes, reviewable label rationale —
`a3-v3-central-review-packet.json` (no credentials/entire messages/raw logs/source-private
contents). All 20 sources passed the whole-input native privacy scan (one strong candidate
excluded for an embedded `api_key=`).

## Exact source-nonoverlap findings
- **B3 24-cluster**: 0 session / 0 message / 0 text (exact ID sets).
- **gh_mcp 20-case**: 0 session / 0 message / 0 text-digest (private holdout corpus).
- **v2 cohort**: 13 inherited by design (3 retained valuable + 10 controls); 7 new cases
  genuinely new (not in B3 / gh_mcp / v2).
- **H2–H4**: byte-level digest crosscheck **UNVERIFIED** (private corpus files not on host);
  family difference recorded but **not** substituted for proof.

## Ready-to-run command (host-only, NO inference yet)
Staging (already run, CPU-only):
`node docs/issue-91/adr-acceptance/issue92-a3-stage.mjs <roster> <manifest> /tmp/opencode/issue92-a3/state-v3`
→ `A3_SOURCE_STAGED_CPU_ONLY`, 26 native spans, frozen digests preserved.

Inference (gated, ready for Central approval):
`A3_HOST_APPROVED=1 python3 /tmp/opencode/issue92-a3/a3-host-ex-launcher.py`
— canonical EX bridge (`004188b1…`), Hermes-exempt, once-only marker
(`/tmp/opencode/issue92-a3/.a3-host-ran`), bounded positive reconcile, no replay, driver bound to
current verified head `4041256` (7 execution-source blobs verified). Negative EX preflight PASS
(marker-only `missing_lock_fd`).

Scorer (post-inference):
`node docs/issue-91/adr-acceptance/issue92-a3-score.mjs <roster> <staged> <state-v3> graphiti-adr92-a3-prospective-v2 <remote> <ratification> <adjudications> <authority>`
— 5 inputs READY (roster/staged/state-root/group/ratification), 3 post-inference templates
(remote readback, per-fact adjudications, authority audit). Exit 0 = measured PASS, 3 = measured
FAIL.

## Zero-inference / zero-Graphiti-write proof
- A3 group `graphiti-adr92-a3-prospective-v2`: **0 remote episodes**.
- No `.a3-host-ran` marker → no A3 inference executed.
- No `a3-host-result.json` → driver did not run.
- Staging is CPU-only (`native_fromPromptCandidates_full_input_privacy_checked`, 26 spans) → no
  Graphiti writes.

## Scorer acceptance of the new freeze
The Central fact-level scorer validates the v3 input contract (roster/staged/records/ratification)
and **requires independent post-inference judgments**: pre-inference it fails closed at
`insufficient_review_samples` (no fact adjudications) after the ratification check. No simulated
fact approvals or prospective outcomes are produced.

## Disposition
The corrected A3 prospective freeze is ready for Central approval: source-label mismatch resolved
(10 genuine source-stated valuable + 10 controls), digests frozen, exact nonoverlap established
(H2–H4 byte-level honestly marked UNVERIFIED), corrected staging + scorer integrated, host
execution prepared + gated, A3 group empty. Central can approve
`A3_HOST_APPROVED=1` to run the single A3 inference, then independently review the terminal
prospective scorecard — no further development/setup handoff. No PR/merge/activation/#92 close.
