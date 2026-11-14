# Part B — v4 failed-target source diagnosis (CPU-only, read-only)

v4 run @ source_head a564d39 (execution head 0a009e8), batch 01b37e0598e5a231e25649637cce4d6304e79cd024ad0af5ce4b824a31f41c6f.
v4 scorecard: valuable 7/10, grounded 8, independent useful 7, dup 1, authority 0. Missed = v4-04, v4-06, v4-10.

## Per-target findings (all three share the same loss signature)

### v4-04 FileFlows ABI — i92-v4-04-09f018f4 / msg_0b0aae86d0017HU8XsgOnYgkjr / ses_f4f7a1727ffeF1xKcI928mUBI2
- workspace /opt/containers/fileflows, predicate fileflows_2609_runtime_abi_established
- staged: 1 span (event 664f8cbac204…); excerpt = PURE <openviking-context> block (6 memory URIs:
  nvfp4_benchmark_closed, uri_superset_cross_check, deterministic_assessment_runner_redesign, profile x2,
  issue_261_orchestration_refactor). state = **skipped** (never a plan candidate item).
- withoutInjectedOpenVikingContext(excerpt) => "" (len 0). authored-only opportunity EMPTY.

### v4-06 ffdeps reference — i92-v4-06-5e95464c / msg_0b5459266001BDiIh2co26z2OI
- workspace /opt/containers, predicate ffdeps_reference_capability_not_byte_for_byte
- staged: 1 span (b9f8f979ac19…); excerpt = PURE <openviking-context> block (nvfp4_benchmark,
  deterministic_assessment_runner_redesign, uri_superset_cross_check, v5232_live_activation,
  issue_261_orchestration_refactor, trump_iran_news_audit). state = **skipped**.
- withoutInjectedOpenVikingContext(excerpt) => "" (len 0). authored-only EMPTY.

### v4-10 durable-segment sealing — i92-v4-10-8f7c9d7f / msg_10750e1130015IN1KU0SWPeRod
- workspace …/run/workspace, predicate durable_segment_seal_before_deferred_commit
- staged: 1 span (efc6683c17df…); excerpt = PURE <openviking-context> block (commit_gate_deployed,
  deterministic_assessment_runner_redesign, pr322_host_assessment_infra_stop, profile,
  generic_source_derived_preservation, uri_superset_cross_check). state = **skipped**.
- withoutInjectedOpenVikingContext(excerpt) => "" (len 0). authored-only EMPTY.

## First demonstrated loss stage (all three)
STAGING / span extraction (candidate availability) — NOT model discovery, NOT claim-support, NOT utility.
- The native user_turn carried the user's authored technical statement + an injected
  <openviking-context> retrieval block.
- The v4 span extractor (fromPromptCandidates, at head a564d39 — BEFORE the new
  withoutInjectedOpenVikingContext gating) captured ONLY the injected OpenViking block as the span.
- The user's authored statement was NOT captured as a span; the event was `skipped` and never
  promoted to a plan candidate item (plan.items has no entry for any of the 3 event_ids).
- Consequence: the model never received a genuine authored source span to ground the predicate.

## Authored vs retrieved (key determination) — REFINED after reading the private corpus
The private v4 corpus (`/home/filip/.local/state/ghdev-graphiti-issue92/private/issue92-a3-v4-corpus.json`,
sha256 eed37ce1… = roster digest) is authoritative. For ALL THREE targets the captured `native_event`
is ENTIRELY the `<openviking-context>` block — there is NO authored user text in the native event at all:
- v4-04 native_event = 682 chars, 100% OpenViking block (6 memory URIs: nvfp4_benchmark_closed,
  uri_superset_cross_check, deterministic_assessment_runner_redesign, profile x2, issue_261_orchestration_refactor).
- v4-06 native_event = 762 chars, 100% OpenViking block (nvfp4_benchmark, deterministic_assessment_runner,
  uri_superset, v5232_live_activation, issue_261, trump_iran_news_audit).
- v4-10 native_event = 720 chars, 100% OpenViking block (commit_gate_deployed,
  deterministic_assessment_runner, pr322_host_assessment_infra_stop, profile,
  generic_source_derived_preservation, uri_superset).
None of the blocks states the FileFlows-26.09-ABI / ffdeps / durable-segment predicate.

Therefore the loss is UPSTREAM of staging/salvage — at SOURCE CAPTURE / candidate-identity binding:
- The captured native event for each target is a context-only (OpenViking-echo) message, not the user's
  authored technical message. The authored statement (the real FileFlows 26.09 ABI / ffdeps /
  durable-segment claim) lives in a DIFFERENT native message/session that was not bound to the target case.
- The predicate IS a genuine user-authored technical fact: OpenViking confirms real FileFlows 26.09 work
  (26.09.3.8327, hevc_nvenc/Main10/p010le/p7, GPU+temp admission gates) — fileflows_three_flow_build,
  fileflows_three_canary_qualification, fileflows_retirement_phase_a, tdarr_blackwell_ffmpeg_integration.
- withoutInjectedOpenVikingContext(native_event) => "" (len 0) for all three (confirmed with the new capture
  function). There is no authored-only opportunity to recover — the authored text was never in the captured
  native event.
- The new --source-quote-salvage feature re-evaluates claim-support-rejected facts (missing_predicate /
  unsupported_inference / review_uncertain) that carry an evidence_span, independently judging the
  SOURCE-EXACT quote. For these three, the source quote IS the OpenViking block (no authored text), so
  salvage cannot recover a predicate that was never in the captured source. Loss is upstream of salvage.

## Implication for Part D (fresh cohort design)
Each valuable target case MUST be bound to the native event that actually contains the authored technical
statement — not a context-only (OpenViking-echo) message. A context-only native event yields an empty
authored-only opportunity and is unrecoverable by source-quote-salvage, regardless of the feature flags.

## v4 flags (no source-quote-salvage)
sourceRecovery=true resilientDiscovery=true claimEvidence=true sourceExactComplement=true
balancedDedup=true; sourceQuoteSalvage NOT set (feature added after v4).

## Method note
- Read-only: snapshot.json + candidate-events-v1 + plan.json + staged.json + scorecard.
- Private original-source manifest (digest eed37ce1…) is host-side 0600 and NOT in this state dir;
  original full native text not re-read. Diagnosis rests on the immutable staged span + scorecard +
  OpenViking authored-context confirmation. No v4 re-score; no historical record modified.
